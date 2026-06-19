import { existsSync, readFileSync } from "node:fs";
import { and, desc, eq, ilike, lt, or } from "drizzle-orm";

const OLD_FALLBACK =
  "Hmm, I'm having a bit of trouble processing that. Can you rephrase, or tell me a bit more about what you're stuck on?";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    process.env[key] = process.env[key] ?? value;
  }
}

async function main() {
  loadLocalEnv();

  const { db, conversations, messages, studentProfiles } = await import("../lib/db");
  const { withDbRetry } = await import("../lib/db/retry");
  const {
    buildBookRecommendationUnavailableResponse,
    buildDeterministicMentorResponse,
    classifyIntentHeuristic,
    isBookRecommendationRequest,
  } = await import("../lib/ai/deterministic-mentor");

  const stale = await withDbRetry(() =>
    db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        createdAt: messages.createdAt,
        userId: conversations.userId,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(messages.role, "assistant"),
          or(
            eq(messages.content, OLD_FALLBACK),
            ilike(messages.content, "%<tool_call%"),
            ilike(messages.content, "%searchPwBooks%"),
          ),
        ),
      ),
  );

  for (const row of stale) {
    const [previousUserMessage] = await withDbRetry(() =>
      db
        .select({ content: messages.content })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, row.conversationId),
            eq(messages.role, "user"),
            lt(messages.createdAt, row.createdAt),
          ),
        )
        .orderBy(desc(messages.createdAt))
        .limit(1),
    );

    const [profile] = await withDbRetry(() =>
      db.select().from(studentProfiles).where(eq(studentProfiles.userId, row.userId)).limit(1),
    );

    const userText = previousUserMessage?.content ?? "";
    const response = isBookRecommendationRequest(userText)
      ? {
          text: buildBookRecommendationUnavailableResponse(profile),
          label: "strategy" as const,
        }
      : buildDeterministicMentorResponse({
          message: userText,
          profile,
          intent: classifyIntentHeuristic(userText) ?? "strategy",
        });

    await withDbRetry(() =>
      db
        .update(messages)
        .set({
          content: response.text,
          intentLabel: response.label,
          model: "deterministic-repair",
          tokensIn: 0,
          tokensOut: 0,
        })
        .where(eq(messages.id, row.id)),
    );
  }

  console.log(`repaired_problem_messages=${stale.length}`);
}

main().catch((error) => {
  console.error("fallback repair failed", error);
  process.exit(1);
});

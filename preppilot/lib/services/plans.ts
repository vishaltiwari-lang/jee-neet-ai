import { db, savedPlans, messages } from "@/lib/db";
import { and, desc, eq } from "drizzle-orm";
import type { PlanCreateInput } from "@/lib/validation/schemas";
import { withDbRetry } from "@/lib/db/retry";

export async function listPlans(userId: string) {
  return withDbRetry(() =>
    db
      .select()
      .from(savedPlans)
      .where(eq(savedPlans.userId, userId))
      .orderBy(desc(savedPlans.createdAt)),
  );
}

export async function createPlan(userId: string, input: PlanCreateInput) {
  const sourceMessageId = input.source_message_id;
  if (sourceMessageId) {
    const [msg] = await withDbRetry(() =>
      db
        .select()
        .from(messages)
        .where(eq(messages.id, sourceMessageId))
        .limit(1),
    );
    if (!msg) throw new Error("source_message_not_found");
    if (msg.role !== "assistant") throw new Error("source_must_be_assistant");
  }
  const [row] = await withDbRetry(() =>
    db
      .insert(savedPlans)
      .values({
        userId,
        title: input.title,
        durationWeeks: input.duration_weeks ?? null,
        planMarkdown: input.plan_markdown,
        sourceMessageId: sourceMessageId ?? null,
      })
      .returning(),
  );
  return row;
}

export async function deletePlan(userId: string, planId: string) {
  const [row] = await withDbRetry(() =>
    db
      .select()
      .from(savedPlans)
      .where(and(eq(savedPlans.id, planId), eq(savedPlans.userId, userId)))
      .limit(1),
  );
  if (!row) return false;
  await withDbRetry(async () => {
    await db.delete(savedPlans).where(eq(savedPlans.id, planId));
  });
  return true;
}

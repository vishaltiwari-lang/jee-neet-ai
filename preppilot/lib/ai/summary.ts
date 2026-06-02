import { generateText } from "ai";
import { buildSummaryPrompt } from "./prompts";
import { getClassifierModel, openaiModel } from "./provider";
import { db, messages } from "@/lib/db";
import { eq } from "drizzle-orm";
import { updateRollingSummary } from "@/lib/services/conversations";

export async function regenerateSummary(conversationId: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
  if (rows.length === 0) return null;
  const text = rows
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 1000)}`)
    .join("\n\n");
  const model = getClassifierModel();
  try {
    const result = await generateText({
      model: openaiModel(model),
      prompt: buildSummaryPrompt(text),
      temperature: 0.2,
      maxOutputTokens: 500,
    });
    const summary = (result as { text?: string }).text ?? "";
    if (summary) {
      await updateRollingSummary(conversationId, summary);
      return summary;
    }
  } catch (err) {
    console.error("regenerateSummary error", err);
  }
  return null;
}

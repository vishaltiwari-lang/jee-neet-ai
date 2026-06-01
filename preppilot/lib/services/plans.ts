import { db, savedPlans, messages } from "@/lib/db";
import { and, desc, eq } from "drizzle-orm";
import type { PlanCreateInput } from "@/lib/validation/schemas";

export async function listPlans(userId: string) {
  return db
    .select()
    .from(savedPlans)
    .where(eq(savedPlans.userId, userId))
    .orderBy(desc(savedPlans.createdAt));
}

export async function createPlan(userId: string, input: PlanCreateInput) {
  if (input.source_message_id) {
    const [msg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, input.source_message_id))
      .limit(1);
    if (!msg) throw new Error("source_message_not_found");
    if (msg.role !== "assistant") throw new Error("source_must_be_assistant");
  }
  const [row] = await db
    .insert(savedPlans)
    .values({
      userId,
      title: input.title,
      durationWeeks: input.duration_weeks ?? null,
      planMarkdown: input.plan_markdown,
      sourceMessageId: input.source_message_id ?? null,
    })
    .returning();
  return row;
}

export async function deletePlan(userId: string, planId: string) {
  const [row] = await db
    .select()
    .from(savedPlans)
    .where(and(eq(savedPlans.id, planId), eq(savedPlans.userId, userId)))
    .limit(1);
  if (!row) return false;
  await db.delete(savedPlans).where(eq(savedPlans.id, planId));
  return true;
}

import { db, conversations, messages } from "@/lib/db";
import { and, desc, eq } from "drizzle-orm";
import { withDbRetry } from "@/lib/db/retry";

export async function listConversations(userId: string, limit = 50) {
  return withDbRetry(() =>
    db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit),
  );
}

export async function createConversation(userId: string, title = "New chat") {
  const [row] = await withDbRetry(() =>
    db
      .insert(conversations)
      .values({ userId, title })
      .returning(),
  );
  return row;
}

export async function getConversation(userId: string, conversationId: string) {
  const [row] = await withDbRetry(() =>
    db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1),
  );
  return row ?? null;
}

export async function listMessages(conversationId: string, limit = 200) {
  return withDbRetry(() =>
    db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(limit),
  );
}

export async function appendMessage(
  conversationId: string,
  data: Omit<typeof messages.$inferInsert, "conversationId" | "id" | "createdAt">,
) {
  const [row] = await withDbRetry(() =>
    db
      .insert(messages)
      .values({ ...data, conversationId })
      .returning(),
  );
  await withDbRetry(async () => {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  });
  return row;
}

export async function updateConversationTitle(conversationId: string, title: string) {
  await withDbRetry(async () => {
    await db.update(conversations).set({ title }).where(eq(conversations.id, conversationId));
  });
}

export async function updateRollingSummary(conversationId: string, summary: string) {
  await withDbRetry(async () => {
    await db.update(conversations).set({ rollingSummary: summary }).where(eq(conversations.id, conversationId));
  });
}

export async function countMessages(conversationId: string): Promise<number> {
  const rows = await withDbRetry(() =>
    db.select().from(messages).where(eq(messages.conversationId, conversationId)),
  );
  return rows.length;
}

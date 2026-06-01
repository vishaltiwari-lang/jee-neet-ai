import { db, usageLogs, refusalLogs, flaggedConversations } from "@/lib/db";

export async function logUsage(opts: {
  userId: string;
  route: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
}) {
  try {
    await db.insert(usageLogs).values({
      userId: opts.userId,
      route: opts.route,
      tokensIn: opts.tokensIn ?? 0,
      tokensOut: opts.tokensOut ?? 0,
      costUsd: String(opts.costUsd ?? 0),
    });
  } catch (e) {
    console.error("logUsage failed", e);
  }
}

export async function logRefusal(opts: {
  userId: string;
  messageExcerpt: string;
  reason: "classifier" | "guardrail";
}) {
  try {
    await db.insert(refusalLogs).values({
      userId: opts.userId,
      messageExcerpt: opts.messageExcerpt.slice(0, 200),
      reason: opts.reason,
    });
  } catch (e) {
    console.error("logRefusal failed", e);
  }
}

export async function flagConversation(opts: {
  conversationId: string;
  userId: string;
  reason: string;
}) {
  try {
    await db.insert(flaggedConversations).values(opts);
  } catch (e) {
    console.error("flagConversation failed", e);
  }
}

export { calculateCost } from "./logging/cost";

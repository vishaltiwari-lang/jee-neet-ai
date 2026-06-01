import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { orchestrate, buildStreamText } from "@/lib/ai/orchestrator";
import { checkChatLimits } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  id: z.string().optional(),
  conversation_id: z.string().uuid().optional(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["system", "user", "assistant"]),
        parts: z.array(z.unknown()),
      }),
    )
    .min(1),
});

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    return m.parts
      .filter((p) => (p as { type?: string }).type === "text")
      .map((p) => (p as { text: string }).text)
      .join("");
  }
  return "";
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const rl = await checkChatLimits(userId);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_seconds: rl.retryAfterSeconds },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const messages = parsed.data.messages as UIMessage[];
  const text = lastUserText(messages);
  if (!text.trim()) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  const result = await orchestrate({
    userId,
    conversationId: parsed.data.conversation_id,
    message: text,
    uiHistory: messages.slice(0, -1),
  });

  if (result.kind === "no_profile") {
    return NextResponse.json({ error: "onboarding_incomplete", conversation_id: result.conversationId }, { status: 412 });
  }

  if (result.kind === "deterministic") {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const id = `msg-${Date.now()}`;
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: result.text });
        writer.write({ type: "text-end", id });
      },
    });
    return createUIMessageStreamResponse({
      stream,
      headers: { "x-conversation-id": result.conversationId },
    });
  }

  const streamResult = buildStreamText({
    systemPrompt: result.systemPrompt,
    modelMessages: result.modelMessages,
    model: result.model,
    onFinish: result.onFinish,
  });

  return streamResult.toUIMessageStreamResponse({
    headers: { "x-conversation-id": result.conversationId },
  });
}

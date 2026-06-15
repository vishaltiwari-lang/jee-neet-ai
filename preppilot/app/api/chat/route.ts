import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { orchestrate, buildStreamText } from "@/lib/ai/orchestrator";
import { resolveSubmittedMessage } from "@/lib/ai/chat-request";
import { checkChatLimits } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  id: z.string().optional(),
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1).max(4000).optional(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["system", "user", "assistant"]),
        parts: z.array(z.unknown()),
      }),
    )
    .default([]),
});

export async function POST(req: Request) {
  try {
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
    const { message: text, uiHistory } = resolveSubmittedMessage({
      messages,
      explicitMessage: parsed.data.message,
    });
    if (!text.trim()) {
      return NextResponse.json({ error: "empty_message" }, { status: 400 });
    }

    const result = await orchestrate({
      userId,
      conversationId: parsed.data.conversation_id,
      message: text,
      uiHistory,
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
      models: result.models,
      onFinish: result.onFinish,
    });

    return streamResult.toUIMessageStreamResponse({
      headers: { "x-conversation-id": result.conversationId },
    });
  } catch (error) {
    console.error("chat route failed", error);
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const id = `msg-${Date.now()}`;
        writer.write({ type: "text-start", id });
        writer.write({
          type: "text-delta",
          id,
          delta:
            "I hit a temporary processing issue, but your chat is safe. Please retry once. If this keeps happening, switch to a new message with the same context and I will continue from there.",
        });
        writer.write({ type: "text-end", id });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
}

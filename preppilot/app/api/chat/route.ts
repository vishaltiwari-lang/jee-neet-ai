import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { orchestrate, generateAssistantText, FALLBACK_MESSAGE } from "@/lib/ai/orchestrator";
import { resolveSubmittedMessage } from "@/lib/ai/chat-request";
import { CHAT_REQUEST_HISTORY_LIMIT } from "@/lib/constants/chat";
import { checkChatLimits } from "@/lib/ratelimit";
import { summarizeAiError } from "@/lib/ai/provider-health";

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

function fallbackMessageStream(text = FALLBACK_MESSAGE, persist?: () => Promise<void>) {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const id = `msg-${Date.now()}`;
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
      await persist?.();
    },
  });

  return createUIMessageStreamResponse({ stream });
}

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

    const messages = (parsed.data.messages as UIMessage[]).slice(-CHAT_REQUEST_HISTORY_LIMIT);
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

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        let assistantText = result.fallbackText;
        let usage: { inputTokens?: number; outputTokens?: number } | undefined;
        let model = "deterministic-fallback";
        try {
          const generated = await generateAssistantText({
            systemPrompt: result.systemPrompt,
            modelMessages: result.modelMessages,
            models: result.models,
            onFinish: result.onFinish,
          });
          if (generated.text.trim()) {
            assistantText = generated.text;
            usage = generated.usage;
            model = generated.model;
          }
        } catch (error) {
          console.error("chat provider unavailable; using deterministic fallback", summarizeAiError(error));
        }

        const finalText = await result.onFinish(assistantText, usage, model);
        const id = `msg-${Date.now()}`;
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: finalText });
        writer.write({ type: "text-end", id });
      },
    });

    return createUIMessageStreamResponse({
      stream,
      headers: { "x-conversation-id": result.conversationId },
    });
  } catch (error) {
    console.error("chat route failed", error);
    return fallbackMessageStream();
  }
}

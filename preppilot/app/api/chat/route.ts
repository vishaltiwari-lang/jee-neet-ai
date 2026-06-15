import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { z } from "zod";
import { orchestrate, buildStreamText, FALLBACK_MESSAGE } from "@/lib/ai/orchestrator";
import { resolveSubmittedMessage } from "@/lib/ai/chat-request";
import { CHAT_REQUEST_HISTORY_LIMIT } from "@/lib/constants/chat";
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

    const streamResult = buildStreamText({
      systemPrompt: result.systemPrompt,
      modelMessages: result.modelMessages,
      models: result.models,
      onFinish: result.onFinish,
    });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const providerStream = streamResult.toUIMessageStream({
          onError: (error) => {
            console.error("chat provider stream failed", error);
            return FALLBACK_MESSAGE;
          },
        });
        const reader = providerStream.getReader();
        let activeTextId: string | null = null;
        let textEnded = false;
        let streamedText = "";

        const writeFallback = async () => {
          const fallbackText = streamedText
            ? `${streamedText}\n\n${FALLBACK_MESSAGE}`
            : FALLBACK_MESSAGE;

          if (activeTextId && !textEnded) {
            writer.write({ type: "text-delta", id: activeTextId, delta: `\n\n${FALLBACK_MESSAGE}` });
            writer.write({ type: "text-end", id: activeTextId });
          } else {
            const id = `msg-${Date.now()}`;
            writer.write({ type: "text-start", id });
            writer.write({ type: "text-delta", id, delta: FALLBACK_MESSAGE });
            writer.write({ type: "text-end", id });
          }

          await result.onFinish(fallbackText, { inputTokens: 0, outputTokens: 0 }, "fallback");
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (value.type === "error") {
              await writeFallback();
              return;
            }

            if (value.type === "text-start") {
              activeTextId = value.id;
              textEnded = false;
            } else if (value.type === "text-delta") {
              streamedText += value.delta;
            } else if (value.type === "text-end" && value.id === activeTextId) {
              textEnded = true;
            }

            writer.write(value as UIMessageChunk);
          }
        } catch (error) {
          console.error("chat stream relay failed", error);
          await writeFallback();
        }
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

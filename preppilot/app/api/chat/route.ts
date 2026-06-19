import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { z } from "zod";
import { orchestrate, streamAssistantText, FALLBACK_MESSAGE } from "@/lib/ai/orchestrator";
import { resolveSubmittedMessage } from "@/lib/ai/chat-request";
import { CHAT_REQUEST_HISTORY_LIMIT } from "@/lib/constants/chat";
import { checkChatLimits } from "@/lib/ratelimit";
import { aiProviderCircuitOpen, noteAiProviderFailure, summarizeAiError } from "@/lib/ai/provider-health";
import { containsRawToolCall } from "@/lib/ai/guardrails";

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

const STREAM_GUARD_HOLD_CHARS = 240;

class RawToolCallLeakError extends Error {
  constructor() {
    super("raw_tool_call_leak");
  }
}

function isRawToolCallLeakError(error: unknown): boolean {
  return error instanceof RawToolCallLeakError || (error instanceof Error && error.message === "raw_tool_call_leak");
}

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

function writeTextMessage(writer: Parameters<Parameters<typeof createUIMessageStream>[0]["execute"]>[0]["writer"], text: string) {
  const id = `msg-${Date.now()}`;
  writer.write({ type: "text-start", id });
  writer.write({ type: "text-delta", id, delta: text });
  writer.write({ type: "text-end", id });
}

function isVisibleStreamChunk(chunk: UIMessageChunk): boolean {
  return (
    chunk.type === "text-delta" ||
    chunk.type === "reasoning-delta" ||
    chunk.type.startsWith("tool-") ||
    chunk.type.startsWith("source-") ||
    chunk.type === "file" ||
    chunk.type.startsWith("data-")
  );
}

function chunkError(chunk: UIMessageChunk, providerError: unknown): unknown {
  return providerError ?? new Error(chunk.type === "error" ? chunk.errorText : "AI stream failed");
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
        let deliveredProviderText = false;

        for (const modelName of result.models) {
          let providerError: unknown;
          let streamedText = "";
          let activeTextId: string | null = null;
          let flushed = false;
          const bufferedChunks: UIMessageChunk[] = [];

          try {
            const streamResult = streamAssistantText({
              systemPrompt: result.systemPrompt,
              modelMessages: result.modelMessages,
              model: modelName,
            });

            const providerStream = streamResult.toUIMessageStream({
              onError: (error) => {
                providerError = error;
                return "";
              },
            });

            const flushBuffered = () => {
              if (flushed) return;
              for (const chunk of bufferedChunks) {
                writer.write(chunk);
              }
              bufferedChunks.length = 0;
              flushed = true;
            };

            for await (const chunk of providerStream) {
              if (chunk.type === "error") {
                throw chunkError(chunk, providerError);
              }

              if (chunk.type === "text-start") {
                activeTextId = chunk.id;
              } else if (chunk.type === "text-delta") {
                streamedText += chunk.delta;
                if (containsRawToolCall(streamedText)) {
                  throw new RawToolCallLeakError();
                }
              } else if (chunk.type === "text-end" && chunk.id === activeTextId) {
                activeTextId = null;
              }

              const shouldHoldForGuard =
                chunk.type === "text-delta" && streamedText.length < STREAM_GUARD_HOLD_CHARS;

              if (!flushed && (!isVisibleStreamChunk(chunk) || shouldHoldForGuard)) {
                bufferedChunks.push(chunk);
                continue;
              }

              flushBuffered();
              writer.write(chunk);
            }

            if (!streamedText.trim()) {
              continue;
            }
            flushBuffered();

            let usage: { inputTokens?: number; outputTokens?: number } | undefined;
            try {
              usage = await streamResult.totalUsage;
            } catch {
              usage = undefined;
            }
            await result.onFinish(streamedText, usage, modelName);
            deliveredProviderText = true;
            return;
          } catch (error) {
            if (isRawToolCallLeakError(error)) {
              console.error(`chat stream blocked raw tool-call output for model ${modelName}`);
              const finalText = await result.onFinish(streamedText, undefined, `${modelName}:guarded`);
              if (flushed && activeTextId) {
                writer.write({ type: "text-delta", id: activeTextId, delta: `\n\n${finalText}` });
                writer.write({ type: "text-end", id: activeTextId });
              } else {
                writeTextMessage(writer, finalText);
              }
              deliveredProviderText = true;
              return;
            }

            const summary = noteAiProviderFailure(error);
            console.error(`chat stream failed for model ${modelName}`, summary);

            if (flushed && streamedText.trim()) {
              const interruption =
                "\n\nPrepPilot had to stop this response early because the AI provider disconnected. Try again if you need the rest.";
              if (activeTextId) {
                writer.write({ type: "text-delta", id: activeTextId, delta: interruption });
                writer.write({ type: "text-end", id: activeTextId });
              } else {
                writeTextMessage(writer, interruption.trim());
              }
              await result.onFinish(`${streamedText}${interruption}`, undefined, `${modelName}:partial`);
              deliveredProviderText = true;
              return;
            }

            if (aiProviderCircuitOpen()) break;
          }
        }

        if (!deliveredProviderText) {
          console.error(
            "chat provider unavailable; using deterministic fallback",
            summarizeAiError(new Error("No chat model streamed text")),
          );
          const finalText = await result.onFinish(result.fallbackText, undefined, "deterministic-fallback");
          writeTextMessage(writer, finalText);
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

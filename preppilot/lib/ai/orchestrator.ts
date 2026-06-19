import { streamText, stepCountIs, type UIMessage, convertToModelMessages } from "ai";
import { searchPwBooks, pwBooksSearchAvailable } from "./tools/pw-books";
import { buildSystemPrompt } from "./prompts";
import { classifyIntent } from "./classifier";
import { validateOutput } from "./guardrails";
import { detectSelfHarm } from "./safety";
import { REFUSAL_MESSAGE, OUT_OF_SCOPE_MESSAGE, HELPLINE_MESSAGE, FALLBACK_MESSAGE } from "./refusal";
import { getChatModelChain, openaiModel } from "./provider";
import {
  buildBookRecommendationUnavailableResponse,
  buildDeterministicMentorResponse,
  isBookRecommendationRequest,
} from "./deterministic-mentor";
import {
  aiProviderCircuitOpen,
  getAiProviderCircuitReason,
  noteAiProviderFailure,
} from "./provider-health";
import {
  assessSyllabusCoverage,
  buildOutOfSyllabusMessage,
  buildSyllabusResponse,
} from "@/lib/knowledge/syllabus";
import { getProfile } from "@/lib/services/profile";
import {
  appendMessage,
  createConversation,
  getConversation,
  countMessages,
  updateConversationTitle,
} from "@/lib/services/conversations";
import { logRefusal, logUsage, flagConversation, calculateCost } from "@/lib/logging";
import { regenerateSummary } from "./summary";
import type { IntentLabel } from "@/lib/db/schema";

export type OrchestratorInput = {
  userId: string;
  conversationId?: string;
  message: string;
  uiHistory?: UIMessage[];
};

export type OrchestratorResult =
  | {
      kind: "deterministic";
      conversationId: string;
      text: string;
      label: IntentLabel | "self_harm";
      flagged?: boolean;
    }
  | {
      kind: "stream";
      conversationId: string;
      systemPrompt: string;
      modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>;
      models: string[];
      fallbackText: string;
      fallbackLabel: IntentLabel;
      onFinish: (
        text: string,
        usage?: { inputTokens?: number; outputTokens?: number },
        usedModel?: string,
      ) => Promise<string>;
    }
  | {
      kind: "no_profile";
      conversationId: string;
    };

function uiMessagesToTexts(history: UIMessage[]): string {
  return history
    .map((m) => {
      const text = m.parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { text: string }).text)
        .join("");
      return `${m.role.toUpperCase()}: ${text}`;
    })
    .join("\n\n");
}

async function safeAppendMessage(
  conversationId: string,
  data: Parameters<typeof appendMessage>[1],
): Promise<void> {
  try {
    await appendMessage(conversationId, data);
  } catch (error) {
    console.error("message persistence failed", error);
  }
}

export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { userId, message } = input;

  let conversationId = input.conversationId;
  let rollingSummary: string | null = null;
  if (conversationId) {
    const existing = await getConversation(userId, conversationId);
    if (!existing) {
      const conv = await createConversation(userId, message.slice(0, 60));
      conversationId = conv.id;
    } else {
      rollingSummary = existing.rollingSummary;
    }
  } else {
    const conv = await createConversation(userId, message.slice(0, 60));
    conversationId = conv.id;
  }

  const profile = await getProfile(userId);
  if (!profile || !profile.onboardingComplete) {
    return { kind: "no_profile", conversationId };
  }

  await safeAppendMessage(conversationId, { role: "user", content: message });

  const isSelfHarm = detectSelfHarm(message);
  if (isSelfHarm) {
    await flagConversation({ conversationId, userId, reason: "self_harm_keyword" });
  }

  const syllabusResponse = buildSyllabusResponse(message, {
    class: profile.class,
    targetExam: profile.targetExam,
  });
  if (syllabusResponse) {
    const text = isSelfHarm
      ? `${HELPLINE_MESSAGE}\n\n---\n\n${syllabusResponse}`
      : syllabusResponse;
    await safeAppendMessage(conversationId, {
      role: "assistant",
      content: text,
      intentLabel: "strategy",
      model: "deterministic",
    });
    return { kind: "deterministic", conversationId, text, label: "strategy", flagged: isSelfHarm };
  }

  const intent = await classifyIntent(message);
  const bookSearchAvailable = pwBooksSearchAvailable();

  if (intent === "academic_solve") {
    const text = isSelfHarm ? `${HELPLINE_MESSAGE}\n\n---\n\n${REFUSAL_MESSAGE}` : REFUSAL_MESSAGE;
    await safeAppendMessage(conversationId, {
      role: "assistant",
      content: text,
      intentLabel: "academic_solve",
      refused: true,
      model: "deterministic",
    });
    await logRefusal({ userId, messageExcerpt: message, reason: "classifier" });
    return { kind: "deterministic", conversationId, text, label: "academic_solve", flagged: isSelfHarm };
  }

  if (intent === "out_of_scope") {
    const text = isSelfHarm ? `${HELPLINE_MESSAGE}\n\n---\n\n${OUT_OF_SCOPE_MESSAGE}` : OUT_OF_SCOPE_MESSAGE;
    await safeAppendMessage(conversationId, {
      role: "assistant",
      content: text,
      intentLabel: "out_of_scope",
      model: "deterministic",
    });
    return { kind: "deterministic", conversationId, text, label: "out_of_scope", flagged: isSelfHarm };
  }

  if (isBookRecommendationRequest(message) && !bookSearchAvailable) {
    const baseText = buildBookRecommendationUnavailableResponse(profile);
    const text = isSelfHarm ? `${HELPLINE_MESSAGE}\n\n---\n\n${baseText}` : baseText;
    await safeAppendMessage(conversationId, {
      role: "assistant",
      content: text,
      intentLabel: "strategy",
      model: "deterministic",
    });
    return { kind: "deterministic", conversationId, text, label: "strategy", flagged: isSelfHarm };
  }

  if (intent === "plan_request" || intent === "strategy") {
    const coverage = assessSyllabusCoverage(message, {
      class: profile.class,
      targetExam: profile.targetExam,
    });
    if (coverage.status === "out_of_syllabus") {
      const text = buildOutOfSyllabusMessage({
        class: profile.class,
        targetExam: profile.targetExam,
      });
      await safeAppendMessage(conversationId, {
        role: "assistant",
        content: text,
        intentLabel: "out_of_scope",
        model: "deterministic",
      });
      return { kind: "deterministic", conversationId, text, label: "out_of_scope", flagged: isSelfHarm };
    }
  }

  // Real LLM path
  const systemPrompt = buildSystemPrompt(profile, rollingSummary ?? undefined, {
    pwBookSearchAvailable: bookSearchAvailable,
  });
  const fullSystem = isSelfHarm
    ? `${systemPrompt}\n\nIMPORTANT CONTEXT: This student's message contained language suggesting distress or self-harm. Lead with empathy. Encourage them to reach out to iCall (9152987821). Be warm and brief — no lecturing.`
    : systemPrompt;

  const history = input.uiHistory ?? [];
  // Keep last 10 messages from UI history + this new user message
  const recent = history.slice(-10);
  const finalUiHistory: UIMessage[] = [
    ...recent,
    {
      id: `temp-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text: message }],
    },
  ];

  const modelMessages = await convertToModelMessages(finalUiHistory);
  const modelChain = getChatModelChain();
  const deterministicFallback = buildDeterministicMentorResponse({
    message,
    profile,
    intent,
    isSelfHarm,
  });

  const orchConversationId = conversationId;
  const onFinish = async (
    text: string,
    usage?: { inputTokens?: number; outputTokens?: number },
    usedModel?: string,
  ): Promise<string> => {
    const selectedModel = usedModel || modelChain[0];
    const guard = validateOutput(text);
    let finalText = text;
    let refused = false;
    let label: IntentLabel = intent;
    if (!guard.ok) {
      if (guard.reason === "raw_tool_call") {
        finalText = isBookRecommendationRequest(message)
          ? buildBookRecommendationUnavailableResponse(profile)
          : deterministicFallback.text;
        refused = false;
        label = isBookRecommendationRequest(message) ? "strategy" : deterministicFallback.label;
      } else {
        finalText = REFUSAL_MESSAGE;
        refused = true;
        label = "academic_solve";
        await logRefusal({
          userId,
          messageExcerpt: `[guardrail] ${message}`,
          reason: "guardrail",
        });
      }
    }

    const tokensIn = usage?.inputTokens ?? 0;
    const tokensOut = usage?.outputTokens ?? 0;

    await safeAppendMessage(orchConversationId, {
      role: "assistant",
      content: finalText,
      intentLabel: label,
      tokensIn,
      tokensOut,
      model: selectedModel,
      refused,
    });

    await logUsage({
      userId,
      route: "/api/chat",
      tokensIn,
      tokensOut,
      costUsd: calculateCost(selectedModel, tokensIn, tokensOut),
    });

    try {
      const total = await countMessages(orchConversationId);
      if (total > 0 && total % 20 === 0) {
        regenerateSummary(orchConversationId).catch((e) => console.error("summary regen failed", e));
      }

      if (total === 2) {
        // First exchange — set a nicer title
        await updateConversationTitle(orchConversationId, message.slice(0, 60));
      }
    } catch (error) {
      console.error("post-chat bookkeeping failed", error);
    }

    return finalText;
  };

  return {
    kind: "stream",
    conversationId,
    systemPrompt: fullSystem,
    modelMessages,
    models: modelChain,
    fallbackText: deterministicFallback.text,
    fallbackLabel: deterministicFallback.label,
    onFinish,
  };
}

function getChatTimeoutMs(): number {
  const parsed = Number(process.env.OPENAI_CHAT_TIMEOUT_MS ?? 20_000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20_000;
}

export function streamAssistantText(args: {
  systemPrompt: string;
  modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>;
  model: string;
}) {
  if (aiProviderCircuitOpen()) {
    throw new Error(`AI provider circuit is open: ${getAiProviderCircuitReason()}`);
  }

  // Expose the Physics Wallah book-search tool only when it's configured.
  // This turns the chat model into an agent: it decides when to call the tool
  // (restricted to book recommendations by the tool description + system
  // prompt) and we loop up to `stepCountIs(N)` so it can read results and
  // answer in the same turn.
  const tools = pwBooksSearchAvailable() ? { searchPwBooks } : undefined;

  try {
    return streamText({
      model: openaiModel(args.model),
      system: args.systemPrompt,
      messages: args.modelMessages,
      temperature: 0.6,
      maxOutputTokens: 1500,
      maxRetries: 0,
      timeout: getChatTimeoutMs(),
      ...(tools ? { tools, stopWhen: stepCountIs(5) } : {}),
    });
  } catch (err) {
    console.error(`streamText setup failed for model ${args.model}`, noteAiProviderFailure(err));
    throw err;
  }
}

export { FALLBACK_MESSAGE };
export { uiMessagesToTexts };

import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { buildSystemPrompt } from "./prompts";
import { classifyIntent } from "./classifier";
import { validateOutput } from "./guardrails";
import { detectSelfHarm } from "./safety";
import { REFUSAL_MESSAGE, OUT_OF_SCOPE_MESSAGE, HELPLINE_MESSAGE, FALLBACK_MESSAGE } from "./refusal";
import { openaiModel } from "./provider";
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
      model: string;
      onFinish: (text: string, usage?: { inputTokens?: number; outputTokens?: number }) => Promise<void>;
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

  await appendMessage(conversationId, { role: "user", content: message });

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
    await appendMessage(conversationId, {
      role: "assistant",
      content: text,
      intentLabel: "strategy",
      model: "deterministic",
    });
    return { kind: "deterministic", conversationId, text, label: "strategy", flagged: isSelfHarm };
  }

  const intent = await classifyIntent(message);

  if (intent === "academic_solve") {
    const text = isSelfHarm ? `${HELPLINE_MESSAGE}\n\n---\n\n${REFUSAL_MESSAGE}` : REFUSAL_MESSAGE;
    await appendMessage(conversationId, {
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
    await appendMessage(conversationId, {
      role: "assistant",
      content: text,
      intentLabel: "out_of_scope",
      model: "deterministic",
    });
    return { kind: "deterministic", conversationId, text, label: "out_of_scope", flagged: isSelfHarm };
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
      await appendMessage(conversationId, {
        role: "assistant",
        content: text,
        intentLabel: "out_of_scope",
        model: "deterministic",
      });
      return { kind: "deterministic", conversationId, text, label: "out_of_scope", flagged: isSelfHarm };
    }
  }

  // Real LLM path
  const systemPrompt = buildSystemPrompt(profile, rollingSummary ?? undefined);
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
  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

  const orchConversationId = conversationId;
  const onFinish = async (text: string, usage?: { inputTokens?: number; outputTokens?: number }) => {
    const guard = validateOutput(text);
    let finalText = text;
    let refused = false;
    let label: IntentLabel = intent;
    if (!guard.ok) {
      finalText = REFUSAL_MESSAGE;
      refused = true;
      label = "academic_solve";
      await logRefusal({
        userId,
        messageExcerpt: `[guardrail] ${message}`,
        reason: "guardrail",
      });
    }

    const tokensIn = usage?.inputTokens ?? 0;
    const tokensOut = usage?.outputTokens ?? 0;
    await appendMessage(orchConversationId, {
      role: "assistant",
      content: finalText,
      intentLabel: label,
      tokensIn,
      tokensOut,
      model,
      refused,
    });

    await logUsage({
      userId,
      route: "/api/chat",
      tokensIn,
      tokensOut,
      costUsd: calculateCost(model, tokensIn, tokensOut),
    });

    const total = await countMessages(orchConversationId);
    if (total > 0 && total % 20 === 0) {
      regenerateSummary(orchConversationId).catch((e) => console.error("summary regen failed", e));
    }

    if (total === 2) {
      // First exchange — set a nicer title
      await updateConversationTitle(orchConversationId, message.slice(0, 60));
    }
  };

  return {
    kind: "stream",
    conversationId,
    systemPrompt: fullSystem,
    modelMessages,
    model,
    onFinish,
  };
}

export function buildStreamText(args: {
  systemPrompt: string;
  modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>;
  model: string;
  onFinish: (text: string, usage?: { inputTokens?: number; outputTokens?: number }) => Promise<void>;
}) {
  return streamText({
    model: openaiModel(args.model),
    system: args.systemPrompt,
    messages: args.modelMessages,
    temperature: 0.6,
    maxOutputTokens: 1500,
    onFinish: async (event) => {
      try {
        const text = (event as { text?: string }).text ?? "";
        const usage = (event as { usage?: { inputTokens?: number; outputTokens?: number } }).usage;
        await args.onFinish(text, usage);
      } catch (err) {
        console.error("onFinish error", err);
      }
    },
  });
}

export { FALLBACK_MESSAGE };
export { uiMessagesToTexts };

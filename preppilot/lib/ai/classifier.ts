import { generateText } from "ai";
import { buildClassifierPrompt } from "./prompts";
import { stripInjectionPreamble } from "./safety";
import { getClassifierModel, openaiModel } from "./provider";
import type { IntentLabel } from "@/lib/db/schema";

const VALID_LABELS: readonly IntentLabel[] = [
  "academic_solve",
  "plan_request",
  "strategy",
  "motivation",
  "clarification",
  "out_of_scope",
] as const;

function normalize(s: string): IntentLabel | null {
  const cleaned = s.trim().toLowerCase().replace(/[^a-z_]/g, "");
  if ((VALID_LABELS as readonly string[]).includes(cleaned)) {
    return cleaned as IntentLabel;
  }
  return null;
}

export async function classifyIntent(message: string): Promise<IntentLabel> {
  const safe = stripInjectionPreamble(message);
  const model = getClassifierModel();
  try {
    const result = await generateText({
      model: openaiModel(model),
      prompt: buildClassifierPrompt(safe),
      temperature: 0,
      maxOutputTokens: 8,
    });
    const text = (result as { text?: string }).text ?? "";
    const label = normalize(text);
    if (label) return label;
    return "strategy";
  } catch (err) {
    console.error("classifyIntent error", err);
    return "strategy";
  }
}

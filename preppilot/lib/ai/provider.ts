import { createOpenAI } from "@ai-sdk/openai";

const baseURL = process.env.OPENAI_BASE_URL?.trim();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const appName = process.env.OPENAI_APP_NAME?.trim() || "PrepPilot";
const DEFAULT_CHAT_MODEL = "anthropic/claude-sonnet-4.6";
const DEFAULT_CHAT_FALLBACK_MODELS = ["openai/gpt-5-mini", "openai/gpt-4.1-mini"];
const DEFAULT_CLASSIFIER_MODEL = "openai/gpt-4.1-mini";
const useChatCompletions = isOpenRouterBaseUrl(baseURL);

const headers: Record<string, string> = {};
if (appUrl) headers["HTTP-Referer"] = appUrl;
if (appName) headers["X-Title"] = appName;

const provider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY?.trim(),
  baseURL: baseURL || undefined,
  name: useChatCompletions ? "openrouter" : undefined,
  headers: Object.keys(headers).length > 0 ? headers : undefined,
});

export function openaiModel(model: string) {
  return useChatCompletions ? provider.chat(model) : provider(model);
}

function parseCsvList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getChatModelChain(): string[] {
  const primary = process.env.OPENAI_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL;
  const fallbackFromEnv = parseCsvList(process.env.OPENAI_CHAT_FALLBACK_MODELS);
  const fallback = fallbackFromEnv.length > 0 ? fallbackFromEnv : DEFAULT_CHAT_FALLBACK_MODELS;
  return Array.from(new Set([primary, ...fallback]));
}

export function getClassifierModel(): string {
  return process.env.OPENAI_CLASSIFIER_MODEL?.trim() || DEFAULT_CLASSIFIER_MODEL;
}

export function isOpenRouterBaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === "openrouter.ai";
  } catch {
    return false;
  }
}

import { createOpenAI } from "@ai-sdk/openai";

const baseURL = process.env.OPENAI_BASE_URL?.trim();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const appName = process.env.OPENAI_APP_NAME?.trim() || "PrepPilot";

const headers: Record<string, string> = {};
if (appUrl) headers["HTTP-Referer"] = appUrl;
if (appName) headers["X-Title"] = appName;

const provider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY?.trim(),
  baseURL: baseURL || undefined,
  headers: Object.keys(headers).length > 0 ? headers : undefined,
});

export function openaiModel(model: string) {
  return provider(model);
}

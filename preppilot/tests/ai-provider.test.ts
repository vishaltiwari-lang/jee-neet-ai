import { describe, expect, it } from "vitest";
import { isOpenRouterBaseUrl } from "@/lib/ai/provider";

describe("isOpenRouterBaseUrl", () => {
  it("detects OpenRouter API URLs", () => {
    expect(isOpenRouterBaseUrl("https://openrouter.ai/api/v1")).toBe(true);
  });

  it("does not match unrelated OpenAI-compatible URLs", () => {
    expect(isOpenRouterBaseUrl("https://api.openai.com/v1")).toBe(false);
    expect(isOpenRouterBaseUrl(undefined)).toBe(false);
  });
});

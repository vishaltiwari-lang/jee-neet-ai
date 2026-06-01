import { describe, expect, it } from "vitest";
import {
  CLASS_11_PROMPTS, CLASS_12_PROMPTS, DROPPER_PROMPTS,
  getPromptsForClass, getRandomPrompts,
} from "@/lib/constants/suggestedPrompts";

describe("Suggested prompts", () => {
  it("has expected counts", () => {
    expect(CLASS_11_PROMPTS.length).toBe(18);
    expect(CLASS_12_PROMPTS.length).toBe(15);
    expect(DROPPER_PROMPTS.length).toBe(18);
  });

  it("getPromptsForClass returns the right list", () => {
    expect(getPromptsForClass("class_11")).toBe(CLASS_11_PROMPTS);
    expect(getPromptsForClass("class_12")).toBe(CLASS_12_PROMPTS);
    expect(getPromptsForClass("dropper")).toBe(DROPPER_PROMPTS);
  });

  it("getRandomPrompts returns unique items within request", () => {
    const r = getRandomPrompts("class_11", 5);
    expect(r.length).toBe(5);
    expect(new Set(r).size).toBe(5);
  });

  it("all prompts are non-empty strings", () => {
    for (const list of [CLASS_11_PROMPTS, CLASS_12_PROMPTS, DROPPER_PROMPTS]) {
      for (const q of list) {
        expect(typeof q).toBe("string");
        expect(q.length).toBeGreaterThan(10);
      }
    }
  });
});

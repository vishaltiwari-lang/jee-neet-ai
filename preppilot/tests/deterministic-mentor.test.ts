import { describe, expect, it } from "vitest";
import {
  buildBookRecommendationUnavailableResponse,
  buildDeterministicMentorResponse,
  classifyIntentHeuristic,
  isBookRecommendationRequest,
} from "@/lib/ai/deterministic-mentor";
import { FALLBACK_MESSAGE } from "@/lib/ai/refusal";
import type { StudentProfile } from "@/lib/services/profile";

const profile = {
  userId: "user_test",
  class: "class_11",
  targetExam: ["jee_main", "jee_advanced"],
  targetYear: 2027,
  coaching: { enrolled: true, name: "Test" },
  strongSubjects: ["math"],
  weakSubjects: ["physics"],
  mockScoreRange: "100-150",
  dailyStudyHours: 6,
  schoolLoad: "medium",
  previousAttemptScore: null,
  previousMistakes: null,
  emotionalState: null,
  goals: null,
  onboardingComplete: true,
  updatedAt: new Date("2026-06-18T00:00:00Z"),
} satisfies StudentProfile;

describe("classifyIntentHeuristic", () => {
  it("refuses direct academic solve requests without an LLM", () => {
    expect(classifyIntentHeuristic("Calculate the pH of 0.01 M HCl.")).toBe("academic_solve");
  });

  it("keeps general solving improvement as strategy", () => {
    expect(classifyIntentHeuristic("How do I solve advanced JEE questions on my own?")).toBe(
      "strategy",
    );
  });

  it("classifies school plus JEE management as strategy", () => {
    expect(
      classifyIntentHeuristic(
        "How do I manage school exams along with JEE preparation without affecting either one?",
      ),
    ).toBe("strategy");
  });

  it("detects book recommendation requests", () => {
    expect(isBookRecommendationRequest("idk which book to follow for rotational motion")).toBe(true);
    expect(isBookRecommendationRequest("recommend a physics module for JEE")).toBe(true);
  });
});

describe("buildDeterministicMentorResponse", () => {
  it("returns a useful local mentor response instead of the generic fallback", () => {
    const result = buildDeterministicMentorResponse({
      message: "How do I manage school exams along with JEE preparation without affecting either one?",
      profile,
      intent: "strategy",
    });

    expect(result.text).toContain("two-track week");
    expect(result.text).toContain("Class 11");
    expect(result.text).not.toBe(FALLBACK_MESSAGE);
    expect(result.label).toBe("strategy");
  });

  it("returns a clean response when live PW book lookup is unavailable", () => {
    const text = buildBookRecommendationUnavailableResponse(profile);

    expect(text).toContain("cannot fetch live Physics Wallah publication listings");
    expect(text).toContain("practice ladder");
    expect(text).toContain("official PW store");
    expect(text).not.toContain("<tool_call>");
    expect(text).not.toContain("searchPwBooks");
  });
});

import { describe, expect, it } from "vitest";
import { OnboardingSchema, ChatRequestSchema, PlanCreateSchema, ProfileUpdateSchema } from "@/lib/validation/schemas";

const validClass11 = {
  class: "class_11",
  target_exam: ["jee_main", "jee_advanced"],
  target_year: 2028,
  coaching: { enrolled: true, name: "Allen" },
  strong_subjects: ["math"],
  weak_subjects: ["chemistry"],
  mock_score_range: "100–150",
  daily_study_hours: 6,
  school_load: "medium",
};

const validDropper = {
  class: "dropper",
  target_exam: ["jee_main"],
  target_year: 2027,
  coaching: { enrolled: false },
  strong_subjects: ["physics"],
  weak_subjects: ["chemistry", "math"],
  mock_score_range: "150–200",
  daily_study_hours: 10,
  previous_attempt_score: 140,
  previous_mistakes: "Bad time management",
};

describe("OnboardingSchema", () => {
  it("accepts class 11 with school_load", () => {
    expect(OnboardingSchema.safeParse(validClass11).success).toBe(true);
  });

  it("accepts dropper without school_load", () => {
    expect(OnboardingSchema.safeParse(validDropper).success).toBe(true);
  });

  it("rejects class 11 without school_load", () => {
    const { school_load, ...rest } = validClass11;
    void school_load;
    const r = OnboardingSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it("rejects overlapping strong+weak subjects", () => {
    const r = OnboardingSchema.safeParse({
      ...validClass11,
      strong_subjects: ["math", "physics"],
      weak_subjects: ["physics"],
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty target_exam", () => {
    expect(OnboardingSchema.safeParse({ ...validClass11, target_exam: [] }).success).toBe(false);
  });

  it("rejects daily_study_hours out of range", () => {
    expect(OnboardingSchema.safeParse({ ...validClass11, daily_study_hours: 0 }).success).toBe(false);
    expect(OnboardingSchema.safeParse({ ...validClass11, daily_study_hours: 20 }).success).toBe(false);
  });
});

describe("ChatRequestSchema", () => {
  it("accepts message", () => {
    expect(ChatRequestSchema.safeParse({ message: "hi" }).success).toBe(true);
  });
  it("rejects empty", () => {
    expect(ChatRequestSchema.safeParse({ message: "" }).success).toBe(false);
  });
  it("rejects too long", () => {
    expect(ChatRequestSchema.safeParse({ message: "x".repeat(5000) }).success).toBe(false);
  });
});

describe("PlanCreateSchema", () => {
  it("accepts plan", () => {
    expect(PlanCreateSchema.safeParse({ title: "Plan", plan_markdown: "## Week 1" }).success).toBe(true);
  });
  it("rejects missing title", () => {
    expect(PlanCreateSchema.safeParse({ plan_markdown: "..." }).success).toBe(false);
  });
});

describe("ProfileUpdateSchema", () => {
  it("accepts partial", () => {
    expect(ProfileUpdateSchema.safeParse({ daily_study_hours: 8 }).success).toBe(true);
  });
  it("accepts empty", () => {
    expect(ProfileUpdateSchema.safeParse({}).success).toBe(true);
  });
});

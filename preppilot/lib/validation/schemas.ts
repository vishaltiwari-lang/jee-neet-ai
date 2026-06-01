import { z } from "zod";

export const StudentClassSchema = z.enum(["class_11", "class_12", "dropper"]);
export const TargetExamSchema = z.enum(["jee_main", "jee_advanced", "neet"]);
export const SubjectSchema = z.enum(["physics", "chemistry", "math", "biology"]);
export const SchoolLoadSchema = z.enum(["light", "medium", "heavy"]);
export const IntentLabelSchema = z.enum([
  "academic_solve",
  "plan_request",
  "strategy",
  "motivation",
  "clarification",
  "out_of_scope",
]);

const OnboardingBaseSchema = z.object({
  class: StudentClassSchema,
  target_exam: z.array(TargetExamSchema).min(1).max(3),
  target_year: z.number().int().min(2024).max(2035),
  coaching: z.object({
    enrolled: z.boolean(),
    name: z.string().max(100).optional(),
  }),
  strong_subjects: z.array(SubjectSchema).max(4),
  weak_subjects: z.array(SubjectSchema).max(4),
  mock_score_range: z.string().min(1).max(20),
  daily_study_hours: z.number().int().min(1).max(16),
  school_load: SchoolLoadSchema.optional(),
  previous_attempt_score: z.number().int().min(0).max(360).optional(),
  previous_mistakes: z.string().max(2000).optional(),
  emotional_state: z.string().max(500).optional(),
  goals: z.string().max(1000).optional(),
});

export const OnboardingSchema = OnboardingBaseSchema
  .refine(
    (data) => {
      const overlap = data.strong_subjects.filter((s) => data.weak_subjects.includes(s));
      return overlap.length === 0;
    },
    { message: "A subject can't be both strong and weak", path: ["weak_subjects"] },
  )
  .refine(
    (data) => {
      if (data.class === "dropper") return true;
      return data.school_load !== undefined;
    },
    { message: "school_load required for class 11/12", path: ["school_load"] },
  );

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

export const ProfileUpdateSchema = OnboardingBaseSchema.partial();
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

export const ChatRequestSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
});
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;

export const PlanCreateSchema = z.object({
  title: z.string().min(1).max(200),
  duration_weeks: z.number().int().min(1).max(52).optional(),
  plan_markdown: z.string().min(1).max(20000),
  source_message_id: z.string().uuid().optional(),
});
export type PlanCreateInput = z.infer<typeof PlanCreateSchema>;

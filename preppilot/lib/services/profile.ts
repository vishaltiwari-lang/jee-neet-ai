import { db, studentProfiles, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { OnboardingInput, ProfileUpdateInput } from "@/lib/validation/schemas";
import { isRetryableDbError, withDbRetry } from "@/lib/db/retry";

export type StudentProfile = typeof studentProfiles.$inferSelect;
export type ProfileLookup =
  | { status: "ok"; profile: StudentProfile | null }
  | { status: "unavailable" };

export async function ensureUserExists(userId: string, email?: string | null, name?: string | null) {
  await withDbRetry(async () => {
    await db
      .insert(users)
      .values({ id: userId, email: email ?? null, name: name ?? null })
      .onConflictDoNothing();
  });
}

export async function getProfile(userId: string) {
  const rows = await withDbRetry(() =>
    db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1),
  );
  return rows[0] ?? null;
}

export async function getProfileLookup(userId: string): Promise<ProfileLookup> {
  try {
    return { status: "ok", profile: await getProfile(userId) };
  } catch (error) {
    if (isRetryableDbError(error)) {
      console.error("profile lookup unavailable", error);
      return { status: "unavailable" };
    }
    throw error;
  }
}

export async function upsertProfile(userId: string, input: OnboardingInput) {
  await ensureUserExists(userId);
  const values = {
    userId,
    class: input.class,
    targetExam: input.target_exam,
    targetYear: input.target_year,
    coaching: input.coaching,
    strongSubjects: input.strong_subjects,
    weakSubjects: input.weak_subjects,
    mockScoreRange: input.mock_score_range,
    dailyStudyHours: input.daily_study_hours,
    schoolLoad: input.school_load ?? null,
    previousAttemptScore: input.previous_attempt_score ?? null,
    previousMistakes: input.previous_mistakes ?? null,
    emotionalState: input.emotional_state ?? null,
    goals: input.goals ?? null,
    onboardingComplete: true,
    updatedAt: new Date(),
  };
  await withDbRetry(async () => {
    await db
      .insert(studentProfiles)
      .values(values)
      .onConflictDoUpdate({ target: studentProfiles.userId, set: values });
  });
  return getProfile(userId);
}

export async function patchProfile(userId: string, input: ProfileUpdateInput) {
  const existing = await getProfile(userId);
  if (!existing) return null;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (input.class !== undefined) update.class = input.class;
  if (input.target_exam !== undefined) update.targetExam = input.target_exam;
  if (input.target_year !== undefined) update.targetYear = input.target_year;
  if (input.coaching !== undefined) update.coaching = input.coaching;
  if (input.strong_subjects !== undefined) update.strongSubjects = input.strong_subjects;
  if (input.weak_subjects !== undefined) update.weakSubjects = input.weak_subjects;
  if (input.mock_score_range !== undefined) update.mockScoreRange = input.mock_score_range;
  if (input.daily_study_hours !== undefined) update.dailyStudyHours = input.daily_study_hours;
  if (input.school_load !== undefined) update.schoolLoad = input.school_load;
  if (input.previous_attempt_score !== undefined) update.previousAttemptScore = input.previous_attempt_score;
  if (input.previous_mistakes !== undefined) update.previousMistakes = input.previous_mistakes;
  if (input.emotional_state !== undefined) update.emotionalState = input.emotional_state;
  if (input.goals !== undefined) update.goals = input.goals;
  await withDbRetry(async () => {
    await db.update(studentProfiles).set(update).where(eq(studentProfiles.userId, userId));
  });
  return getProfile(userId);
}

export async function resetOnboarding(userId: string) {
  await withDbRetry(async () => {
    await db
      .update(studentProfiles)
      .set({ onboardingComplete: false, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId));
  });
}

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfileLookup } from "@/lib/services/profile";
import ProfileView from "@/components/profile/ProfileView";
import TemporaryServiceIssue from "@/components/TemporaryServiceIssue";
import { ArrowLeft, Compass } from "lucide-react";

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profileLookup = await getProfileLookup(userId);
  if (profileLookup.status === "unavailable") {
    return <TemporaryServiceIssue retryHref="/profile" />;
  }
  const profile = profileLookup.profile;
  if (!profile?.onboardingComplete) redirect("/onboarding");
  const user = await currentUser();

  return (
    <div className="flex-1 px-4 md:px-8 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/chat" className="text-sm flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to chat
          </Link>
          <Link href="/" className="font-bold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" /> PrepPilot
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">Your profile</h1>
        <p className="text-muted-foreground mb-8">
          {user?.firstName ?? "Hi"} — this is what PrepPilot knows about your prep. Update anytime to get better-tuned plans.
        </p>
        <ProfileView profile={{
          class: profile.class,
          target_exam: profile.targetExam,
          target_year: profile.targetYear,
          coaching: profile.coaching,
          strong_subjects: profile.strongSubjects,
          weak_subjects: profile.weakSubjects,
          mock_score_range: profile.mockScoreRange,
          daily_study_hours: profile.dailyStudyHours,
          school_load: profile.schoolLoad ?? null,
          previous_attempt_score: profile.previousAttemptScore ?? null,
          previous_mistakes: profile.previousMistakes ?? null,
          emotional_state: profile.emotionalState ?? null,
          goals: profile.goals ?? null,
        }} />
      </div>
    </div>
  );
}

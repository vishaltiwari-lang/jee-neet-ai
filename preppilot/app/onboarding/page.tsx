import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProfileLookup } from "@/lib/services/profile";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import TemporaryServiceIssue from "@/components/TemporaryServiceIssue";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profileLookup = await getProfileLookup(userId);
  if (profileLookup.status === "unavailable") {
    return <TemporaryServiceIssue retryHref="/onboarding" />;
  }
  const profile = profileLookup.profile;
  if (profile?.onboardingComplete) redirect("/chat");
  return (
    <div className="flex-1 px-4 py-10 md:py-16">
      <div className="max-w-2xl mx-auto">
        <OnboardingForm />
      </div>
    </div>
  );
}

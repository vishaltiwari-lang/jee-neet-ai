import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProfile } from "@/lib/services/profile";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profile = await getProfile(userId);
  if (profile?.onboardingComplete) redirect("/chat");
  return (
    <div className="flex-1 px-4 py-10 md:py-16">
      <div className="max-w-2xl mx-auto">
        <OnboardingForm />
      </div>
    </div>
  );
}

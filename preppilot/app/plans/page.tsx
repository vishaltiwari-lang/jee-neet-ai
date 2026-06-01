import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listPlans } from "@/lib/services/plans";
import { getProfile } from "@/lib/services/profile";
import PlanCard from "@/components/plans/PlanCard";
import { Compass, ArrowLeft } from "lucide-react";

export default async function PlansPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profile = await getProfile(userId);
  if (!profile?.onboardingComplete) redirect("/onboarding");

  const plans = await listPlans(userId);

  return (
    <div className="flex-1 px-4 md:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/chat" className="text-sm flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to chat
            </Link>
          </div>
          <Link href="/" className="font-bold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" /> PrepPilot
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">My Plans</h1>
        <p className="text-muted-foreground mb-8">
          Plans you&apos;ve saved from chat. Click any to view, or delete the ones you no longer need.
        </p>

        {plans.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-2">No saved plans yet.</p>
            <p className="text-sm text-muted-foreground">
              Ask PrepPilot for a study plan and click <strong>Save plan</strong> under the reply.
            </p>
            <Link href="/chat" className="inline-block mt-4 text-primary hover:underline">
              Go to chat →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={{
                id: p.id,
                title: p.title,
                durationWeeks: p.durationWeeks,
                planMarkdown: p.planMarkdown,
                createdAt: p.createdAt.toISOString(),
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

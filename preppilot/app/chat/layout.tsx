import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { Bookmark, Compass, User } from "lucide-react";
import { getProfileLookup } from "@/lib/services/profile";
import ConversationListLoader from "@/components/chat/ConversationListLoader";
import NewChatButton from "@/components/chat/NewChatButton";
import TemporaryServiceIssue from "@/components/TemporaryServiceIssue";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profileLookup = await getProfileLookup(userId);
  if (profileLookup.status === "unavailable") {
    return <TemporaryServiceIssue retryHref="/chat" />;
  }
  const profile = profileLookup.profile;
  if (!profile?.onboardingComplete) redirect("/onboarding");

  return (
    <div className="grid h-dvh grid-cols-1 overflow-hidden bg-[#f6f7f8] text-foreground md:grid-cols-[304px_1fr] dark:bg-background">
      <aside className="hidden min-h-0 flex-col bg-[#151515] text-white md:flex">
        <div className="px-5 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-white text-[#151515]">
              <Compass className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-wide">PrepPilot</span>
          </Link>
        </div>
        <div className="px-4 pb-4">
          <NewChatButton className="w-full bg-white text-[#151515] hover:bg-white/90" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <Suspense fallback={<ConversationsSkeleton />}>
            <ConversationListLoader userId={userId} />
          </Suspense>
        </div>
        <div className="space-y-1 border-t border-white/10 p-3">
          <Link href="/plans" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Bookmark className="h-4 w-4" /> My Plans
          </Link>
          <Link href="/profile" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <User className="h-4 w-4" /> Profile
          </Link>
          <div className="mt-2 flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <UserButton />
            <span className="text-xs font-medium uppercase tracking-wide text-white/60">{profile.class.replace("_", " ")}</span>
          </div>
        </div>
      </aside>
      <main className="flex min-h-0 flex-col overflow-hidden">{children}</main>
    </div>
  );
}

function ConversationsSkeleton() {
  return (
    <div className="space-y-1.5" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-md px-3 py-2.5">
          <div className="mt-0.5 h-6 w-6 shrink-0 animate-pulse rounded-md bg-white/10" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

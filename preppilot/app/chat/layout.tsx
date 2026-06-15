import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { Bookmark, Compass, User } from "lucide-react";
import { getProfile } from "@/lib/services/profile";
import { listConversations } from "@/lib/services/conversations";
import ConversationsList from "@/components/chat/ConversationsList";
import NewChatButton from "@/components/chat/NewChatButton";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profile = await getProfile(userId);
  if (!profile?.onboardingComplete) redirect("/onboarding");

  const conversations = await listConversations(userId, 50);

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-[304px_1fr] h-[calc(100vh-0px)] overflow-hidden bg-[#f6f7f8] text-foreground dark:bg-background">
      <aside className="hidden md:flex flex-col bg-[#151515] text-white">
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
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <ConversationsList items={conversations.map(c => ({ id: c.id, title: c.title, updatedAt: c.updatedAt.toISOString() }))} />
        </div>
        <div className="border-t border-white/10 p-3 space-y-1">
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
      <main className="flex min-h-0 flex-col">{children}</main>
    </div>
  );
}

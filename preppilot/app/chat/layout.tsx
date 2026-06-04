import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { Compass, Bookmark, User } from "lucide-react";
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
    <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr] h-[calc(100vh-0px)] overflow-hidden">
      <aside className="hidden md:flex flex-col border-r bg-card/30">
        <div className="p-4 border-b">
          <Link href="/" className="font-bold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            PrepPilot
          </Link>
        </div>
        <div className="p-3 border-b">
          <NewChatButton />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <ConversationsList items={conversations.map(c => ({ id: c.id, title: c.title, updatedAt: c.updatedAt.toISOString() }))} />
        </div>
        <div className="p-3 border-t space-y-1">
          <Link href="/plans" className="flex items-center gap-2 text-sm py-2 px-3 rounded-md hover:bg-accent">
            <Bookmark className="h-4 w-4" /> My Plans
          </Link>
          <Link href="/profile" className="flex items-center gap-2 text-sm py-2 px-3 rounded-md hover:bg-accent">
            <User className="h-4 w-4" /> Profile
          </Link>
          <div className="pt-2 flex items-center justify-between">
            <UserButton />
            <span className="text-xs text-muted-foreground">{profile.class.replace("_", " ")}</span>
          </div>
        </div>
      </aside>
      <main className="flex flex-col min-h-0">{children}</main>
    </div>
  );
}

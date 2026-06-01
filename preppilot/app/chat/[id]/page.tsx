import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProfile } from "@/lib/services/profile";
import { getConversation, listMessages } from "@/lib/services/conversations";
import { db, flaggedConversations } from "@/lib/db";
import { eq } from "drizzle-orm";
import ChatWindow from "@/components/chat/ChatWindow";
import type { UIMessage } from "ai";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profile = await getProfile(userId);
  if (!profile?.onboardingComplete) redirect("/onboarding");

  const conv = await getConversation(userId, id);
  if (!conv) notFound();

  const dbMessages = await listMessages(id);
  const initialMessages: UIMessage[] = dbMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));

  const flags = await db
    .select()
    .from(flaggedConversations)
    .where(eq(flaggedConversations.conversationId, id))
    .limit(1);
  const flagged = flags.length > 0;

  return (
    <ChatWindow
      profileClass={profile.class}
      initialConversationId={id}
      initialMessages={initialMessages}
      flagged={flagged}
    />
  );
}

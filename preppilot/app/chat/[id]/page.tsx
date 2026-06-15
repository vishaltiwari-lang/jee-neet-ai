import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProfileLookup } from "@/lib/services/profile";
import { getConversation, listMessages } from "@/lib/services/conversations";
import { db, flaggedConversations } from "@/lib/db";
import { isRetryableDbError, withDbRetry } from "@/lib/db/retry";
import { eq } from "drizzle-orm";
import ChatWindow from "@/components/chat/ChatWindow";
import TemporaryServiceIssue from "@/components/TemporaryServiceIssue";
import type { UIMessage } from "ai";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profileLookup = await getProfileLookup(userId);
  if (profileLookup.status === "unavailable") {
    return <TemporaryServiceIssue retryHref={`/chat/${id}`} />;
  }
  const profile = profileLookup.profile;
  if (!profile?.onboardingComplete) redirect("/onboarding");

  const conv = await getConversation(userId, id).catch((error) => {
    if (isRetryableDbError(error)) {
      console.error("conversation lookup unavailable", error);
      return "unavailable" as const;
    }
    throw error;
  });
  if (conv === "unavailable") return <TemporaryServiceIssue retryHref={`/chat/${id}`} />;
  if (!conv) notFound();

  const dbMessages = await listMessages(id).catch((error) => {
    if (isRetryableDbError(error)) {
      console.error("message list unavailable", error);
      return "unavailable" as const;
    }
    throw error;
  });
  if (dbMessages === "unavailable") return <TemporaryServiceIssue retryHref={`/chat/${id}`} />;
  const initialMessages: UIMessage[] = dbMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));

  const flags = await withDbRetry(() =>
    db
      .select()
      .from(flaggedConversations)
      .where(eq(flaggedConversations.conversationId, id))
      .limit(1),
  ).catch((error) => {
    if (isRetryableDbError(error)) {
      console.error("flagged conversation lookup unavailable", error);
      return [];
    }
    throw error;
  });
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

import { listConversations } from "@/lib/services/conversations";
import { isRetryableDbError } from "@/lib/db/retry";
import ConversationsList from "@/components/chat/ConversationsList";

/**
 * Async server component that fetches the user's conversations.
 *
 * Rendered inside a <Suspense> boundary in the chat layout so the shell and
 * the chat panel paint immediately while this streams in — the conversation
 * list no longer blocks the whole route on a DB round-trip.
 */
export default async function ConversationListLoader({ userId }: { userId: string }) {
  const conversations = await listConversations(userId, 50).catch((error) => {
    if (isRetryableDbError(error)) {
      console.error("conversation list unavailable", error);
      return [];
    }
    throw error;
  });

  return (
    <ConversationsList
      items={conversations.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt.toISOString(),
      }))}
    />
  );
}

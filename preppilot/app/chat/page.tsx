import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/services/profile";
import ChatWindow from "@/components/chat/ChatWindow";

export default async function ChatHome({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profile = await getProfile(userId);
  if (!profile?.onboardingComplete) redirect("/onboarding");
  const { new: newChat } = await searchParams;

  return (
    <ChatWindow
      profileClass={profile.class}
      initialConversationId={null}
      initialMessages={[]}
      flagged={false}
      forceFreshSession={Boolean(newChat)}
    />
  );
}

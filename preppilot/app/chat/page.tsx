import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileLookup } from "@/lib/services/profile";
import ChatWindow from "@/components/chat/ChatWindow";
import TemporaryServiceIssue from "@/components/TemporaryServiceIssue";

export default async function ChatHome({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const profileLookup = await getProfileLookup(userId);
  if (profileLookup.status === "unavailable") {
    return <TemporaryServiceIssue retryHref="/chat" />;
  }
  const profile = profileLookup.profile;
  if (!profile?.onboardingComplete) redirect("/onboarding");
  const { new: newChat } = await searchParams;

  return (
    <ChatWindow
      profileClass={profile.class}
      initialConversationId={null}
      initialMessages={[]}
      flagged={false}
      freshSessionToken={newChat ?? null}
    />
  );
}

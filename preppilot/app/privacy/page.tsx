import Link from "next/link";

export const metadata = { title: "Privacy — PrepPilot" };

export default function PrivacyPage() {
  return (
    <div className="flex-1 px-6 py-12 max-w-2xl mx-auto prose-pp">
      <Link href="/" className="text-sm text-primary">← Home</Link>
      <h1>Privacy</h1>
      <p>
        PrepPilot stores the minimum data needed to give you personalized study advice: your Clerk user ID,
        the answers you give in onboarding, and your chat history.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Clerk user ID (mirrored from Google sign-in)</li>
        <li>Email and name (from Clerk)</li>
        <li>Onboarding profile: class, exam, subjects, hours, mock score range, optional goals/state</li>
        <li>Chat messages and saved plans</li>
        <li>Token usage and refusal logs (for cost analytics and improving the bot)</li>
      </ul>
      <h2>What we send to OpenAI</h2>
      <ul>
        <li>Your messages</li>
        <li>Your student profile (as a system prompt)</li>
        <li>A rolling summary of older messages</li>
      </ul>
      <p>We never send your email, Clerk ID, or other identifying info to the LLM.</p>
      <h2>Deletion</h2>
      <p>
        Use Clerk&apos;s user menu to delete your account. A webhook removes your profile, chats, plans, and logs from
        our database immediately.
      </p>
      <p className="text-sm text-muted-foreground">
        This is a placeholder privacy notice. Replace it with a lawyer-reviewed version before serving real users.
      </p>
    </div>
  );
}

import Link from "next/link";

export const metadata = { title: "Terms — PrepPilot" };

export default function TermsPage() {
  return (
    <div className="flex-1 px-6 py-12 max-w-2xl mx-auto prose-pp">
      <Link href="/" className="text-sm text-primary">← Home</Link>
      <h1>Terms</h1>
      <p>
        PrepPilot is a study-strategy assistant, not a teacher. It does not solve academic problems
        and the advice it gives is general — not a replacement for your coaching, school, or counsellor.
      </p>
      <ul>
        <li>You agree not to use PrepPilot to attempt to generate solutions to exam questions.</li>
        <li>You understand the bot can make mistakes; verify cutoffs, dates, and rankings on official NTA/JoSAA sites.</li>
        <li>For mental health concerns, please contact iCall (9152987821) or a qualified counsellor.</li>
        <li>Service is provided as-is, without warranty.</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        This is a placeholder. Replace with a lawyer-reviewed version before serving real users.
      </p>
    </div>
  );
}

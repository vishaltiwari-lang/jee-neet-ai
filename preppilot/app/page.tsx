import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Brain, Compass, ShieldOff } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  const signedIn = !!userId;
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b">
        <Link href="/" className="font-bold text-lg flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          PrepPilot
        </Link>
        <div className="flex items-center gap-3">
          {!signedIn && (
            <>
              <Link href="/sign-in"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link href="/sign-up"><Button size="sm">Get started</Button></Link>
            </>
          )}
          {signedIn && <Link href="/chat"><Button size="sm">Open chat</Button></Link>}
        </div>
      </header>

      <section className="flex-1 px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-primary mb-4">For JEE &amp; NEET aspirants</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Your AI mentor for <span className="text-primary">smart study plans</span> — not doubt-solving.
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            PrepPilot builds personalized prep strategies around your class, weak subjects, and mock scores.
            It plans, motivates, and analyzes — and politely refuses to solve numericals (because LLMs get JEE Advanced wrong, and one wrong step costs you weeks).
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {!signedIn ? (
              <>
                <Link href="/sign-up"><Button size="lg">Start free with Google</Button></Link>
                <Link href="/sign-in"><Button size="lg" variant="outline">I already have an account</Button></Link>
              </>
            ) : (
              <Link href="/chat"><Button size="lg">Continue to chat</Button></Link>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <Feature
            icon={<Brain className="h-6 w-6 text-primary" />}
            title="Personalized plans"
            desc="Onboard with your class, exam, weak subjects, daily hours, and mock scores. Every reply is built around that profile."
          />
          <Feature
            icon={<ShieldOff className="h-6 w-6 text-primary" />}
            title="Refuses to solve problems"
            desc="LLMs make mistakes at JEE/NEET difficulty. PrepPilot won't pretend otherwise — it redirects to strategy, resources, and approach."
          />
          <Feature
            icon={<Compass className="h-6 w-6 text-primary" />}
            title="Three paths"
            desc="Class 11, Class 12, or Dropper — each gets a separate onboarding flow and prompt set tuned to that journey."
          />
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-4xl">
          <Step n="1" title="Sign in with Google" desc="Clerk handles auth. Takes 10 seconds." />
          <Step n="2" title="Onboard" desc="Quick form: your class, exam target, subjects, hours, current mock range." />
          <Step n="3" title="Chat" desc="Ask for a 2-week revision plan, a board+JEE timetable, or how to bounce back from a bad mock." />
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-sm text-muted-foreground">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-3 justify-between">
          <span>© {new Date().getFullYear()} PrepPilot</span>
          <div className="flex gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-primary mb-2">{n}</div>
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

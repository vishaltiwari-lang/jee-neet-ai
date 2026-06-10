import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { isClerkConfigured } from "@/lib/auth/clerk";
import {
  BookOpen,
  CalendarCheck,
  Compass,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const clerkConfigured = isClerkConfigured();
  let signedIn = false;

  if (clerkConfigured) {
    try {
      const { userId } = await auth();
      signedIn = !!userId;
    } catch {
      // Keep homepage available even if auth backend is unavailable.
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm">
        <Link href="/" className="font-bold text-lg flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          PrepPilot
        </Link>
        <div className="flex items-center gap-3">
          {!signedIn && (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
          {signedIn && (
            <Link href="/chat">
              <Button size="sm">Open chat</Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto w-full text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-8">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Built for JEE &amp; NEET aspirants
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            PrepPilot
            <span className="block text-primary mt-2 text-3xl md:text-5xl lg:text-6xl font-semibold">
              Your Preparation Buddy
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn syllabus overwhelm into a clear daily plan. Get personalized study
            strategies, revision schedules, and the motivation to stay consistent
            through your JEE or NEET journey.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!signedIn ? (
              <>
                <Link href="/sign-up">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    <Zap className="h-4 w-4" />
                    Start free with Google
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    I already have an account
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/chat">
                <Button size="lg" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Continue to chat
                </Button>
              </Link>
            )}
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Free to start · Takes under a minute · No credit card
          </p>
        </div>
      </section>

      {/* Value props */}
      <section className="px-6 py-16 bg-muted/40 border-y">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Everything you need to prep with confidence
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              PrepPilot learns your profile and coaches you on what matters most —
              planning, consistency, and strategy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Feature
              icon={<Target className="h-6 w-6 text-primary" />}
              title="Plans built around you"
              desc="Share your class, exam target, weak subjects, daily hours, and mock scores. Every reply is tailored to your situation."
            />
            <Feature
              icon={<CalendarCheck className="h-6 w-6 text-primary" />}
              title="Revision that sticks"
              desc="Get structured timetables, chapter-wise schedules, and backlog recovery plans that fit your real availability."
            />
            <Feature
              icon={<TrendingUp className="h-6 w-6 text-primary" />}
              title="Bounce back stronger"
              desc="Bad mock? Low motivation? PrepPilot helps you analyze what went wrong and chart a path to your next improvement."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Up and running in minutes</h2>
          <p className="text-muted-foreground">Three simple steps to your first personalized plan.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
          <Step
            n="01"
            icon={<Zap className="h-5 w-5" />}
            title="Sign in with Google"
            desc="Quick, secure sign-in. You're in within seconds."
          />
          <Step
            n="02"
            icon={<BookOpen className="h-5 w-5" />}
            title="Tell us about your prep"
            desc="Class, exam target, subjects, study hours, and where you stand today."
          />
          <Step
            n="03"
            icon={<Compass className="h-5 w-5" />}
            title="Start your journey"
            desc="Ask for a revision plan, a board+JEE timetable, or advice after a tough mock."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto w-full rounded-2xl border bg-card p-10 md:p-14 text-center shadow-sm">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to make every study hour count?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join aspirants who use PrepPilot to stay organized, stay motivated,
            and stay on track toward their dream college.
          </p>
          {!signedIn ? (
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Get started — it&apos;s free
              </Button>
            </Link>
          ) : (
            <Link href="/chat">
              <Button size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Open your chat
              </Button>
            </Link>
          )}
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-sm text-muted-foreground">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-3 justify-between items-center">
          <span>© {new Date().getFullYear()} PrepPilot — Your Preparation Buddy</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <h3 className="font-semibold mb-2 text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center md:text-left">
      <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
        <span className="text-sm font-bold text-primary tracking-wider">{n}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <h4 className="font-semibold mb-2 text-lg">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

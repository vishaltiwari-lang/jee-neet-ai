import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { OnboardingSchema } from "@/lib/validation/schemas";
import { upsertProfile } from "@/lib/services/profile";
import { checkOnboardingLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const rl = await checkOnboardingLimit(userId);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_seconds: rl.retryAfterSeconds },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await upsertProfile(userId, parsed.data);
  return NextResponse.json({ ok: true, profile });
}

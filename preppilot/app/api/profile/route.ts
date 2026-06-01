import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ProfileUpdateSchema } from "@/lib/validation/schemas";
import { getProfile, patchProfile, resetOnboarding } from "@/lib/services/profile";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const profile = await getProfile(userId);
  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (body?.__reset_onboarding === true) {
    await resetOnboarding(userId);
    return NextResponse.json({ ok: true });
  }

  const parsed = ProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const profile = await patchProfile(userId, parsed.data);
  return NextResponse.json({ profile });
}

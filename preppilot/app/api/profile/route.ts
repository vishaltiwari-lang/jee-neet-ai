import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ProfileUpdateSchema } from "@/lib/validation/schemas";
import { getProfileLookup, patchProfile, resetOnboarding } from "@/lib/services/profile";
import { isRetryableDbError } from "@/lib/db/retry";

function dbUnavailableResponse() {
  return NextResponse.json(
    { error: "database_unavailable", message: "Please retry in a moment." },
    { status: 503 },
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const profileLookup = await getProfileLookup(userId);
  if (profileLookup.status === "unavailable") return dbUnavailableResponse();
  return NextResponse.json({ profile: profileLookup.profile });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (body?.__reset_onboarding === true) {
    try {
      await resetOnboarding(userId);
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (isRetryableDbError(error)) return dbUnavailableResponse();
      throw error;
    }
  }

  const parsed = ProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const profile = await patchProfile(userId, parsed.data);
    return NextResponse.json({ profile });
  } catch (error) {
    if (isRetryableDbError(error)) return dbUnavailableResponse();
    throw error;
  }
}

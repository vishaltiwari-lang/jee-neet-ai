import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { PlanCreateSchema } from "@/lib/validation/schemas";
import { createPlan, listPlans } from "@/lib/services/plans";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const plans = await listPlans(userId);
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = PlanCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const plan = await createPlan(userId, parsed.data);
    return NextResponse.json({ plan });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { deletePlan } from "@/lib/services/plans";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const ok = await deletePlan(userId, id);
  if (!ok) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ ok: true });
}

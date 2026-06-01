import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, flaggedConversations } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) return new NextResponse("Forbidden", { status: 403 });
  const rows = await db.select().from(flaggedConversations).orderBy(desc(flaggedConversations.createdAt)).limit(200);
  return NextResponse.json({ flags: rows });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) return new NextResponse("Forbidden", { status: 403 });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) return new NextResponse("Bad input", { status: 400 });
  await db.update(flaggedConversations).set({ reviewed: true }).where(eq(flaggedConversations.id, id));
  return NextResponse.json({ ok: true });
}

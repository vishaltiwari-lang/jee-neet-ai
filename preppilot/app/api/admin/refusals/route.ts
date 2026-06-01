import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, refusalLogs } from "@/lib/db";
import { desc } from "drizzle-orm";
import { isAdmin } from "@/lib/auth/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) return new NextResponse("Forbidden", { status: 403 });
  const rows = await db.select().from(refusalLogs).orderBy(desc(refusalLogs.createdAt)).limit(200);
  return NextResponse.json({ refusals: rows });
}

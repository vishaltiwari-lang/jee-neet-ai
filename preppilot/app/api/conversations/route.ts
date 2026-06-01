import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createConversation, listConversations } from "@/lib/services/conversations";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const rows = await listConversations(userId);
  return NextResponse.json({ conversations: rows });
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const conv = await createConversation(userId);
  return NextResponse.json({ conversation: conv });
}

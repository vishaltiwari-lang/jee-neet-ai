import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getConversation, listMessages } from "@/lib/services/conversations";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const conv = await getConversation(userId, id);
  if (!conv) return new NextResponse("Not found", { status: 404 });
  const msgs = await listMessages(id);
  return NextResponse.json({ messages: msgs });
}

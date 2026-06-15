import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createConversation, listConversations } from "@/lib/services/conversations";
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
  try {
    const rows = await listConversations(userId);
    return NextResponse.json({ conversations: rows });
  } catch (error) {
    if (isRetryableDbError(error)) return dbUnavailableResponse();
    throw error;
  }
}

const CreateConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
  })
  .optional();

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => undefined);
  const parsed = CreateConversationSchema.safeParse(body);
  const title = parsed.success ? parsed.data?.title : undefined;
  try {
    const conv = await createConversation(userId, title);
    return NextResponse.json({ conversation: conv });
  } catch (error) {
    if (isRetryableDbError(error)) return dbUnavailableResponse();
    throw error;
  }
}

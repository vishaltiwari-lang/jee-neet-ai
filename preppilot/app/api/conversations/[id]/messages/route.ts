import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getConversation, listMessages } from "@/lib/services/conversations";
import { isRetryableDbError } from "@/lib/db/retry";

function dbUnavailableResponse() {
  return NextResponse.json(
    { error: "database_unavailable", message: "Please retry in a moment." },
    { status: 503 },
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const conv = await getConversation(userId, id).catch((error) => {
    if (isRetryableDbError(error)) return "unavailable" as const;
    throw error;
  });
  if (conv === "unavailable") return dbUnavailableResponse();
  if (!conv) return new NextResponse("Not found", { status: 404 });
  const msgs = await listMessages(id).catch((error) => {
    if (isRetryableDbError(error)) return "unavailable" as const;
    throw error;
  });
  if (msgs === "unavailable") return dbUnavailableResponse();
  return NextResponse.json({ messages: msgs });
}

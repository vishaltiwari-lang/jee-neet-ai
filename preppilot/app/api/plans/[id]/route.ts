import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { deletePlan } from "@/lib/services/plans";
import { isRetryableDbError } from "@/lib/db/retry";

function dbUnavailableResponse() {
  return NextResponse.json(
    { error: "database_unavailable", message: "Please retry in a moment." },
    { status: 503 },
  );
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const ok = await deletePlan(userId, id).catch((error) => {
    if (isRetryableDbError(error)) return "unavailable" as const;
    throw error;
  });
  if (ok === "unavailable") return dbUnavailableResponse();
  if (!ok) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ ok: true });
}

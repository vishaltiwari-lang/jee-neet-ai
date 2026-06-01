import { headers } from "next/headers";
import { Webhook } from "svix";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

type ClerkEvent =
  | { type: "user.created" | "user.updated"; data: { id: string; email_addresses: { email_address: string }[]; first_name?: string; last_name?: string } }
  | { type: "user.deleted"; data: { id: string } };

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const hdrs = await headers();
  const svixId = hdrs.get("svix-id");
  const svixTimestamp = hdrs.get("svix-timestamp");
  const svixSignature = hdrs.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);
  let evt: ClerkEvent;
  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const id = evt.data.id;
      const email = evt.data.email_addresses?.[0]?.email_address ?? null;
      const name = [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null;

      await db
        .insert(users)
        .values({ id, email, name })
        .onConflictDoUpdate({
          target: users.id,
          set: { email, name },
        });
    } else if (evt.type === "user.deleted") {
      await db.delete(users).where(eq(users.id, evt.data.id));
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Webhook handler error", err);
    return new Response("Server error", { status: 500 });
  }
}

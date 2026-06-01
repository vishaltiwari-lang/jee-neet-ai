import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db, refusalLogs, flaggedConversations, usageLogs } from "@/lib/db";
import { desc } from "drizzle-orm";
import { isAdmin } from "@/lib/auth/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!isAdmin(userId)) redirect("/chat");

  const [refusals, flags, usage] = await Promise.all([
    db.select().from(refusalLogs).orderBy(desc(refusalLogs.createdAt)).limit(100),
    db.select().from(flaggedConversations).orderBy(desc(flaggedConversations.createdAt)).limit(100),
    db.select().from(usageLogs).orderBy(desc(usageLogs.createdAt)).limit(100),
  ]);

  return (
    <div className="flex-1 px-4 md:px-8 py-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/chat" className="text-sm flex items-center gap-1 hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to chat
        </Link>
        <h1 className="text-3xl font-bold mb-6">Admin</h1>
        <Tabs defaultValue="refusals">
          <TabsList>
            <TabsTrigger value="refusals">Refusals ({refusals.length})</TabsTrigger>
            <TabsTrigger value="flags">Flags ({flags.length})</TabsTrigger>
            <TabsTrigger value="usage">Usage ({usage.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="refusals">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">When</th>
                  <th>User</th>
                  <th>Reason</th>
                  <th>Excerpt</th>
                </tr>
              </thead>
              <tbody>
                {refusals.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 whitespace-nowrap">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="font-mono text-xs">{r.userId.slice(0, 14)}…</td>
                    <td>{r.reason}</td>
                    <td className="text-muted-foreground">{r.messageExcerpt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
          <TabsContent value="flags">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">When</th>
                  <th>User</th>
                  <th>Conversation</th>
                  <th>Reason</th>
                  <th>Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((f) => (
                  <tr key={f.id} className="border-b">
                    <td className="py-2 whitespace-nowrap">{f.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="font-mono text-xs">{f.userId.slice(0, 14)}…</td>
                    <td className="font-mono text-xs">{f.conversationId.slice(0, 8)}…</td>
                    <td>{f.reason}</td>
                    <td>{f.reviewed ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
          <TabsContent value="usage">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">When</th>
                  <th>User</th>
                  <th>Route</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Cost $</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2 whitespace-nowrap">{u.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="font-mono text-xs">{u.userId.slice(0, 14)}…</td>
                    <td>{u.route}</td>
                    <td>{u.tokensIn}</td>
                    <td>{u.tokensOut}</td>
                    <td>{Number(u.costUsd).toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

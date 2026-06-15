"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";

export default function ConversationsList({ items }: { items: { id: string; title: string; updatedAt: string }[] }) {
  const pathname = usePathname();
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-white/10 bg-white/5 px-3 py-3 text-xs leading-5 text-white/60">
        No chats yet.
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {items.map((c) => {
        const active = pathname === `/chat/${c.id}`;
        return (
          <li key={c.id}>
            <Link
              href={`/chat/${c.id}`}
              className={cn(
                "group flex gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                active && "bg-white text-[#151515] shadow-sm hover:bg-white hover:text-[#151515]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-white/60",
                  active && "bg-[#151515] text-white",
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{truncate(c.title, 42)}</span>
                <span className={cn("block text-xs text-white/40", active && "text-[#151515]/60")}>
                  {formatRelativeTime(c.updatedAt)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

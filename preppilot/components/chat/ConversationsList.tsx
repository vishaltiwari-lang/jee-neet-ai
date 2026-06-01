"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";

export default function ConversationsList({ items }: { items: { id: string; title: string; updatedAt: string }[] }) {
  const pathname = usePathname();
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground px-3 py-2">No chats yet. Send a message to start.</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map((c) => {
        const active = pathname === `/chat/${c.id}`;
        return (
          <li key={c.id}>
            <Link
              href={`/chat/${c.id}`}
              className={cn(
                "block px-3 py-2 rounded-md text-sm hover:bg-accent",
                active && "bg-accent font-medium",
              )}
            >
              <div className="truncate">{truncate(c.title, 40)}</div>
              <div className="text-xs text-muted-foreground">{formatRelativeTime(c.updatedAt)}</div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

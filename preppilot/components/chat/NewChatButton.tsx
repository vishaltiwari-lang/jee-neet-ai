"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHAT_CACHE_KEY, NEW_CHAT_EVENT } from "@/lib/constants/chat";

export default function NewChatButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = React.useTransition();

  const onClick = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CHAT_CACHE_KEY);
      // Reset the live chat instantly — ChatWindow listens for this and clears
      // its state synchronously, so the fresh chat appears with no wait.
      window.dispatchEvent(new Event(NEW_CHAT_EVENT));
    }

    // Only navigate when we're on a specific conversation route. When already
    // on /chat the event above is all that's needed — no server round-trip,
    // no blocking "Opening..." state.
    if (pathname !== "/chat") {
      startTransition(() => router.push("/chat"));
    }
  }, [pathname, router]);

  return (
    <Button
      type="button"
      onClick={onClick}
      size={compact ? "sm" : "default"}
      className={className ?? "w-full"}
    >
      <MessageSquarePlus className="h-4 w-4" /> New chat
    </Button>
  );
}

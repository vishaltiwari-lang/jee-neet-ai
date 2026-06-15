"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHAT_CACHE_KEY, NEW_CHAT_EVENT } from "@/lib/constants/chat";

export default function NewChatButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const onClick = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CHAT_CACHE_KEY);
      window.dispatchEvent(new Event(NEW_CHAT_EVENT));
    }

    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    startTransition(() => {
      router.push(`/chat?new=${encodeURIComponent(token)}`);
    });
  }, [router]);

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={pending}
      size={compact ? "sm" : "default"}
      className={className ?? "w-full"}
    >
      <MessageSquarePlus className="h-4 w-4" /> {pending ? "Opening..." : "New chat"}
    </Button>
  );
}

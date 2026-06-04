"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";

export default function NewChatButton() {
  const router = useRouter();

  const onClick = React.useCallback(() => {
    router.push(`/chat?new=${Date.now()}`);
  }, [router]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90"
    >
      <MessageSquarePlus className="h-4 w-4" /> New chat
    </button>
  );
}

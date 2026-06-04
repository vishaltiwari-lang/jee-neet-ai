"use client";
import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, AlertTriangle, Bookmark, RefreshCcw } from "lucide-react";
import Markdown from "@/components/chat/Markdown";
import { getRandomPrompts, type StudentClass } from "@/lib/constants/suggestedPrompts";

type Props = {
  profileClass: StudentClass;
  initialConversationId: string | null;
  initialMessages: UIMessage[];
  flagged: boolean;
  forceFreshSession?: boolean;
};

const CHAT_CACHE_KEY = "preppilot.chat.last-session.v1";

function messageText(m: UIMessage): string {
  return m.parts
    .filter((p) => (p as { type?: string }).type === "text")
    .map((p) => (p as { text: string }).text)
    .join("");
}

function sanitizeForStorage(messages: UIMessage[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: m.parts.filter((p) => (p as { type?: string }).type === "text"),
  }));
}

function readCachedSession():
  | {
      conversationId: string | null;
      messages: UIMessage[];
    }
  | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CHAT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      conversationId?: string | null;
      messages?: UIMessage[];
    };
    if (!Array.isArray(parsed.messages)) return null;
    return {
      conversationId: typeof parsed.conversationId === "string" ? parsed.conversationId : null,
      messages: parsed.messages,
    };
  } catch {
    return null;
  }
}

export default function ChatWindow({
  profileClass,
  initialConversationId,
  initialMessages,
  flagged,
  forceFreshSession = false,
}: Props) {
  const [conversationId, setConversationId] = React.useState<string | null>(initialConversationId);
  const conversationIdRef = React.useRef<string | null>(initialConversationId);
  const [input, setInput] = React.useState("");
  const [suggested, setSuggested] = React.useState<string[]>([]);
  const [showAll, setShowAll] = React.useState(false);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const hydratedFromCacheRef = React.useRef(false);
  const creatingConversationRef = React.useRef<Promise<string | null> | null>(null);
  const resetRef = React.useRef(false);

  React.useEffect(() => {
    setSuggested(getRandomPrompts(profileClass, 4));
  }, [profileClass]);

  React.useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({ messages, id }) {
          return {
            body: {
              id,
              conversation_id: conversationIdRef.current ?? undefined,
              messages,
            },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error, regenerate, setMessages } = useChat({
    messages: initialMessages,
    transport,
    onFinish: () => {
      const last = document.querySelector<HTMLMetaElement>("meta[name='x-conversation-id']");
      void last;
    },
  });

  React.useEffect(() => {
    if (!forceFreshSession || resetRef.current) return;
    resetRef.current = true;
    conversationIdRef.current = null;
    setConversationId(null);
    setMessages([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CHAT_CACHE_KEY);
    }
  }, [forceFreshSession, setMessages]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  React.useEffect(() => {
    if (hydratedFromCacheRef.current) return;
    hydratedFromCacheRef.current = true;
    if (forceFreshSession) return;
    if (initialConversationId || initialMessages.length > 0) return;

    const cached = readCachedSession();
    if (!cached) return;
    if (cached.messages.length > 0) {
      setMessages(cached.messages);
    }
    if (!conversationIdRef.current && cached.conversationId) {
      conversationIdRef.current = cached.conversationId;
      setConversationId(cached.conversationId);
    }
  }, [forceFreshSession, initialConversationId, initialMessages.length, setMessages]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      conversationId,
      messages: sanitizeForStorage(messages).slice(-120),
      updatedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage failures (private mode / quota).
    }
  }, [conversationId, messages]);

  const ensureConversationId = React.useCallback(async (seedText: string): Promise<string | null> => {
    if (conversationIdRef.current) return conversationIdRef.current;

    if (!creatingConversationRef.current) {
      creatingConversationRef.current = (async () => {
        try {
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: seedText.slice(0, 80) }),
          });
          if (!res.ok) return null;
          const payload = (await res.json().catch(() => null)) as { conversation?: { id?: string } } | null;
          const id = payload?.conversation?.id;
          if (typeof id === "string" && id.length > 0) {
            conversationIdRef.current = id;
            setConversationId(id);
            return id;
          }
          return null;
        } finally {
          creatingConversationRef.current = null;
        }
      })();
    }

    return creatingConversationRef.current;
  }, []);

  const send = async (text: string) => {
    const v = text.trim();
    if (!v) return;
    setInput("");
    await ensureConversationId(v);
    sendMessage({ text: v });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col min-h-0 h-full">
      {flagged && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-400" />
          <div>
            If you&apos;re going through a tough time, please reach out to <strong>iCall</strong>: <a className="underline" href="tel:9152987821">9152987821</a> (Mon–Sat, 8am–10pm). Free and confidential.
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">What can I plan for you today?</h1>
                <p className="text-sm text-muted-foreground">
                  I&apos;m here to help with study plans, revision strategies, mock analysis, and motivation — not problem-solving.
                </p>
              </div>
              <div className="space-y-2">
                {suggested.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="block w-full text-left px-4 py-3 rounded-md border bg-card hover:bg-accent text-sm transition-colors"
                  >
                    {q}
                  </button>
                ))}
                {!showAll && (
                  <button onClick={() => setShowAll(true)} className="text-xs text-primary hover:underline">
                    Show more prompts →
                  </button>
                )}
                {showAll && <ShowAllPrompts profileClass={profileClass} excluded={suggested} onPick={(q) => setInput(q)} />}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onSavePlan={() => savePlan(m)} />
          ))}

          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive flex items-center gap-2">
              {error.message?.includes("429")
                ? "You are sending messages too quickly. Please wait a bit and retry."
                : "Temporary issue while processing this reply. Your chat is saved in this browser."}
              <button onClick={() => regenerate()} className="underline inline-flex items-center gap-1">
                <RefreshCcw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="border-t bg-background px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask for a plan, strategy, or how to bounce back from a bad mock…"
            rows={1}
            className="resize-none min-h-[44px] max-h-40"
            disabled={isStreaming}
          />
          <Button type="submit" size="icon" disabled={isStreaming || !input.trim()}>
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2 max-w-3xl mx-auto">
          PrepPilot can be wrong. It won&apos;t solve numericals — that&apos;s by design.
        </p>
      </form>
    </div>
  );

  async function savePlan(m: UIMessage) {
    const text = messageText(m);
    const titleMatch = text.match(/^#+\s*(.+)$/m);
    const title = (titleMatch?.[1] || text.split("\n")[0] || "Saved plan").slice(0, 100);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, plan_markdown: text, source_message_id: m.id }),
      });
      if (res.ok) {
        alert("Plan saved! Find it under My Plans.");
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error ?? "Failed to save");
      }
    } catch {
      alert("Network error");
    }
  }
}

function MessageBubble({ message, onSavePlan }: { message: UIMessage; onSavePlan: () => void }) {
  const text = messageText(message);
  const isAssistant = message.role === "assistant";
  const isRefusal = isAssistant && text.startsWith("I won't solve that one");
  const looksLikePlan = isAssistant && /##\s*Week\s*\d|## Day\s*\d/i.test(text);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`rounded-2xl px-4 py-3 ${isRefusal ? "bg-muted/60 border border-amber-200 dark:border-amber-900" : "bg-card border"}`}>
        <Markdown>{text}</Markdown>
      </div>
      {looksLikePlan && (
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="outline" onClick={onSavePlan}>
            <Bookmark className="h-3.5 w-3.5" /> Save plan
          </Button>
        </div>
      )}
    </div>
  );
}

function ShowAllPrompts({ profileClass, excluded, onPick }: { profileClass: StudentClass; excluded: string[]; onPick: (q: string) => void }) {
  const all = React.useMemo(() => {
    // Import lazily; use the constants here.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/constants/suggestedPrompts") as typeof import("@/lib/constants/suggestedPrompts");
    return mod.getPromptsForClass(profileClass).filter((q) => !excluded.includes(q));
  }, [profileClass, excluded]);
  return (
    <div className="space-y-2 pt-2 border-t mt-2">
      {all.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="block w-full text-left px-4 py-2 rounded-md text-sm hover:bg-accent"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

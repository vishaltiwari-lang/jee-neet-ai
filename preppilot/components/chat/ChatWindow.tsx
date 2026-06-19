"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Bookmark, BookOpen, Bot, Loader2, RefreshCcw, Send, Sparkles, Square, UserRound } from "lucide-react";
import Markdown from "@/components/chat/Markdown";
import NewChatButton from "@/components/chat/NewChatButton";
import { getPromptsForClass, type StudentClass } from "@/lib/constants/suggestedPrompts";
import { CHAT_CACHE_KEY, CHAT_REQUEST_HISTORY_LIMIT, NEW_CHAT_EVENT } from "@/lib/constants/chat";
import { cn } from "@/lib/utils";

type Props = {
  profileClass: StudentClass;
  initialConversationId: string | null;
  initialMessages: UIMessage[];
  flagged: boolean;
  freshSessionToken?: string | null;
};

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
  freshSessionToken = null,
}: Props) {
  const router = useRouter();
  const [conversationId, setConversationId] = React.useState<string | null>(initialConversationId);
  const conversationIdRef = React.useRef<string | null>(initialConversationId);
  const [input, setInput] = React.useState("");
  const suggested = React.useMemo(() => getPromptsForClass(profileClass).slice(0, 4), [profileClass]);
  const [showAll, setShowAll] = React.useState(false);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const hydratedFromCacheRef = React.useRef(false);
  const creatingConversationRef = React.useRef<Promise<string | null> | null>(null);
  const lastHandledFreshTokenRef = React.useRef<string | null>(null);
  const sidebarSyncedConversationRef = React.useRef<string | null>(initialConversationId);
  const chatSessionRef = React.useRef(0);

  React.useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({ messages, id, body, trigger, messageId }) {
          return {
            body: {
              ...body,
              id,
              messages: sanitizeForStorage(messages).slice(-CHAT_REQUEST_HISTORY_LIMIT),
              trigger,
              messageId,
            },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error, regenerate, setMessages, stop } = useChat({
    messages: initialMessages,
    transport,
    onFinish: () => {
      const last = document.querySelector<HTMLMetaElement>("meta[name='x-conversation-id']");
      void last;
    },
  });

  const resetChat = React.useCallback(() => {
    chatSessionRef.current += 1;
    void stop();
    creatingConversationRef.current = null;
    conversationIdRef.current = null;
    sidebarSyncedConversationRef.current = null;
    hydratedFromCacheRef.current = true;
    setConversationId(null);
    setInput("");
    setShowAll(false);
    setMessages([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CHAT_CACHE_KEY);
    }
  }, [setMessages, stop]);

  React.useEffect(() => {
    if (!freshSessionToken) return;
    if (lastHandledFreshTokenRef.current === freshSessionToken) return;
    lastHandledFreshTokenRef.current = freshSessionToken;
    resetChat();
  }, [freshSessionToken, resetChat]);

  React.useEffect(() => {
    const onNewChat = () => resetChat();
    window.addEventListener(NEW_CHAT_EVENT, onNewChat);
    return () => window.removeEventListener(NEW_CHAT_EVENT, onNewChat);
  }, [resetChat]);

  React.useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const nextHeight = Math.min(el.scrollHeight, 160);
    el.style.height = `${Math.max(nextHeight, 48)}px`;
  }, [input]);

  // Smooth scroll only when message count changes to avoid jitter.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // During token streaming, keep following output with instant scroll.
  React.useEffect(() => {
    if (status !== "streaming") return;
    const id = window.setInterval(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
    }, 120);
    return () => window.clearInterval(id);
  }, [status]);

  React.useEffect(() => {
    if (hydratedFromCacheRef.current) return;
    hydratedFromCacheRef.current = true;
    if (freshSessionToken) return;
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
  }, [freshSessionToken, initialConversationId, initialMessages.length, setMessages]);

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

  React.useEffect(() => {
    if (!conversationId) return;
    if (sidebarSyncedConversationRef.current === conversationId) return;
    sidebarSyncedConversationRef.current = conversationId;
    router.refresh();
  }, [conversationId, router]);

  const ensureConversationId = React.useCallback(async (seedText: string): Promise<string | null> => {
    if (conversationIdRef.current) return conversationIdRef.current;

    if (!creatingConversationRef.current) {
      const session = chatSessionRef.current;
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
          if (chatSessionRef.current !== session) return null;
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
    const session = chatSessionRef.current;
    setInput("");
    await ensureConversationId(v);
    if (chatSessionRef.current !== session) return;
    void sendMessage(
      { text: v },
      {
        body: {
          conversation_id: conversationIdRef.current ?? undefined,
          message: v,
        },
      },
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStreaming) return;
    void send(input);
  };

  const isStreaming = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && !isStreaming;

  // Show "Thinking..." until the assistant produces text or a visible tool
  // pill, so there's never a bare avatar with nothing in it.
  const lastMessage = messages[messages.length - 1];
  const showThinking =
    lastMessage?.role === "user" ||
    (lastMessage?.role === "assistant" &&
      messageText(lastMessage).trim() === "" &&
      !lastMessage.parts.some((p) => String((p as { type?: string }).type).startsWith("tool-")));
  const profileLabel = profileClass.replace("_", " ");

  const pickPrompt = React.useCallback((prompt: string) => {
    setInput(prompt);
    window.requestAnimationFrame(() => taRef.current?.focus());
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f6f7f8] dark:bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-white/95 px-4 py-3 backdrop-blur md:px-8 dark:border-white/10 dark:bg-background/80">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[#151515] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-wide">PrepPilot</div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{profileLabel}</div>
            </div>
          </div>
        </div>
        <NewChatButton compact className="h-9 shrink-0 bg-[#151515] px-3 text-white hover:bg-[#242424]" />
      </div>

      {flagged && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-400" />
          <div>
            If you&apos;re going through a tough time, please reach out to <strong>iCall</strong>: <a className="underline" href="tel:9152987821">9152987821</a> (Mon–Sat, 8am–10pm). Free and confidential.
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-4xl space-y-6 pb-4">
          {messages.length === 0 && (
            <div className="mx-auto flex min-h-[54vh] max-w-3xl flex-col justify-center space-y-6">
              <div className="space-y-3">
                <div className="grid h-11 w-11 place-items-center rounded-md border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-card">
                  <Sparkles className="h-5 w-5 text-[#151515] dark:text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#151515] md:text-4xl dark:text-white">
                    Plan the next move.
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Pick a prompt or write your own.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {suggested.map((q) => (
                  <button
                    key={q}
                    onClick={() => pickPrompt(q)}
                    className="group min-h-16 rounded-md border border-black/10 bg-white px-4 py-3 text-left text-sm leading-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md dark:border-white/10 dark:bg-card dark:hover:border-white/20"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>{q}</span>
                      <Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                ))}
              </div>
              {!showAll && (
                <button onClick={() => setShowAll(true)} className="w-fit text-xs font-medium text-[#151515] underline-offset-4 hover:underline dark:text-white">
                  Show more prompts
                </button>
              )}
              {showAll && <ShowAllPrompts profileClass={profileClass} excluded={suggested} onPick={pickPrompt} />}
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onSavePlan={() => savePlan(m)} />
          ))}

          {isStreaming && showThinking && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-white shadow-sm dark:bg-card">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
              Thinking...
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center justify-between gap-3">
              <span>
                {error.message?.includes("429")
                  ? "You are sending messages too quickly. Please wait a bit and retry."
                  : "Temporary issue while processing this reply. Your chat is saved in this browser."}
              </span>
              <button
                onClick={() => regenerate({ body: { conversation_id: conversationIdRef.current ?? undefined } })}
                className="shrink-0 underline inline-flex items-center gap-1"
              >
                <RefreshCcw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="border-t border-black/10 bg-white/90 px-3 py-3 backdrop-blur md:px-8 md:py-4 dark:border-white/10 dark:bg-background/80">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 shadow-[0_18px_50px_rgba(15,23,42,0.10)] transition-shadow focus-within:border-black/20 focus-within:shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card">
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isStreaming) void send(input);
                }
              }}
              aria-label="Chat message"
              placeholder="Ask PrepPilot..."
              rows={1}
              className="max-h-40 min-h-12 resize-none border-0 bg-transparent px-0 py-2 text-base leading-6 shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
            />
            <Button
              type={isStreaming ? "button" : "submit"}
              size="icon"
              aria-label={isStreaming ? "Stop response" : "Send message"}
              disabled={!isStreaming && !canSend}
              onClick={isStreaming ? () => void stop() : undefined}
              className="h-11 w-11 shrink-0 bg-[#151515] text-white hover:bg-[#242424]"
            >
              {isStreaming ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
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
      <div className="flex justify-end gap-3">
        <div className="max-w-[86%] rounded-md bg-[#151515] px-4 py-3 text-sm leading-6 text-white shadow-sm whitespace-pre-wrap md:max-w-[72%]">
          {text}
        </div>
        <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-md bg-[#151515] text-white md:grid">
          <UserRound className="h-4 w-4" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="mt-1 hidden h-8 w-8 shrink-0 place-items-center rounded-md border border-black/10 bg-white text-[#151515] shadow-sm md:grid dark:border-white/10 dark:bg-card dark:text-white">
        <Bot className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <ToolActivity message={message} />
        {text && (
          <div
            className={cn(
              "rounded-md border bg-white px-4 py-3 shadow-sm dark:bg-card",
              isRefusal ? "border-amber-300/70 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30" : "border-black/10 dark:border-white/10",
            )}
          >
            <Markdown>{text}</Markdown>
          </div>
        )}
        {looksLikePlan && text && (
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="outline" onClick={onSavePlan} className="bg-white dark:bg-card">
              <Bookmark className="h-3.5 w-3.5" /> Save plan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

type ToolUIPart = {
  type: string;
  state?: string;
  output?: { available?: boolean; results?: unknown[] };
};

/**
 * Renders the agent's tool calls (currently the Physics Wallah book search) as
 * inline status pills, so the chat visibly behaves like an agent instead of a
 * plain text stream. Tool parts are only present on the live, in-flight message
 * — historical messages reloaded from the DB are text-only, so this is silent
 * for past turns.
 */
function ToolActivity({ message }: { message: UIMessage }) {
  const toolParts = (message.parts as ToolUIPart[]).filter(
    (p) => typeof p.type === "string" && p.type.startsWith("tool-"),
  );
  if (toolParts.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {toolParts.map((p, i) => {
        const done = p.state === "output-available";
        const unavailable = done && p.output?.available === false;
        const count = Array.isArray(p.output?.results) ? p.output!.results!.length : 0;
        const label = !done
          ? "Searching the Physics Wallah store…"
          : unavailable
            ? "Book search unavailable"
            : count > 0
              ? `Found ${count} Physics Wallah book${count === 1 ? "" : "s"}`
              : "No Physics Wallah books found";
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm dark:border-white/10 dark:bg-card"
          >
            {done ? <BookOpen className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
            {label}
          </span>
        );
      })}
    </div>
  );
}

function ShowAllPrompts({ profileClass, excluded, onPick }: { profileClass: StudentClass; excluded: string[]; onPick: (q: string) => void }) {
  const all = React.useMemo(() => {
    return getPromptsForClass(profileClass).filter((q) => !excluded.includes(q));
  }, [profileClass, excluded]);
  return (
    <div className="grid gap-2 border-t border-black/10 pt-4 md:grid-cols-2 dark:border-white/10">
      {all.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="rounded-md border border-black/10 bg-white px-4 py-3 text-left text-sm leading-5 shadow-sm transition-colors hover:border-black/20 dark:border-white/10 dark:bg-card dark:hover:border-white/20"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

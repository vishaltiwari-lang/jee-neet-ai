import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { resolveSubmittedMessage } from "@/lib/ai/chat-request";

function textMessage(id: string, role: UIMessage["role"], text: string): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
  };
}

describe("resolveSubmittedMessage", () => {
  it("uses explicit message and removes it from history when it is already appended", () => {
    const messages = [
      textMessage("u1", "user", "first"),
      textMessage("a1", "assistant", "reply to first"),
      textMessage("u2", "user", "second"),
    ];

    const result = resolveSubmittedMessage({ messages, explicitMessage: "second" });

    expect(result.message).toBe("second");
    expect(result.uiHistory.map((message) => message.id)).toEqual(["u1", "a1"]);
  });

  it("uses explicit message without dropping stale previous history", () => {
    const messages = [
      textMessage("u1", "user", "first"),
      textMessage("a1", "assistant", "reply to first"),
    ];

    const result = resolveSubmittedMessage({ messages, explicitMessage: "second" });

    expect(result.message).toBe("second");
    expect(result.uiHistory.map((message) => message.id)).toEqual(["u1", "a1"]);
  });

  it("falls back to the last user message and excludes it from history", () => {
    const messages = [
      textMessage("u1", "user", "first"),
      textMessage("a1", "assistant", "reply to first"),
      textMessage("u2", "user", "second"),
    ];

    const result = resolveSubmittedMessage({ messages });

    expect(result.message).toBe("second");
    expect(result.uiHistory.map((message) => message.id)).toEqual(["u1", "a1"]);
  });

  it("does not duplicate a previous user message when the last item is an assistant", () => {
    const messages = [
      textMessage("u1", "user", "first"),
      textMessage("a1", "assistant", "reply to first"),
    ];

    const result = resolveSubmittedMessage({ messages });

    expect(result.message).toBe("first");
    expect(result.uiHistory).toEqual([]);
  });
});

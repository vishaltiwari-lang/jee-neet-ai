import type { UIMessage } from "ai";

export function uiMessageText(message: Pick<UIMessage, "parts">): string {
  return message.parts
    .filter((part) => (part as { type?: string }).type === "text")
    .map((part) => (part as { text: string }).text)
    .join("");
}

export function resolveSubmittedMessage({
  messages,
  explicitMessage,
}: {
  messages: UIMessage[];
  explicitMessage?: string;
}): { message: string; uiHistory: UIMessage[] } {
  if (explicitMessage?.trim()) {
    const trimmedExplicit = explicitMessage.trim();
    const last = messages[messages.length - 1];
    const lastIsExplicitSubmission =
      last?.role === "user" && uiMessageText(last).trim() === trimmedExplicit;

    return {
      message: explicitMessage,
      uiHistory: lastIsExplicitSubmission ? messages.slice(0, -1) : messages,
    };
  }

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== "user") continue;

    return {
      message: uiMessageText(message),
      uiHistory: messages.slice(0, index),
    };
  }

  return { message: "", uiHistory: messages };
}

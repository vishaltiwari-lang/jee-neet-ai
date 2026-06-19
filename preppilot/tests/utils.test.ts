import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime, truncate } from "@/lib/utils";

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats recent dates relatively", () => {
    vi.setSystemTime(new Date("2026-06-18T12:00:00Z"));
    expect(formatRelativeTime("2026-06-18T10:00:00Z")).toBe("2h ago");
  });

  it("formats older dates with a stable locale-independent label", () => {
    vi.setSystemTime(new Date("2026-06-18T12:00:00Z"));
    expect(formatRelativeTime("2026-06-10T00:00:00Z")).toBe("10 Jun 2026");
  });
});

describe("truncate", () => {
  it("shortens long text", () => {
    expect(truncate("abcdef", 4)).toBe("abcd…");
  });
});

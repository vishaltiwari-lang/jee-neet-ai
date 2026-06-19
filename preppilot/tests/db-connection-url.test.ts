import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "@/lib/db/connection-url";

describe("normalizeDatabaseUrl", () => {
  it("preserves current pg SSL behavior without deprecated sslmode aliases", () => {
    expect(normalizeDatabaseUrl("postgres://user:pass@host/db?sslmode=require")).toBe(
      "postgres://user:pass@host/db?sslmode=verify-full",
    );
  });

  it("leaves explicit verify-full URLs unchanged", () => {
    const url = "postgres://user:pass@host/db?sslmode=verify-full";
    expect(normalizeDatabaseUrl(url)).toBe(url);
  });

  it("ignores invalid URLs", () => {
    expect(normalizeDatabaseUrl("not a url")).toBe("not a url");
  });
});

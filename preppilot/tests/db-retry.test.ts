import { describe, expect, it } from "vitest";
import { isRetryableDbError } from "@/lib/db/retry";

describe("isRetryableDbError", () => {
  it("detects direct network error codes", () => {
    const error = Object.assign(new Error("connect timed out"), { code: "ETIMEDOUT" });
    expect(isRetryableDbError(error)).toBe(true);
  });

  it("detects nested database driver causes", () => {
    const error = Object.assign(new Error("Failed query"), {
      cause: Object.assign(new Error("aggregate timeout"), { code: "ETIMEDOUT" }),
    });
    expect(isRetryableDbError(error)).toBe(true);
  });

  it("detects Neon fetch failures nested under sourceError", () => {
    const error = Object.assign(new Error("Failed query"), {
      cause: Object.assign(new Error("Error connecting to database"), {
        sourceError: new TypeError("fetch failed"),
      }),
    });
    expect(isRetryableDbError(error)).toBe(true);
  });

  it("does not hide non-network errors", () => {
    expect(isRetryableDbError(new Error("syntax error at or near select"))).toBe(false);
  });
});

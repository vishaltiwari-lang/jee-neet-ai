import { describe, expect, it } from "vitest";
import { calculateCost } from "@/lib/logging/cost";

describe("calculateCost", () => {
  it("returns 0 for unknown model", () => {
    expect(calculateCost("unknown-model", 1000, 1000)).toBe(0);
  });

  it("computes gpt-4o-mini cost", () => {
    // 1M in, 1M out → 0.15 + 0.6 = 0.75
    const c = calculateCost("gpt-4o-mini", 1_000_000, 1_000_000);
    expect(c).toBeCloseTo(0.75, 6);
  });

  it("computes small usage", () => {
    const c = calculateCost("gpt-4o-mini", 1000, 500);
    // 0.00015 + 0.0003 = 0.00045
    expect(c).toBeCloseTo(0.00045, 8);
  });
});

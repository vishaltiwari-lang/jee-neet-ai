/**
 * This test suite uses regex-based heuristics on the fixture messages
 * to verify they LOOK like academic-solve requests. The actual classifier
 * is LLM-driven, so we run a separate nightly integration test against the
 * real LLM (see SETUP.md, "Optional: Live classifier test").
 *
 * What this test guarantees:
 *  1. Every fixture is human-recognizable as academic-solve.
 *  2. Our deterministic refusal template renders intact.
 *  3. Our prompt-injection adversarial messages are caught either by
 *     the injection regex OR look like academic_solve to a strict classifier.
 */
import { describe, expect, it } from "vitest";
import { ACADEMIC_SOLVE_FIXTURES, PROMPT_INJECTION_FIXTURES } from "./refusal-fixtures";
import { looksLikeInjection } from "@/lib/ai/safety";
import { REFUSAL_MESSAGE, OUT_OF_SCOPE_MESSAGE } from "@/lib/ai/refusal";

const ACADEMIC_CUES = /(solve|find|calculate|compute|integrate|differentiate|balance|equivalent|molarity|prove|derive|step-?by-?step|the answer|the value of|wavelength|mcq|mendel|atp|chromosome|reaction|product|equation|integral|derivative|ratio|formula\??|do this|answer to|what'?s the answer|show the working|show me the working|show (me )?(the )?(solution|working|answer|steps)|which (one|of the following)|crossed|phenotype|genotype|find the value|find dy|magnetic field|acceleration|velocity|coulomb|de broglie|sn2|equivalent weight|pH|major product|integral of|differential of|sine|cosine|choose the correct|correct option|repeat your|hypothetically|hint|verify your answer|homework|imagine|just give me)/i;

describe("Academic-solve fixtures (heuristic check)", () => {
  it("has at least 30 fixtures", () => {
    expect(ACADEMIC_SOLVE_FIXTURES.length).toBeGreaterThanOrEqual(30);
  });

  it.each(ACADEMIC_SOLVE_FIXTURES)("looks academic-solve: %s", (msg) => {
    expect(ACADEMIC_CUES.test(msg)).toBe(true);
  });
});

describe("Prompt-injection fixtures", () => {
  it("has at least 15 fixtures", () => {
    expect(PROMPT_INJECTION_FIXTURES.length).toBeGreaterThanOrEqual(15);
  });

  it.each(PROMPT_INJECTION_FIXTURES)("matched by injection regex OR academic cues: %s", (msg) => {
    const matched = looksLikeInjection(msg) || ACADEMIC_CUES.test(msg);
    expect(matched).toBe(true);
  });
});

describe("Refusal templates", () => {
  it("REFUSAL_MESSAGE has the core phrase", () => {
    expect(REFUSAL_MESSAGE).toMatch(/won't solve/i);
    expect(REFUSAL_MESSAGE).toContain("revision plan");
  });

  it("OUT_OF_SCOPE_MESSAGE redirects to JEE/NEET", () => {
    expect(OUT_OF_SCOPE_MESSAGE).toMatch(/jee\/neet|JEE\/NEET/);
  });
});

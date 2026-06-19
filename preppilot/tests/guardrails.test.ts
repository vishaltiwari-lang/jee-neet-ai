import { describe, expect, it } from "vitest";
import { containsRawToolCall, validateOutput } from "@/lib/ai/guardrails";

describe("validateOutput", () => {
  it.each([
    "Therefore, x = 5",
    "Answer: 12.5 m/s",
    "Hence, the final velocity = 9.81 m/s²",
    "So we get x = -3",
    "Finally: 25 kg",
    "Step 1: do this\nStep 2: do that\nStep 3: arrive at 42",
    "\\boxed{42}",
    "\\frac{3}{4}",
  ])("rejects mathematical answer-like output: %s", (text) => {
    const r = validateOutput(text);
    expect(r.ok).toBe(false);
  });

  it.each([
    "Here is a 2-week revision plan for Physics:\n## Week 1\n- Day 1: Kinematics theory",
    "I'd suggest you start with NCERT and then move to HC Verma.",
    "Build a daily routine: 2 hours theory, 2 hours problems.",
    "Your mock score improving isn't about more hours but better question selection.",
    "## Week 1\n- Day 1: revisit chapter X\n- Day 2: revise chapter Y",
  ])("allows planning/strategy content: %s", (text) => {
    const r = validateOutput(text);
    expect(r.ok).toBe(true);
  });

  it("rejects raw tool-call markup", () => {
    const text = '<tool_call> {"name":"searchPwBooks","arguments":{"query":"rotational motion"}} </tool_call>';
    expect(containsRawToolCall(text)).toBe(true);
    expect(validateOutput(text)).toEqual({ ok: false, reason: "raw_tool_call" });
  });
});

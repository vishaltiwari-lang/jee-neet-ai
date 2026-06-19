/**
 * Output validator: rejects assistant messages that look like they're solving
 * an academic problem (final numeric answers, "Therefore = X", LaTeX answer
 * blocks, balanced chemical equations with explicit coefficients, etc.).
 *
 * This is the second line of defense after the intent classifier.
 */

const ANSWER_PATTERNS: RegExp[] = [
  // "Hence, the final velocity = 9.81" / "Therefore, x = 5" / "So we get x = -3"
  /\b(answer|ans|hence|therefore|so we get|so we have|finally|finally we get)\b[^\n=]{0,60}=\s*[-+]?\d+(\.\d+)?/i,
  // Stand-alone "Answer: 12.5 m/s" or "Ans = 25 kg" or "Finally: 25 kg"
  /(^|\n)\s*(answer|ans|finally)\s*[:=]\s*[-+]?\d+(\.\d+)?/i,
  // x = 5, y = -3 — single-letter variable assignment
  /(^|\s)[a-z]\s*=\s*[-+]?\d+(\.\d+)?\b/i,
  /\\boxed\{[^}]+\}/,
  /\\frac\{\s*-?\d+\s*\}\{\s*-?\d+\s*\}/,
  /step\s*1\s*:\s*[\s\S]+step\s*2\s*:\s*[\s\S]+step\s*3\s*:/i,
];

const ACCEPTABLE_CONTEXT = [
  /plan|schedule|strategy|approach|revision|topic|chapter|week|mistake|mock|attempt/i,
];

const RAW_TOOL_CALL_PATTERNS: RegExp[] = [
  /<\s*\/?\s*tool_call\b/i,
  /<\s*\/?\s*function_call\b/i,
  /"name"\s*:\s*"searchPwBooks"/i,
  /\bsearchPwBooks\b/i,
];

export type GuardrailResult = { ok: true } | { ok: false; reason: string };

export function containsRawToolCall(text: string): boolean {
  return RAW_TOOL_CALL_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateOutput(text: string): GuardrailResult {
  if (containsRawToolCall(text)) {
    return { ok: false, reason: "raw_tool_call" };
  }

  for (const pattern of ANSWER_PATTERNS) {
    if (pattern.test(text)) {
      const ctxIsPlanning = ACCEPTABLE_CONTEXT.some((p) => p.test(text));
      if (!ctxIsPlanning) {
        return { ok: false, reason: `matched ${pattern}` };
      }
    }
  }
  return { ok: true };
}

// Pricing per 1M tokens. Update if model changes.
// Kept separate from the DB-using logging so it's importable in unit tests.
const PRICE_PER_1M = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 5, output: 15 },
  "anthropic/claude-sonnet-4.6": { input: 3, output: 15 },
  "anthropic/claude-sonnet-4.5": { input: 3, output: 15 },
} as const;

export function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = (PRICE_PER_1M as Record<string, { input: number; output: number }>)[model];
  if (!p) return 0;
  return (tokensIn / 1_000_000) * p.input + (tokensOut / 1_000_000) * p.output;
}

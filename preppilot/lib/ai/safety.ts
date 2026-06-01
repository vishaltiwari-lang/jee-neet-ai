const SELF_HARM_PATTERNS = [
  /kill\s*my\s*self/i,
  /killing\s*my\s*self/i,
  /kms\b/i,
  /suicid/i,
  /end\s*it\s*all/i,
  /end\s*my\s*life/i,
  /(don'?t|do not)\s+want\s+to\s+live/i,
  /no\s+point\s+(in\s+)?living/i,
  /(want|wanna)\s+to\s+die/i,
  /hurt(ing)?\s+my\s*self/i,
  /cut(ting)?\s+my\s*self/i,
  /self[-\s]*harm/i,
  /(jump\s+off|hang\s+myself)/i,
];

export function detectSelfHarm(message: string): boolean {
  const normalized = message.toLowerCase();
  return SELF_HARM_PATTERNS.some((p) => p.test(normalized));
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now\s+/i,
  /(forget|disregard)\s+(your|all|the)\s+(rules|instructions|guidelines)/i,
  /\bsystem\s*:\s*/i,
  /\[\s*system\s*\]/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /roleplay\s+as/i,
  /act\s+as\s+(a\s+)?(jee|neet|physics|chemistry|math|biology|chem|maths)\b[\s\w]*?(tutor|teacher|solver)/i,
  /from\s+now\s+on[,\s]+solve/i,
  /show\s+(me\s+)?(the\s+)?(solution|working|steps|answer)/i,
  /pretend\s+(this|that)\s+(is|was)/i,
];

export function looksLikeInjection(message: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(message));
}

export function stripInjectionPreamble(message: string): string {
  let m = message;
  for (const p of INJECTION_PATTERNS) {
    m = m.replace(p, "[redacted-instruction] ");
  }
  return m;
}

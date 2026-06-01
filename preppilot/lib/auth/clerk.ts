const PLACEHOLDER_PREFIXES = [
  "pk_test_xxx",
  "pk_live_xxx",
  "sk_test_xxx",
  "sk_live_xxx",
  "pk_test_placeholder",
  "sk_test_placeholder",
  "sk_test_local",
];

const PLACEHOLDER_PUBLISHABLE_KEYS = new Set(["pk_test_aGVsbG8uY29tJA=="]);

function isHelloPlaceholderPublishableKey(value: string): boolean {
  if (!value.startsWith("pk_")) return false;
  if (value.includes("aGVsbG8uY29t")) return true;
  const parts = value.split("_");
  const encodedDomain = parts[2];
  if (!encodedDomain) return false;
  try {
    const normalized = encodedDomain.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    return decoded.includes("hello.com");
  } catch {
    return false;
  }
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (PLACEHOLDER_PUBLISHABLE_KEYS.has(trimmed)) return true;
  if (isHelloPlaceholderPublishableKey(trimmed)) return true;
  return PLACEHOLDER_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export function isClerkConfigured(): boolean {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  return !isPlaceholder(publishableKey) && !isPlaceholder(secretKey);
}

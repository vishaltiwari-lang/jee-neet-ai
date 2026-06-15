type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
};

const RETRYABLE_CODES = new Set([
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ECONNRESET",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function getErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const e = error as Error & {
    code?: string;
    cause?: { code?: string };
    sourceError?: { code?: string; cause?: { code?: string } };
  };
  return e.code ?? e.cause?.code ?? e.sourceError?.code ?? e.sourceError?.cause?.code;
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "";
  const e = error as Error & { sourceError?: { message?: string } };
  return `${e.message ?? ""} ${e.sourceError?.message ?? ""}`.toLowerCase();
}

export function isRetryableDbError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code && RETRYABLE_CODES.has(code)) return true;
  const message = getErrorMessage(error);
  return (
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("connection")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 200;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableDbError(error) || attempt === attempts) {
        throw error;
      }
      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError;
}

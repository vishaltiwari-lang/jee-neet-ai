type AiErrorSummary = {
  name: string;
  message: string;
  statusCode?: number;
  code?: string | number;
  url?: string;
  retryable?: boolean;
};

const AUTH_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

let disabledUntil = 0;
let disabledReason = "";

export function summarizeAiError(error: unknown): AiErrorSummary {
  if (!(error instanceof Error)) {
    return { name: "Error", message: String(error) };
  }

  const e = error as Error & {
    statusCode?: number;
    url?: string;
    isRetryable?: boolean;
    data?: { error?: { message?: string; code?: string | number } };
  };

  return {
    name: e.name,
    message: e.data?.error?.message ?? e.message,
    statusCode: e.statusCode,
    code: e.data?.error?.code,
    url: e.url,
    retryable: e.isRetryable,
  };
}

export function noteAiProviderFailure(error: unknown): AiErrorSummary {
  const summary = summarizeAiError(error);
  if (summary.statusCode && [401, 402, 403].includes(summary.statusCode)) {
    disabledUntil = Date.now() + AUTH_FAILURE_COOLDOWN_MS;
    disabledReason = `${summary.statusCode} ${summary.message}`;
  }
  return summary;
}

export function aiProviderCircuitOpen(): boolean {
  return Date.now() < disabledUntil;
}

export function getAiProviderCircuitReason(): string {
  return disabledReason;
}


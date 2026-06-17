const STRICT_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function normalizeDatabaseUrl(databaseUrl: string | undefined): string | undefined {
  if (!databaseUrl) return databaseUrl;

  try {
    const url = new URL(databaseUrl);
    const sslmode = url.searchParams.get("sslmode");

    if (sslmode && STRICT_SSL_MODES.has(sslmode)) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    return databaseUrl;
  }

  return databaseUrl;
}

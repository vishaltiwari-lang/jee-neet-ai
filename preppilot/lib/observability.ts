/**
 * Thin observability shim. Sentry and PostHog are optional at runtime —
 * the app works without them. If you want full observability, install the
 * Sentry wizard (`npx @sentry/wizard@latest -i nextjs`) and follow Phase 5 of
 * the checklist.
 */

export function captureException(err: unknown, context?: Record<string, unknown>) {
  console.error("[exception]", err, context);
  // Replace with: Sentry.captureException(err, { extra: context }) once installed.
}

export function trackEvent(event: string, props: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[event] ${event}`, props);
  }
  // Replace with: posthog.capture(event, props) once installed.
}

# E2E tests

These run against the deployed app or a local `next build && next start`.

## Setup

1. Install Playwright browsers (one time):
   ```bash
   npx playwright install chromium
   ```

2. Run against local prod build:
   ```bash
   npm run build
   npm run start          # in a separate terminal
   npx playwright test
   ```

3. Run against a deployed URL:
   ```bash
   PLAYWRIGHT_BASE_URL=https://preppilot.vercel.app npx playwright test
   ```

## Authenticated flows

Most useful flows (onboarding, chat, plans) require Clerk sign-in. For CI:
- Use [Clerk's testing tokens](https://clerk.com/docs/testing/playwright/overview).
- Add `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for a **development** Clerk app to CI secrets.
- Add a script under `e2e/auth.setup.ts` that creates a test user and saves the auth state to `playwright/.auth/user.json`.

The included `landing.spec.ts` exercises only public pages — extend with auth-aware specs once you have a dev Clerk app wired up.

# SETUP — From zero to deployed

This walks you through every account you need and every env var to set, in order.

## Prerequisites

- Node 20+ (you have 22.22)
- npm 10+
- A GitHub account
- A credit card (Vercel + OpenAI need one; Clerk/Neon/Upstash have free tiers)

## 1. Local install

```bash
cd preppilot
npm install
cp .env.example .env.local
```

Leave `.env.local` open; we'll fill it in below.

## 2. Clerk (auth)

1. Go to [clerk.com](https://clerk.com) and create an application.
2. **Sign-in options:** enable **Google**.
3. In **API Keys**, copy:
   - `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret key` → `CLERK_SECRET_KEY`
4. We'll add the webhook secret in step 8.

## 3. Neon (Postgres)

1. Go to [neon.tech](https://neon.tech) → create a project.
2. Copy the **pooled** connection string → `DATABASE_URL`.
3. Run the migration:
   ```bash
   npm run db:push
   ```
   (For prod we recommend `npm run db:generate && npm run db:migrate` so migrations are versioned.)

## 4. Upstash Redis (rate limit)

1. Go to [upstash.com](https://upstash.com) → create a Redis database (Global is fine).
2. Copy:
   - REST URL → `UPSTASH_REDIS_REST_URL`
   - REST Token → `UPSTASH_REDIS_REST_TOKEN`

Optional: skip this for local dev. The app no-ops rate limits when keys are missing.

## 5. OpenAI

1. Go to [platform.openai.com](https://platform.openai.com) → create an API key.
2. Set a **monthly spending limit** (we recommend $50 to start).
3. Paste the key into `OPENAI_API_KEY`.
4. Default model is `gpt-4o-mini` for both classifier and main chat — change with `OPENAI_CHAT_MODEL` / `OPENAI_CLASSIFIER_MODEL` if needed.

## 6. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in with Google, complete onboarding, send a message. Confirm:
- Strategy questions → real reply
- Academic numericals → refusal template
- Out-of-scope ("write me a poem") → redirect message

## 7. Push to GitHub + connect Vercel

1. Create a GitHub repo, push the code.
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo.
3. Framework preset: Next.js. Don't deploy yet.

## 8. Vercel env vars

Add **every** key from `.env.example` to **Production** AND **Preview** environments in Vercel. Then:

1. Get your Vercel domain (e.g. `preppilot.vercel.app`).
2. In Clerk dashboard → **Webhooks** → **Add endpoint**:
   - URL: `https://<your-vercel-domain>/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing secret** → `CLERK_WEBHOOK_SECRET` in Vercel
3. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL.
4. Optional: Add your own Clerk user ID to `ADMIN_USER_IDS` for the `/admin` panel.

## 9. Deploy

1. Trigger a deploy on Vercel (push to `main` or click "Redeploy").
2. Once deployed, visit the URL and run the smoke test from step 6.

## 10. Production migration

For ongoing schema changes:
```bash
npm run db:generate       # produces SQL diff in lib/db/migrations
npm run db:migrate        # applies it
```

Or add a GitHub Action that runs `db:migrate` on push to `main` (see `.github/workflows/ci.yml`).

## Optional: Sentry + PostHog

The app currently has shim functions in `lib/observability.ts`. To enable full observability:

### Sentry
```bash
npx @sentry/wizard@latest -i nextjs
```
Then replace the stub in `lib/observability.ts` with real `Sentry.captureException` calls.

### PostHog
1. Create a PostHog project at [posthog.com](https://posthog.com).
2. Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to Vercel env.
3. Wire up `posthog-js` in `components/providers.tsx` and `posthog-node` in `lib/observability.ts`.

## Optional: live classifier test

To verify the bot actually refuses every academic question in CI, write a nightly test that:
1. Reads `tests/refusal-fixtures.ts`.
2. Calls `classifyIntent()` against the real OpenAI key.
3. Asserts every fixture is labeled `academic_solve`.

Add it to `.github/workflows/nightly.yml` with `OPENAI_API_KEY` as a secret.

## Troubleshooting

- **Build hangs:** Clerk middleware requires `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` at build time. Make sure it's set.
- **`Webhook secret not configured`:** add `CLERK_WEBHOOK_SECRET` from the Clerk dashboard.
- **Streaming hangs:** check OpenAI key is valid, monthly cap not exceeded, model name correct.
- **Rate limit always 429:** Upstash Redis might be down or keys wrong; check Upstash console.
- **DB connection errors:** ensure `DATABASE_URL` is the **pooled** Neon URL (ends in `-pooler`).

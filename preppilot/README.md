# PrepPilot

AI study-planning mentor for JEE and NEET aspirants. Built with Next.js 14 (App Router), TypeScript, Tailwind, Clerk, Neon Postgres, Drizzle ORM, Vercel AI SDK, OpenAI, and Upstash Redis. Deploys to Vercel.

**Core rule:** PrepPilot is a strategy mentor, not a teacher. It refuses to solve numericals, MCQs, derivations, or chapter exercises — the refusal is **deterministic** (template), not LLM-decided.

## Quick start

1. Read [`SETUP.md`](./SETUP.md) for account creation + env var setup.
2. Install deps:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in keys.
4. Run DB migrations:
   ```bash
   npm run db:push
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack off) |
| `npm run build` | Production build |
| `npm run start` | Run prod build locally |
| `npm run typecheck` | TypeScript-only check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests (120 tests, ~1s) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright E2E (needs `npx playwright install` once) |
| `npm run db:generate` | Generate a Drizzle migration from schema diff |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push schema directly (dev only) |
| `npm run db:studio` | Open Drizzle Studio |

## Layout

```
app/                        Next.js App Router pages
  api/                      Route handlers (chat, profile, onboarding, plans, admin, webhooks)
  chat/                     Authenticated chat UI
  onboarding/               3-variant onboarding flow
  plans/, profile/, admin/  Other authenticated pages
components/                 React components (UI primitives + features)
lib/
  ai/                       Prompts, classifier, guardrails, safety, refusal, orchestrator, summary
  db/                       Drizzle schema + client
  services/                 Profile, conversation, plan CRUD services
  validation/               Zod schemas
  constants/                Suggested prompt lists (per class)
  ratelimit.ts              Upstash-backed rate limits
  logging.ts                Usage / refusal / flag logs
  auth/                     Admin role checks
proxy.ts                    Clerk auth proxy
tests/                      Vitest unit tests (incl. refusal + injection fixtures)
e2e/                        Playwright specs
drizzle.config.ts           Drizzle Kit config
```

## How the bot works

When a user sends a message:

1. **Self-harm regex check** — if matched, flag the conversation, surface helpline.
2. **Rate limits** — Upstash (50/day, 5/min).
3. **Persist user message.**
4. **Intent classifier** (cheap LLM call): one of `academic_solve | plan_request | strategy | motivation | clarification | out_of_scope`.
5. **If `academic_solve` or `out_of_scope`** → return deterministic template, **never** call main LLM. Log to `refusal_logs`.
6. **Else** → build personalized system prompt (profile + rolling summary), stream from main LLM.
7. **Guardrails** validate output; if math-answer-shaped slipped through, replace with refusal template.
8. **Log** tokens, latency, cost. Update rolling summary every 20 messages.

See `context/` (parent directory) for the full architecture pack.

## Prompt engineering & syllabus boundary

The planner now uses a strict syllabus knowledge base generated from exam PDFs.

- KB file: `lib/knowledge/syllabus-kb.json`
- Runtime helpers: `lib/knowledge/syllabus.ts`
- Prompt integration: `buildSystemPrompt()` adds a **SYLLABUS KNOWLEDGE BASE (STRICT BOUNDARY)** section before model generation.
- Runtime enforcement: when a user asks for a topic that does not match loaded syllabus units, orchestrator returns a deterministic "outside loaded syllabus" response instead of generating a plan.

For the current setup, the KB is built from local PDFs in `../syllabuspdf/` (`jeesyllabus.pdf`, `neetsyllabus.pdf`) and mapped to:

- `jee_main`, `jee_advanced` → Math/Physics/Chemistry units
- `neet` → Physics/Chemistry/Biology units

## Refusal — by design

PrepPilot will not solve a JEE Advanced numerical, balance a chemistry equation, or pick an MCQ option. This is intentional: at JEE/NEET difficulty, LLMs are wrong often enough that any "solving" feature would actively mislead students. Use Doubtnut, PhysicsWallah, or your coaching for doubts; come here for plans, strategy, and motivation.

## Tests

```bash
npm run test
```

Includes:
- Schema validation
- Prompt builder snapshots
- Safety (self-harm, prompt injection regex)
- Guardrails (output validator)
- Cost calculator
- 35+ academic-solve fixtures
- 20+ prompt-injection fixtures
- Refusal template constants

A nightly CI job should run a **live classifier test** against the real LLM to confirm refusal behaviour end-to-end (see `SETUP.md`).

## Deploy

See `SETUP.md` for full deploy instructions. TL;DR:
1. Push to GitHub.
2. Connect to Vercel.
3. Set env vars from `.env.example`.
4. Set Clerk webhook URL to `https://<your-domain>/api/webhooks/clerk`.
5. Run `npm run db:push` against prod DB once.

## License

Private / unreleased.

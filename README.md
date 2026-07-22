# starter-stack

Reusable full-stack boilerplate: Next.js 16 + Supabase + Drizzle + Zod.

| Layer         | Tech                                                              |
| ------------- | ----------------------------------------------------------------- |
| Frontend      | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 |
| Database      | Supabase (PostgreSQL)                                             |
| Auth          | Supabase Auth (`@supabase/ssr`, cookie-based sessions)            |
| ORM           | Drizzle ORM + drizzle-kit migrations                              |
| Validation    | Zod v4                                                            |
| Server state  | TanStack Query v5 (API data: caching, mutations)                  |
| Client state  | Zustand (UI-only state: modals, sidebar, filters)                 |
| API docs      | OpenAPI 3.1 (`zod-openapi`) + Scalar (`/api/docs`)                |
| Testing       | Vitest (unit tests, colocated `*.test.ts`)                        |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`), optional                    |
| Code quality  | ESLint + Prettier + Husky/lint-staged pre-commit                  |
| CI            | GitHub Actions — typecheck/lint/test + PR description bot         |

## Quick start

1. `npm install`
2. Create a [Supabase](https://supabase.com) project, copy env, fill in values:

   ```bash
   cp .env.example .env.local   # .env also works
   ```

   | Variable                                    | Value                                                 |
   | ------------------------------------------- | ----------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` | Dashboard → Project Settings → API                    |
   | `DATABASE_URL`                              | **Transaction pooler** URL (port 6543) — app runtime  |
   | `DIRECT_URL`                                | **Session pooler** URL (port 5432) — drizzle-kit only |

   Don't swap the pooler ports: migrations fail through the transaction
   pooler (no prepared statements — the app client runs `prepare: false`
   for the same reason), and the "direct connection" URL is IPv6-only.

3. Configure Supabase Auth (Dashboard → Authentication):
   - **URL Configuration → Redirect URLs**: add
     `http://localhost:3000/api/auth/callback` (+ production URL later).
     Confirmation and recovery emails bounce without this.
   - **Production**: configure the **Send Email Hook** (Dashboard →
     Authentication → Hooks) to point at `/api/auth/email-hook`, using the
     `SEND_EMAIL_HOOK_SECRET` from `.env.example`. Confirm/recovery emails
     are then rendered by this app (`src/emails/confirm-signup-email.tsx`,
     `reset-password-email.tsx`) and sent via Resend instead of Supabase's
     dashboard-edited templates.
   - **Local dev**: keeps using Supabase's built-in sender (unchanged) —
     it's rate-limited (~2/hour), slow, spam-prone, and the hook isn't
     reachable from Supabase's servers against `localhost`, so this is
     prod-only by design.

4. Apply the bundled example schema — or remove it first (see
   [Removing the example](#removing-the-profiles-example)):

   ```bash
   npm run db:migrate   # applies migrations + runs the RLS guardrail
   ```

5. `npm run dev` — sign up at `/signup`, confirm via email, land on `/dashboard`.

## Architecture

Strict one-direction flow. Each layer only talks to the layer below it.

```
page / client component
        │  TanStack Query hooks (src/hooks) → api wrapper (src/lib/api/client.ts)
        ▼
route handler (src/app/api/**)     ← auth check + Zod validation only
        │
        ▼
service (src/services/**)          ← all business logic
        │
        ▼
db (src/db, Drizzle)  /  Supabase
```

**Rules:**

- **Frontend never imports services or `db`.** It calls `/api/**` through the `api` wrapper only.
- **Route handlers stay thin**: authenticate (Supabase), validate input (Zod), delegate to a service, wrap the result with `apiSuccess` / `apiError`.
- **Services own business logic and DB access.** They never touch `Request` / `Response` / cookies.
- **All API routes return the `ApiResponse<T>` envelope** (`src/types/api.ts`) — except `/api/openapi.json`, which returns the raw spec for external tooling.
- **Server state vs client state**: API data lives in TanStack Query (via `src/hooks`); UI-only state in Zustand stores (`src/stores`). Never mirror API data into a store.

## API docs

- `/api/docs` — interactive reference (Scalar UI).
- `/api/openapi.json` — the generated OpenAPI 3.1 spec, raw JSON (deliberately not wrapped in `ApiResponse<T>`).

Hand-maintained in `src/lib/api/openapi.ts`, not derived from route files — when you add/change an endpoint, add `.meta({ description, example })` to its validator fields and update the matching path entry there. Both routes are public/unauthenticated by design (dev tooling); gate them before a production launch that shouldn't expose the API surface.

## Rate limiting

`src/proxy.ts` rate-limits every `/api/**` request per IP before it reaches
the route handler (pages aren't limited — abuse happens through `/api`, not
navigation).

- **Default**: 60 req/min per IP. **Override**: `/api/auth/*` → 10 req/min.
- Backed by Upstash Redis (`src/lib/rate-limit.ts`) — REST-based, so it works from Edge middleware.
- **Optional and lazy**: without `UPSTASH_REDIS_REST_URL`/`TOKEN` (see `.env.example`), requests always pass — no Upstash account needed to run the app.
- Blocked requests log via `console.warn` (visible in your host's function logs) instead of an analytics dashboard.
- To add a stricter route, extend the `overrides` array in `src/lib/rate-limit.ts` (mirrors `protectedPrefixes` in `src/lib/supabase/proxy.ts`).

## Testing

Vitest, pure Node (no jsdom/Testing Library yet). Tests are colocated:
`thing.ts` → `thing.test.ts`.

```bash
npm test         # run once
npm run test:watch
```

- Covers only pure logic — Zod validators (`src/validators`) and framework-free helpers (`src/lib/api/response.ts`).
- Services/routes touch Drizzle/Supabase and are untested on purpose: no dedicated test database, and mocking Drizzle would give false confidence. Prefer a local Supabase CLI instance over mocks if that changes.

## Code quality

Prettier (`printWidth: 100`) + ESLint.

```bash
npm run format         # write
npm run format:check   # check only
```

Pre-commit (`.husky/pre-commit`, Husky + lint-staged):

1. `eslint --fix` + `prettier --write` on staged files.
2. `npm run typecheck` — whole project (type errors can't be scoped to staged files).

Tests are excluded on purpose — kept fast locally; they run in CI instead.

## CI

`.github/workflows/`:

- **`ci.yml`** — every PR + push to `main`: `npm ci` → typecheck → lint → test. The real verification gate; enable "require status checks" in branch protection to block merges on it.
- **`pr-description-bot.yml`** — regenerates the PR description from the diff via Gemini (on open/reopen/ready-for-review/new commits, or a `/describe` comment). Needs a `GEM_KEY` repo secret. Doesn't work on fork PRs — GitHub withholds secrets and write access from fork-triggered runs.

## Project structure

```
src/
├── app/                  # Routes, layouts — frontend only
│   ├── (auth)/           # Login, signup, forgot/reset password (route group)
│   ├── dashboard/        # Example protected page
│   ├── error.tsx         # Error boundary (wire Sentry etc. here)
│   ├── global-error.tsx  # Root-layout error fallback (self-contained)
│   ├── not-found.tsx     # 404
│   └── api/              # Route handlers only — no UI under api/
│       ├── auth/         # callback (code exchange) + logout
│       ├── docs/         # Scalar interactive API reference UI
│       ├── openapi.json/ # generated OpenAPI 3.1 spec (raw JSON, no envelope)
│       └── profile/      # example: GET/PATCH /api/profile
├── components/
│   ├── ui/               # Generic primitives (buttons, inputs, ...)
│   └── shared/           # Composed, app-specific components
├── hooks/                # React hooks (use-*.ts), incl. TanStack Query hooks
├── stores/               # Zustand stores (*.store.ts) — client-only UI state
├── lib/
│   ├── api/              # client.ts (fetch wrapper) + response.ts (envelope helpers) + openapi.ts (spec builder)
│   ├── query/            # QueryClient provider (wired in app/layout.tsx)
│   ├── supabase/         # client.ts (browser), server.ts (RSC/routes), proxy.ts (session refresh)
│   └── env.ts            # Zod-validated env vars (server only, lazy)
├── services/             # Business logic (*.service.ts)
├── validators/           # Zod schemas (*.validator.ts) — input source of truth
├── types/                # Shared TS types (api.ts envelope, ...)
├── db/
│   ├── index.ts          # Drizzle client (postgres.js, pooler-safe, lazy)
│   ├── schema/           # Table definitions (one file per table)
│   └── migrations/       # drizzle-kit output — only edit --custom migrations
└── proxy.ts              # Next.js 16 proxy, ex-middleware (auth session refresh)
```

Outside `src/`: `scripts/` (RLS guardrail + auth debug), `drizzle.config.ts`
(schema path, migration dir, `DIRECT_URL`).

The `profiles` table + validator + service + route + hook are a working
reference implementation of the layering — replace per project.

## Auth

Working end-to-end: signup → email confirm (`/api/auth/callback`) → login →
protected `/dashboard` → logout.

- **Password recovery**: `/forgot-password` emails a link that lands on
  `/reset-password` (via the callback's `next` param) with a recovery session.
- **Email verification**: enforced by Supabase (unconfirmed users can't sign
  in). Login and signup offer a resend button; login surfaces callback errors
  (e.g. expired links) from `?error=`.
- **Route protection**: `src/proxy.ts` redirects unauthenticated hits on
  `protectedPrefixes` (extend per project); pages still check `getUser()`
  themselves — defense in depth.
- **Layering exception**: auth pages, plus `/api/auth/callback` and
  `/api/auth/logout`, call Supabase Auth directly via the SDK (it manages
  its own cookies) and skip the service/`ApiResponse` pattern — they're
  redirect-driven browser navigations, not JSON API calls. App data still
  always goes through `/api` with the full service/`ApiResponse` pattern.
  `/api/auth/email-hook` is also outside the normal pattern, but as an
  inbound webhook from Supabase (signature-verified, not
  session-authenticated) rather than a browser navigation.
- **Signup → profile**: a Postgres trigger (`0001_auth-trigger-and-rls.sql`)
  auto-creates a `profiles` row for each new auth user.

## Security model

Drizzle connects as `postgres` and **bypasses RLS** — authorization lives in
route handlers (`getUser()` + user-scoped queries). Every table must still
`ENABLE ROW LEVEL SECURITY` (no policies needed) to lock Supabase's
auto-generated REST API (`/rest/v1`) away from the anon key. Enforced
automatically: `db:migrate` runs the RLS guardrail (`scripts/verify-db.mjs`)
and fails if any public table has RLS disabled.

## Database workflow

Define tables in `src/db/schema/` (one file per table, export from
`schema/index.ts`), then:

```bash
npm run db:generate -- --name=create-things   # name it, or drizzle-kit invents one
npm run db:migrate                            # apply + RLS guardrail
```

Every new table's migration must include:

```sql
ALTER TABLE "things" ENABLE ROW LEVEL SECURITY;
```

For SQL that can't be derived from the TS schema (triggers, RLS, functions),
create a custom migration: `npx drizzle-kit generate --custom --name=...`.

### Removing the profiles example

Auth does not depend on `profiles` — identity lives in `auth.users` + cookies.
To start a project with a clean schema, delete the example slice:

```
src/db/schema/profiles.ts            # + remove its export from schema/index.ts
src/db/migrations/0000_*.sql, 0001_*.sql, 0002_*.sql, meta/   # keep the migrations dir
src/validators/profile.validator.ts
src/services/profile.service.ts
src/app/api/profile/
src/hooks/use-profile.ts
```

Also delete `src/emails/welcome-email.tsx` (not the whole `src/emails/`
directory — `confirm-signup-email.tsx`/`reset-password-email.tsx` don't
depend on `profiles`) and the `sendWelcome` method from
`src/services/email.service.ts` (not the whole file — `sendConfirmSignup`/
`sendResetPassword` stay, since removing `profiles` doesn't remove
Supabase Auth).

Then:

- Edit `src/app/api/auth/callback/route.ts` to drop `sendWelcomeOnce` and its two service imports.
- Remove the `/api/profile` path entry and `profileResponseSchema` from `src/lib/api/openapi.ts` — otherwise the generated spec references a deleted endpoint.
- Only delete migrations never applied to a live database; otherwise drop the objects first (`DROP TABLE profiles; DROP FUNCTION public.handle_new_user CASCADE;`) or reset the database.
- To bring a companion table back later, reuse the pattern in `0001_auth-trigger-and-rls.sql`: FK to `auth.users(id) ON DELETE CASCADE`, RLS enabled, `AFTER INSERT ON auth.users` trigger.

## Adding a new resource

1. **Schema** — `src/db/schema/things.ts`, export from `schema/index.ts`, `db:generate` + `db:migrate`.
2. **Validator** — `src/validators/thing.validator.ts` (Zod schemas + inferred input types).
3. **Service** — `src/services/thing.service.ts` (business logic, Drizzle queries).
4. **Route** — `src/app/api/things/route.ts` (auth → validate → service → respond).
5. **Hook** — `src/hooks/use-thing.ts` (`useQuery`/`useMutation` wrapping the `api` client).
6. **Frontend** — components consume the hook; UI in `app/` + `components/`. UI-only state goes in `src/stores` if it crosses component trees.
7. **Docs** — register the endpoint in `src/lib/api/openapi.ts` (not auto-derived from the route file).

## Scripts

| Script                    | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `dev` / `build` / `start` | Next.js                                                    |
| `lint` / `typecheck`      | ESLint / `tsc --noEmit`                                    |
| `test` / `test:watch`     | Vitest — run once / watch mode                             |
| `format` / `format:check` | Prettier — write / check-only                              |
| `db:generate`             | Generate migration from schema diff                        |
| `db:migrate`              | Run pending migrations, then RLS guardrail                 |
| `db:verify`               | RLS guardrail — fails if any public table has RLS disabled |
| `db:auth-users`           | Debug: list recent signups + email confirmation status     |
| `db:push`                 | Push schema directly (prototyping only)                    |
| `db:studio`               | Drizzle Studio data browser                                |

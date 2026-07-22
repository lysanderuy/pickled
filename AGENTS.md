<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Setup steps, the auth flow, and the security model live in `README.md` —
this file covers binding code rules only.

# Architecture rules (binding)

Layered, one-direction flow. Never skip or short-circuit a layer:

```
page/client component → TanStack Query hook (src/hooks) → api wrapper (src/lib/api/client.ts)
  → route handler (src/app/api/**) → service (src/services) → db (src/db, Drizzle)
```

- Client components NEVER import from `src/services` or `src/db`. They reach the backend only through `src/hooks` → the `api` wrapper. Both layers start their entry files with `import "server-only"` so an accidental client import fails the build instead of leaking server code/secrets to the browser — keep this line at the top of every `*.service.ts` and `src/db/index.ts`.
- Route handlers stay thin: authenticate (`createClient()` from `src/lib/supabase/server` + `getUser()`), validate with Zod, delegate to a service, respond with `apiSuccess`/`apiError`/`handleApiError` from `src/lib/api/response`. All routes return the `ApiResponse<T>` envelope (`src/types/api.ts`).
- Services own ALL business logic and DB access. They never touch `Request`/`Response`/cookies; they take plain inputs (e.g. `userId`) and must scope every query to the authenticated user.
- Exception: auth itself calls the Supabase SDK directly — from pages, and from the redirect-driven `/api/auth/callback` and `/api/auth/logout` routes (they manage cookies and return redirects, not JSON, since they're browser navigations, not JSON calls). App data never does this.
- A third exception, different in kind: `/api/auth/email-hook` is inbound — Supabase calls it, not the browser. It authenticates via webhook signature (`standardwebhooks`), not session/cookies, and returns Supabase's required JSON shape instead of a redirect or `ApiResponse<T>`.

## Adding a resource — follow this order

1. Schema: `src/db/schema/<things>.ts`, export from `schema/index.ts`, `npm run db:generate` + `db:migrate`
2. Validator: `src/validators/<thing>.validator.ts` (Zod is the source of truth; infer TS types from schemas)
3. Service: `src/services/<thing>.service.ts`
4. Route: `src/app/api/<things>/route.ts`
5. Hook: `src/hooks/use-<thing>.ts` (`useQuery`/`useMutation` wrapping the `api` client)
6. UI: `src/app/` + `src/components/` consuming the hook
7. Docs: register the endpoint in `src/lib/api/openapi.ts` (path entry + `.meta()` on new/changed validator fields) — not auto-derived from the route file

## Adding an optional integration

External services with an API key (Resend, Upstash, etc.) — see `src/services/email.service.ts` and `src/lib/rate-limit.ts`:

1. Add the env var(s) to `src/lib/env.ts` as `.optional()`, and to `.env.example`.
2. Lazily construct the client on first use, never at module top level — breaks `next build` on a fresh clone with no env vars set.
3. No-op or throw a clear "not configured" error if unset — never crash silently or block the app from booting.

## Hard rules

- **Every new table's migration must include `ALTER TABLE "<name>" ENABLE ROW LEVEL SECURITY;`** (no policies needed). `npm run db:migrate` runs a guardrail that fails otherwise. Reason: Drizzle bypasses RLS, but Supabase's PostgREST (`/rest/v1`) exposes any public table without RLS to the anon key.
- This is Next 16: the request middleware file is `src/proxy.ts` (exports `proxy`), NOT `middleware.ts`. `cookies()` and route params are async — await them.
- Migrations only via drizzle-kit (`db:generate`/`db:migrate`); never hand-edit `src/db/migrations` except `--custom` migrations. drizzle-kit uses `DIRECT_URL` (session pooler, 5432); the app uses `DATABASE_URL` (transaction pooler, 6543, `prepare: false`).
- Server env vars go through `src/lib/env.ts` (Zod-validated, server-only import). Client code uses `process.env.NEXT_PUBLIC_*` directly.
- Server state lives in TanStack Query; client-only UI state in Zustand (`src/stores/*.store.ts`). Never mirror API data into a store.
- New protected routes: add the prefix to `protectedPrefixes` in `src/lib/supabase/proxy.ts` AND check `getUser()` in the page/route itself.
- New abuse-prone routes: add a stricter entry to the `overrides` array in `src/lib/rate-limit.ts` (mirrors the `protectedPrefixes` pattern). Rate limiting is per-IP, scoped to `/api/**` only, and no-ops if `UPSTASH_REDIS_REST_URL`/`TOKEN` aren't set — don't treat that as a bug to fix.
- `/api/openapi.json`, `/api/auth/callback`, `/api/auth/logout`, and `/api/auth/email-hook` are the deliberate exceptions to "every route returns `ApiResponse<T>`" — openapi.json serves the raw spec for external tooling (Scalar, codegen); the auth routes are browser redirects, not JSON calls; email-hook returns the JSON shape Supabase's webhook contract requires. `/api/docs` (Scalar UI) and `/api/openapi.json` are public/unauthenticated by design; gate them if that's ever a concern. The spec (`src/lib/api/openapi.ts`) is hand-maintained, not derived from route files — keep it in sync per the "Adding a resource" step above.

## Naming

`*.service.ts`, `*.validator.ts`, `*.store.ts`, `use-*.ts` (one hook per file), `*.test.ts` (colocated next to the file it tests). `src/components/ui` = generic primitives; `src/components/shared` = app-specific composites.

## Comments

- `//` only, 1-2 lines, states the current fact — never restates what the
  code already shows, never narrates a past decision.
- One place per fact: codebase-wide rules live here or in README, not
  repeated per file.
- Exception: `// Example X — replace/extend per project.` markers on
  template files (`profiles.ts`, `ui.store.ts`, `use-debounce.ts`, etc.)
  flag disposability for someone cloning the repo — not a WHY comment.

## Testing

Vitest, unit-only, node environment (no jsdom yet). Only pure logic is
covered — validators (`src/validators`) and framework-free `src/lib`
helpers. Services and routes touch Drizzle/Supabase and are untested: this
project has no dedicated test database, and mocking the Drizzle client
would give false confidence rather than real coverage. Check with the user
before adding jsdom, Testing Library, or DB mocking.

## CI and pre-commit

`.husky/pre-commit` runs `lint-staged` (ESLint + Prettier on staged files) and `npm run typecheck` only — no `npm test`, to keep commits fast. Tests run in `.github/workflows/ci.yml` on every PR and push to `main`.

`.github/workflows/pr-description-bot.yml` auto-generates PR descriptions via the Gemini API. Uses `pull_request`, not `pull_request_target`, and never checks out PR code: `pull_request_target` would expose secrets to arbitrary code from PR branches. Needs a `GEM_KEY` repo secret to function.

## Verify before declaring done

`npx tsc --noEmit && npm run lint && npm test` after every change; `npm run db:verify` after schema changes. Do not run `npm run build` without asking.

## Commits

Format: `[Type][Lysan] Description` — e.g. `[Feature][Lysan] Add booking calendar`. Types: Feature, Fix, Hotfix, Database, Enhancement, UI/UX, CI, Chore, Docs, etc. Split by concern. Subject line only — no body, no Co-Authored-By trailer.

# Pickled

A fully-owned booking and management system for pickleball facility owners in
Cebu. This first pass is deliberately unstyled (white background, black
borders) — functionality is validated with real facilities first; the visual
identity comes in a later pass.

**This pass covers the admin side only.** Deferred by design: the public
customer side (facility overview + public booking flow), all email features
(staff invite emails — invited staff can't log in yet), and Analytics
(placeholder page; metrics will be chosen after facility outreach).

Single-tenant: one deployment per facility. The `facility_profile` row is a
seeded singleton; every table still carries `facility_id` for
forward-compatibility with the real product build.

## Stack

| Layer         | Tech                                                              |
| ------------- | ----------------------------------------------------------------- |
| Frontend      | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 |
| Database      | Supabase (PostgreSQL)                                             |
| Auth          | Supabase Auth (`@supabase/ssr`, cookie-based sessions)            |
| ORM           | Drizzle ORM + drizzle-kit migrations                              |
| Validation    | Zod v4                                                            |
| Server state  | TanStack Query v5                                                 |
| Client state  | Zustand (UI-only state)                                           |
| API docs      | OpenAPI 3.1 (`zod-openapi`) + Scalar (`/api/docs`)                |
| Testing       | Vitest (unit tests, colocated `*.test.ts`)                        |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`), optional                    |
| Code quality  | ESLint + Prettier + Husky/lint-staged pre-commit                  |
| CI            | GitHub Actions — typecheck/lint/test + PR description bot         |

## Modules

Dashboard (pending queue + today), Bookings, Calendar (day grid per court),
Courts, Rates (tiered pricing rules), Customers, Recurring bookings (standing
weekly reservations), Sales (with void audit trail), Team (owner_admin only),
Settings (facility profile + operating hours), Analytics (placeholder).

Two roles: `owner_admin` and `staff`. They differ only in Team access and the
ability to void sales.

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
   for the same reason).

3. `npm run db:migrate` — applies migrations + runs the RLS guardrail.
4. Create the owner's auth user (Supabase Dashboard → Authentication → Users →
   Add user, with a password), then `npm run db:seed` — seeds the singleton
   `facility_profile` with placeholder values (editable later in Settings) and
   links the first auth user as an active `owner_admin` staff row.
5. `npm run dev` — sign in at `/login`, land on `/dashboard`.

There is no public signup page: this is a staff-only system. Team members are
added in the Team module, but their invite emails are part of the deferred
email pass — until then only seeded accounts can log in.

## Architecture

Strict one-direction flow. Each layer only talks to the layer below it.

```
page / client component
        │  TanStack Query hooks (src/hooks) → api wrapper (src/lib/api/client.ts)
        ▼
route handler (src/app/api/**)     ← requireStaff() + Zod validation only
        │
        ▼
service (src/services/**)          ← all business logic
        │
        ▼
db (src/db, Drizzle)  /  Supabase
```

See `AGENTS.md` for the binding rules (layering, envelope, naming, commits).

### Business rules that live in services

- **Conflict rule** — a slot is blocked by confirmed bookings and pending ones
  whose hold hasn't lapsed. Backstopped at the DB by an exclusion constraint
  (`excl_bookings_slot_overlap`), so concurrent requests can't double-book.
- **Lazy hold expiry** — public-style pending bookings auto-expire on the next
  read that touches them; no background jobs anywhere.
- **Recurring bookings** — templates materialize real booking rows on demand
  for a rolling 8-week window. Template schedules are immutable after
  creation (cancel + recreate); a unique index dedupes concurrent
  materialization.
- **Rate resolution** — court-specific rule beats facility-wide, then higher
  priority, else the court's flat hourly rate. Booking `rate_amount` snapshots
  the resolved session total and is never recomputed.
- **Effective hours** — court override if set, else facility hours; a `null`
  day means closed. Facility-hours edits are rejected if they would orphan an
  existing override or standing reservation.
- **Customer resolution** — bookings match by phone, then email, else create;
  the stored name stays canonical. Manual adds surface a duplicate warning
  (`code: duplicate_customer`) instead of silently linking.

## API docs

- `/api/docs` — interactive reference (Scalar UI).
- `/api/openapi.json` — the OpenAPI 3.1 spec, raw JSON (not enveloped).

Hand-maintained in `src/lib/api/openapi.ts` — update it when adding/changing
endpoints. Both routes are public by design (dev tooling); gate them before a
production launch that shouldn't expose the API surface.

## Security model

Drizzle connects as `postgres` and **bypasses RLS** — authorization lives in
route handlers (`requireStaff()` + role checks). Every table still has RLS
enabled (no policies) to lock Supabase's auto-generated REST API away from the
anon key; `db:migrate` runs a guardrail (`scripts/verify-db.mjs`) that fails
if any public table has RLS disabled.

Error responses carry curated business data only (IDs, staff-facing names) —
never DB internals or stack traces. Unknown errors log server-side and return
a generic 500.

## Database workflow

Define tables in `src/db/schema/` (one file per table, export from
`schema/index.ts`), then:

```bash
npm run db:generate -- --name=create-things   # name it, or drizzle-kit invents one
npm run db:migrate                            # apply + RLS guardrail
```

Every new table's migration must include
`ALTER TABLE "things" ENABLE ROW LEVEL SECURITY;`. For SQL that can't be
derived from the TS schema (extensions, constraints, triggers), use
`npx drizzle-kit generate --custom --name=...`.

## Testing

Vitest, pure Node. Covers only pure logic — Zod validators and framework-free
`src/lib` helpers. Services/routes touch Drizzle/Supabase and are untested on
purpose (no test database; mocking Drizzle would give false confidence).

```bash
npm test         # run once
npm run test:watch
```

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
| `db:seed`                 | Seed facility singleton + owner_admin (idempotent)         |
| `db:auth-users`           | Debug: list recent signups + email confirmation status     |
| `db:push`                 | Push schema directly (prototyping only)                    |
| `db:studio`               | Drizzle Studio data browser                                |

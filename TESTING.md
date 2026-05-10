# Testing

## Stack

- **Runner**: vitest (added as a dev dep on `apps/web`).
- **Layout**: tests live in `__tests__/` adjacent to the code they cover.
  - `apps/web/lib/setup/__tests__/` — pure unit tests
  - `apps/web/app/api/<route>/__tests__/` — route handler tests with mocked Supabase
  - `apps/web/components/<area>/__tests__/` — component tests
  - `apps/web/__tests__/integration/` — tests that need a live database (skipped by default)

## Commands

From repo root:

```bash
pnpm --filter @klickenya/web test       # run once
pnpm --filter @klickenya/web test:watch # watch mode
pnpm --filter @klickenya/web test:ci    # CI (non-zero exit on failure)
```

The `test:ci` script is what CI runs and what `DO NOT SHIP IF` gates against.
By default it executes only the pure / mocked tests — no database is required.

## Database integration tests

The trigger and atomic-RPC behaviour live in Postgres and cannot be exercised
with a mocked client. Those tests live under `apps/web/__tests__/integration/`
and are gated by environment variables. Pure CI passes whether or not these
suites are run.

To run them locally against a local Supabase:

1. Install the Supabase CLI: `brew install supabase/tap/supabase` (or see the
   [installation docs](https://supabase.com/docs/guides/local-development)).
2. From repo root: `supabase start`. This boots Postgres, GoTrue, and the
   PostgREST proxy, and applies every file in `supabase/migrations/` in order
   — including the new wizard migrations.
3. Grab the URL and service-role key from the `supabase status` output.
4. Run the integration tests:

```bash
RUN_DB_INTEGRATION=1 \
SUPABASE_TEST_URL="<the-url>" \
SUPABASE_TEST_SERVICE_ROLE_KEY="<the-key>" \
pnpm --filter @klickenya/web test
```

If any of the three env vars is missing, the integration suites self-skip
with a clear `describe.skip` so the rest of the suite still passes.

## What to test

- **Pure functions** (e.g. `resolveNextStep`): exhaustive unit tests.
- **API routes**: mock `@/lib/supabase/admin` and the auth helpers; assert on
  status code, response body, and which Supabase calls did/did not fire.
- **Database invariants** (triggers, CHECK constraints, RPCs): integration
  test against a real Postgres. Gate on `RUN_DB_INTEGRATION=1`.
- **Components**: prefer asserting on rendered output / props. Source-text
  assertions are acceptable for static href values that a render harness
  would otherwise need to drive through complex local state.

## Don't ship if

- `pnpm --filter @klickenya/web test:ci` returns non-zero, or
- `pnpm --filter @klickenya/web tsc --noEmit` fails (run from `apps/web/`), or
- `pnpm lint` introduces any new error above the existing baseline (warn-only
  is fine).

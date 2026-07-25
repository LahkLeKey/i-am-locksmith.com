# Jobs workflow end-to-end tests

The Playwright suite exercises Jobs Operations through the browser using the reserved job name `Playwright Test Job`. Each run provisions deterministic technician, inventory location, part, and stock ledger fixtures, then removes the reserved job and its invoice/payment records.

## Production safety requirements

The suite targets `https://www.i-am-locksmith.com` by default. It only creates and removes records reserved for `Playwright Test Job`. Production execution refuses to start unless both acknowledgments are set:

- `E2E_ALLOW_DATABASE_RESET=true`
- `E2E_ALLOW_PRODUCTION_MUTATIONS="Playwright Test Job"`

Cleanup is scoped to the verified production organization `org_3GofNoNHjMe4weYK3LYnsNv08VO` and the exact reserved job/fixture names. It removes only the suite's job, invoice, payment, inventory, ledger, location, and technician fixtures.

## Required environment

- `DATABASE_URL`: Production database, loaded from `.env.production.local` for local execution.
- `E2E_DATABASE_URL`: Optional explicit override for setup and teardown.
- `E2E_ALLOW_DATABASE_RESET`: Must be `true`.
- `E2E_ALLOW_PRODUCTION_MUTATIONS`: Must equal `Playwright Test Job`.
- `E2E_ORG_ID`: Optional override; defaults to the verified production organization.
- `E2E_CLERK_USER_EMAIL`: Optional override; defaults to `zephrym.mn@gmail.com`.
- `CLERK_SECRET_KEY`: Secret key for the Clerk development instance.
- `CLERK_PUBLISHABLE_KEY`: Publishable key consumed by Clerk's testing helper.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Same publishable key consumed by the Next.js app.
- `E2E_BASE_URL`: Optional; defaults to `https://www.i-am-locksmith.com`.

## Run against production

Apply migrations to the disposable database, install Chromium once, then run the suite:

```bash
pnpm test:e2e:install
E2E_ALLOW_DATABASE_RESET=true E2E_ALLOW_PRODUCTION_MUTATIONS="Playwright Test Job" pnpm test:e2e:production
```

Use `pnpm test:e2e:headed` to watch the browser flow. Failure traces, screenshots, and videos are written under `test-results/`; the HTML report is written under `playwright-report/`.

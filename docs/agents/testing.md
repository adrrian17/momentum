# Testing and validation

Read this guide before writing code or choosing a testing approach.

## Testing policy

- Never write unit tests after writing the code they test.
- Strongly prefer end-to-end (E2E) tests as the sole testing mechanism. Use them to verify complex features through the real application.
- Produce a repeatable artifact after E2E. Include its location and command.
- If a system must be tested in isolation, first write down all the ways it could fail, then write the code.

## E2E

Playwright tests in `apps/web/e2e` run on desktop Chromium, iPhone WebKit and the production PWA preview. Run `pnpm --filter web e2e`. The harness starts `packages/infra/scripts/local.alchemy.ts` through `dev:local` when needed. This uses the normal Worker, D1 migrations and EMAIL simulator, with Alchemy's file state store. No cloud state-store request or remote email binding is needed.

Configure a dedicated synthetic `AUTH_TEST_EMAIL` in `apps/web/.env`. This sensitive test setting is not browser exposed or imported into the server. Copy the previous synthetic `SIGNUP_EMAIL` value here when migrating. Keep the old ignored setting and all other env values. Leave `AUTH_TEST_EMAIL` unset in the shell, or align it with the file deliberately; process values override Varlock files. Playwright loads the web schema. Alchemy loads the infra schema, which imports server settings. The webServer child clears the parent Varlock blob before resolving this schema, preserving its command-local `CORS_ORIGIN` override. The selected web port follows this canonical origin. The public Worker never receives the test email or bootstrap configuration.

`AUTH_TEST_STAGE` defaults to `e2e-bootstrap`. `AUTH_TEST_BASE_URL` defaults to `http://localhost:3001`; browser API requests use this same origin. Alchemy retains the separate internal local server listener on port 3000. Use matching stage and origin settings if borrowing an existing stack. For an owned stack:

```bash
AUTH_TEST_BASE_URL=http://localhost:3001 CORS_ORIGIN=http://localhost:3001 \
  pnpm -F @momentum/infra dev:local --stage e2e-bootstrap
```

Run tests with the same origin and stage. Select a free web port when 3001 belongs to another application. Stop only recorded owned processes. Never start a second stack against a borrowed database or infer ownership from an old PID.

Setup inspects the selected local D1, bootstraps only when it is empty, and uses the private CLI with JSON stdin. It tries an email case variant so Better Auth normalization is exercised on fresh creation. The CLI requests verification through the public web Worker and its actual service binding. Sign-in while unverified returns 403 and sends another link. Setup asserts no session and notes API 401, reads new simulator text, confirms via Node fetch, then signs in and stores cookies. Confirmation itself must not set session cookies. Both the token endpoint and callback must use the web origin. A second bootstrap with a different email and password must refuse without changing user or credential counts. Subsequent sign-in proves the original password still works. Setup alone confirms the shared account so browser projects do not race. An existing verified synthetic account is reused; first creation and verification are skipped in that run.

Public signup tests submit the existing email, its opposite case and unrelated new candidates. Every valid request must return 400, code `EMAIL_PASSWORD_SIGN_UP_DISABLED` and message `Email and password sign up is not enabled`. User and credential counts and simulator message count must stay unchanged. The login page must offer no **Create account** button. Tests also drive invalid-link recovery and normal sign-in. Signup closure has no configuration-dependent variant.

The full harness has 10 tests and four browser workers. A per-stage filesystem lease serializes private CLI calls because concurrent Alchemy local D1 gateways can fail during inspection. The lease contains no account data and is removed in `finally`; an interrupted run leaves a safe refusal rather than deleting another process's lease. The single-origin spec verifies the real web Worker and its native service binding on Chromium and WebKit. It checks anonymous API 401, exact `/api` and unknown API 404 without HTML fallback, authenticated hostile-origin rejection, static deep links and browser API requests on the web origin. Setup also checks host-only Lax/HttpOnly cookies and verification URL origin. The bare Vite proxy is disabled under Alchemy and is not the E2E API transport. Notes tests use unique text and tags, preserve existing notes and delete only their own delete fixture. Auth traces are disabled; Node fetch keeps bearer links and credentials out of Playwright traces. The HTML report, JSON status and installability attachments live in ignored `apps/web/e2e-results/`. Treat reports, traces, screenshots, simulator messages, cookies and dev logs as private local artifacts. Never upload them or print private input.

The `pwa-chromium` project builds the production bundle and starts Vite preview on 4173. It checks the manifest, Chrome installability diagnostics, cache contents, Apple Touch metadata, offline static shell and rejected offline API requests. Run `pnpm --filter web exec playwright test --project=pwa-chromium` to reproduce it alone. This does not validate deployment or Safari installation.

For fresh bootstrap proof, stop only the owned stack and start a new explicit stage such as `e2e-bootstrap-<unique-run-id>`. Run `AUTH_TEST_STAGE=<same-stage> pnpm --filter web e2e` with the matching origin. Alchemy creates a separate local D1 and applies normal migrations. Preserve this state after testing. No reset, `db:push`, remote binding, production stage or data deletion is allowed. The simulator saves structured mail at `packages/infra/.alchemy/local/email/text/*.txt` and sends no real email.

## Bootstrap concurrency and rollback

The private CLI probe uses a separate, empty synthetic stage. Before implementation the failure modes identified were wrong-target selection, a second operator creating another user, partial user creation if credential persistence fails, replacing an existing password, and logging private values. The probe covers real D1 rollback, two distinct-email processes, refusal and complete user/credential record preservation. It does not send email, issue sessions or mark a user verified.

```bash
ALCHEMY_DEV_ONCE=1 pnpm -F @momentum/infra exec alchemy dev \
  --config scripts/local.alchemy.ts --stage e2e-bootstrap-probe-<unique-run-id> --include database
pnpm -F @momentum/infra exec bun run scripts/verify-bootstrap.ts \
  --stage e2e-bootstrap-probe-<same-run-id>
```

The probe first requires zero users. It creates its own temporary rejection trigger to force a credential insert failure, checks that both counts remain zero, and drops only that trigger. It then retains the winning account and all stage data. A completed probe cannot be rerun on the same stage; choose a new stage instead of resetting it. Exit 0 is success. Output contains status only. The remote path remains untested live.

## Code checks

Use pnpm from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm exec ultracite check` | Check lint and formatting |
| `pnpm exec ultracite fix` | Apply lint and formatting fixes |
| `pnpm -r check-types` | Check every package, including private CLI scripts |

Before committing, run Ultracite fix, inspect the diff, and run relevant type and real behavior checks.

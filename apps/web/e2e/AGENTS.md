# E2E

Run `pnpm --filter web e2e` from the repository root (Playwright: desktop Chromium, iPhone WebKit, production PWA preview). When needed, the harness starts `packages/infra/scripts/local.alchemy.ts` through `dev:local`: real Worker, D1 migrations and email simulator, file state store, no cloud calls.

## Running

- Set a dedicated synthetic `AUTH_TEST_EMAIL` in `apps/web/.env`. Leave it unset in the shell unless deliberately matching the file; process values override Varlock files. Never expose it to the browser or server.
- `AUTH_TEST_STAGE` defaults to `e2e-bootstrap` and `AUTH_TEST_BASE_URL` to `http://localhost:3001`. Use the same stage and origin for the stack and the tests. Pick a free port if 3001 is taken. To start an owned stack:

  ```bash
  AUTH_TEST_BASE_URL=http://localhost:3001 CORS_ORIGIN=http://localhost:3001 \
    pnpm -F @momentum/infra dev:local --stage e2e-bootstrap
  ```

- Stop only processes you started and recorded. Never infer ownership from an old PID or start a second stack against a borrowed database.
- Treat reports, traces, screenshots, simulator messages, cookies and dev logs in `apps/web/e2e-results/` as private. Never upload them or print private input.
- Reproduce the PWA project alone with `pnpm --filter web exec playwright test --project=pwa-chromium`. It does not validate deployment or Safari installation.

## Fresh bootstrap proof

Stop only the owned stack, then start a new stage such as `e2e-bootstrap-<unique-run-id>` and run `AUTH_TEST_STAGE=<same-stage> pnpm --filter web e2e` with the matching origin. Alchemy creates a separate local D1 with normal migrations. Preserve that state afterward. No reset, `db:push`, remote binding, production stage or data deletion.

## Guarantees

Keep these when editing the specs.

- Setup inspects the selected local D1 and bootstraps only when it is empty, through the private CLI with JSON stdin. It uses an email case variant on fresh creation to exercise normalization. An existing verified synthetic account is reused.
- Unverified sign-in returns 403 and resends. Setup asserts no session and notes API 401, reads the new simulator message, confirms through Node fetch, then signs in and stores cookies. Confirmation must not set session cookies. The token endpoint and callback must use the web origin.
- A second bootstrap with a different email and password must refuse without changing user or credential counts, and the original password must still sign in.
- Only setup confirms the shared account, so browser projects do not race.
- A per-stage filesystem lease serializes private CLI calls, because concurrent local D1 gateways can fail. It holds no account data, is removed in `finally`, and an interrupted run leaves a safe refusal instead of deleting another process's lease.
- Closed signup: submit the existing email, its opposite case and unrelated new emails. Each valid request returns 400, code `EMAIL_PASSWORD_SIGN_UP_DISABLED`, message `Email and password sign up is not enabled`, with user, credential and simulator message counts unchanged. The login page has no **Create account** button. There is no configuration-dependent variant.
- Single origin, on Chromium and WebKit through the real web Worker and service binding: anonymous API 401; exact `/api` and unknown API paths 404 without HTML fallback; authenticated hostile-origin rejection; static deep links; browser API requests on the web origin. Setup checks host-only Lax HttpOnly cookies and the verification URL origin. The bare Vite proxy is disabled under Alchemy and is not the E2E transport.
- Notes: use unique text and tags, preserve existing notes, and delete only the test's own fixture.
- Privacy: auth traces stay disabled. Use Node fetch for bearer links and credentials so they stay out of Playwright traces.
- PWA: `pwa-chromium` builds the production bundle and serves Vite preview on 4173. It checks the manifest, Chrome installability, cache contents, Apple Touch metadata, the offline static shell and rejected offline API requests.

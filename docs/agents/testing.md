# Testing and validation

Read this before writing tests, starting a local stack or running E2E.

## Policy

- Never write unit tests after the code they test.
- Prefer end-to-end tests through the real application as the only testing mechanism.
- After E2E, report a repeatable artifact with its location and command.
- If a system must be tested in isolation, list every way it can fail before writing the code.

## Running E2E

- Run `pnpm --filter web e2e` (Playwright: desktop Chromium, iPhone WebKit, production PWA preview). The harness starts `packages/infra/scripts/local.alchemy.ts` through `dev:local` when needed: real Worker, D1 migrations and email simulator, file state store, no cloud calls.
- Set a dedicated synthetic `AUTH_TEST_EMAIL` in `apps/web/.env`. Leave it unset in the shell unless deliberately matching the file; process values override Varlock files. Never expose it to the browser or server.
- `AUTH_TEST_STAGE` defaults to `e2e-bootstrap` and `AUTH_TEST_BASE_URL` to `http://localhost:3001`. Use the same stage and origin for the stack and the tests. Pick a free port if 3001 is taken. To start an owned stack:

  ```bash
  AUTH_TEST_BASE_URL=http://localhost:3001 CORS_ORIGIN=http://localhost:3001 \
    pnpm -F @momentum/infra dev:local --stage e2e-bootstrap
  ```

- Stop only processes you started and recorded. Never infer ownership from an old PID or start a second stack against a borrowed database.
- Treat reports, traces, screenshots, simulator messages, cookies and dev logs in `apps/web/e2e-results/` as private. Never upload them or print private input.
- Reproduce the PWA project alone with `pnpm --filter web exec playwright test --project=pwa-chromium`. It does not validate deployment or Safari installation.

Read the [E2E harness reference](e2e-harness.md) before editing `apps/web/e2e/**`.

## Fresh bootstrap proof

Stop only the owned stack, then start a new stage such as `e2e-bootstrap-<unique-run-id>` and run `AUTH_TEST_STAGE=<same-stage> pnpm --filter web e2e` with the matching origin. Alchemy creates a separate local D1 with normal migrations. Preserve that state afterward. No reset, `db:push`, remote binding, production stage or data deletion.

## Probes

- After editing the bootstrap CLI, run the probe in the [bootstrap runbook](../runbooks/account-bootstrap.md#implementation-invariants).
- After editing the web origin resolver, run `pnpm -F @momentum/infra exec bun run scripts/verify-web-settings.ts`. It is offline and loads no credentials; it does not prove DNS, TLS, zone ownership or routing.

Lint, format and typecheck commands live in [coding standards](../../CODING_STANDARDS.md#checks).

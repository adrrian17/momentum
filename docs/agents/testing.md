# Testing and validation

Read this guide before writing code or choosing a testing approach.

## Testing policy

- Never write unit tests after writing the code they test.
- Strongly prefer end-to-end (E2E) tests as the sole testing mechanism. Use them to verify that complex features work through the real application.
- At the end of E2E tests, produce a verifiable and repeatable artifact. Include the artifact location and the command or steps to reproduce it.
- If a system must be tested in isolation, first write down all the ways it could fail, then write the code.

## E2E

Playwright tests live in `apps/web/e2e` and run on desktop Chromium and an iPhone (WebKit) preset against the real dev stack. Run `pnpm --filter web e2e`; it reuses a running `pnpm run dev` or starts one. After a schema change, run `pnpm run db:generate` and restart the dev stack so Alchemy applies the migration. The HTML report and traces are written to `apps/web/e2e-results/` (`pnpm --filter web exec playwright show-report e2e-results/report`).

Configure a dedicated synthetic `SIGNUP_EMAIL` in `apps/server/.env` before running E2E. Preserve existing environment settings. The setup project runs once before both browser projects: it signs in with the fixed test password in `e2e/account.ts`, or creates the account if it does not exist. An existing unverified account receives a link on sign-in. A fresh registration checks the pending screen, explicit resend, 403 sign-in rejection, and a null session before confirmation. Setup reads only newly created text files from the real local Cloudflare simulator, confirms the link with Node fetch, then signs in and saves cookies. Confirmation itself must not set session cookies. Setup alone handles confirmation so browser projects never race to verify the shared account. It saves cookies in the ignored `e2e-results/.auth/user.json`. Tests use unique tags and note text for each project and run. Only the note created for the delete test is deleted; existing notes are preserved. Treat local reports, traces, and storage state as private artifacts.

Sign-up tests check the default sign-in view, a visible rejection for another email, and case-insensitive acceptance through the generic duplicate response followed by successful sign-in. Both tests choose the opposite case of the configured email, including uppercase or mixed-case settings. Better Auth 1.7.7 returns a generic 200 with a null token for duplicate registration under required verification; the test checks that response, the pending UI, absence of a session, and subsequent successful sign-in. A first setup on a fresh local D1 also checks real registration. Do not reset a database to repeat that check.

The `pwa-chromium` project builds the production bundle and starts Vite preview on port 4173. It checks Chrome's `Page.getAppManifest` and `Page.getInstallabilityErrors`, static cache contents, Apple Touch metadata, the offline static shell, and rejected offline API requests and navigations. The saved `installability.json` attachment includes the manifest and Chrome diagnostics in `e2e-results/artifacts/` and the HTML report. Run `pnpm --filter web exec playwright test --project=pwa-chromium` to reproduce this check alone. This does not validate deployment, Safari installation, or offline note editing.

To verify closed-by-default sign-up on an agent-owned dev stack, stop that stack and restart it with `SIGNUP_EMAIL= pnpm run dev`, leaving the env file unchanged. POST the configured test email to `/api/auth/sign-up/email` with a synthetic name and password; expect 403 and `Sign-up is closed`. Restore the normal dev command and repeat the same request; the existing test account must return a generic 200 with a null token; verify sign-in still works. Never stop a user's stack or print environment values for this check.

Authentication setup and sign-up tests disable Playwright traces so credentials and bearer links stay out of trace attachments. Verification requests run through Node fetch and only status assertions enter reports. Outbox files, storage state, screenshots, reports, and Alchemy logs remain private local artifacts. The installed structured simulator writes `packages/infra/.alchemy/local/email/text/*.txt`, rather than `.eml`, and never sends real mail.

To exercise registration again without touching existing accounts, use a new Alchemy dev stage on an agent-owned stack. Stop only that stack, run `pnpm -F @momentum/infra exec alchemy dev --stage e2e-email-<unique-run-id>`, then run `pnpm --filter web e2e`. Each new stage creates a separate local D1 with normal migrations; no `db:push`, database reset, or data deletion is needed. Preserve the generated stage state and stop the test stack after the run. Restart the original dev stage before returning ownership. Never use a production stage or a remote binding for this check.

## Code checks

Ultracite uses Oxlint and Oxfmt for this repository. Run commands from the repository root:

| Command                      | Purpose                         |
| ---------------------------- | ------------------------------- |
| `pnpm exec ultracite check`  | Check lint and formatting       |
| `pnpm exec ultracite fix`    | Apply lint and formatting fixes |
| `pnpm exec ultracite doctor` | Diagnose the tooling setup      |

Before committing code, run `pnpm exec ultracite fix`, review the resulting diff, and run the relevant type and behavior checks. Build and typecheck commands are listed in [AGENTS.md](../../AGENTS.md).

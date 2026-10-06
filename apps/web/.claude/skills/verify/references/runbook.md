# Run Momentum verification

Run commands from the monorepo root. Use pnpm 12.4.1 as pinned in `package.json`.

## Launch and ownership

Defaults below use 3001. For another free web port, export `AUTH_TEST_BASE_URL=http://localhost:<port>`, align `CORS_ORIGIN` for the owned stack, and pass that origin to Doctor. Keep 3000 and 4173 reserved. Never stop another application to free a port.

1. Inspect listeners with `lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:4173 -sTCP:LISTEN`. An empty result exits nonzero. Check each PID's cwd with `lsof -a -p PID -d cwd -Fn` and its parent with `ps -p PID -o pid=,ppid=,comm=`.
2. If the selected ports are free, launch `pnpm -F @momentum/infra dev:local --stage e2e-bootstrap` in a supervised terminal session. Record the session and PIDs. Wait for both HTTP checks in Doctor to succeed. Do not start only Vite; notes and auth require the real web Worker entry, native API service binding and D1. The bare Vite proxy does not verify this boundary.
3. If both ports belong to this checkout, confirm that using the configured synthetic account is authorized. A matching cwd does not authorize using real work records. Leave the borrowed stack running during cleanup.
4. Run `apps/web/.claude/skills/verify/scripts/doctor.sh`. If only one port is healthy, diagnose the current stack instead of launching another.
5. For auth or notes, require a synthetic `AUTH_TEST_EMAIL` in `apps/web/.env` and the dedicated test password defined in `apps/web/e2e/account.ts`. Ask the operator to configure it if missing. Never print its value, use a real account, or rewrite secrets to make a test pass. Leave `AUTH_TEST_EMAIL` unset in the shell or aligned with the file. Varlock process overrides take precedence. Playwright loads the web schema; Alchemy loads the infra schema. Use the same `AUTH_TEST_STAGE` and `AUTH_TEST_BASE_URL` across stack and harness.

The selected isolated local stage shares one D1, auth-state file, and email outbox. Serialize all Playwright runs. Browser projects within one run use serial setup plus unique notes and tags. Fixed ports prevent side-by-side dev stacks without changing configuration; a separate stage alone does not change ports.

For fresh bootstrap, follow [the E2E guide](../../../../e2e/AGENTS.md#fresh-bootstrap-proof). Use a new local stage only on an agent-owned stack. Preserve the original stage, env files, and all data. The local entrypoint uses a file state store. No deploy, remote binding, `db:push`, or database reset is part of verification.

## Create a private evidence directory

Run this in the shell used for Drive:

```bash
RUN="$PWD/apps/web/e2e-results/verify-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$RUN"
git rev-parse HEAD > "$RUN/revision.txt"
printf '%s\n' "$RUN"
apps/web/.claude/skills/verify/scripts/doctor.sh > "$RUN/doctor.log" 2>&1
```

Keep this absolute `RUN` path across tool calls. Do not rerun the assignment between Drive and Cleanup. The ignored `e2e-results` directory holds private artifacts; never upload it.

## Drive a mapped feature

For PWA, use the production preview and real Chromium service worker:

```bash
printf '%s\n' 'pnpm --filter web exec playwright test --project=pwa-chromium --reporter=list,html' > "$RUN/command.txt"
PLAYWRIGHT_HTML_OUTPUT_DIR="$RUN/report" PLAYWRIGHT_HTML_OPEN=never \
  pnpm --filter web exec playwright test --project=pwa-chromium \
  --output="$RUN/artifacts" --reporter=list,html > "$RUN/drive.log" 2>&1
status=$?
printf '%s\n' "$status" > "$RUN/exit-code.txt"
```

Require exit 0, one passing PWA test, and an `installability.json` attachment. Read its error arrays and cache URLs. Empty installability and manifest errors plus rejected offline API requests prove the local PWA path, not production deployment or Safari installation.

For all existing automated paths, replace the selection with this command, using the same evidence variables:

```bash
printf '%s\n' 'pnpm --filter web exec playwright test --reporter=list,html' > "$RUN/command.txt"
PLAYWRIGHT_HTML_OUTPUT_DIR="$RUN/report" PLAYWRIGHT_HTML_OPEN=never \
  pnpm --filter web exec playwright test --output="$RUN/artifacts" \
  --reporter=list,html > "$RUN/drive.log" 2>&1
status=$?
printf '%s\n' "$status" > "$RUN/exit-code.txt"
```

Require 10 passing tests at this revision. Setup privately bootstraps an empty target, signs in and verifies if needed. A reused verified account does not retest first bootstrap; report that distinction.

For a focused feature, append its spec name and `--project=desktop-chromium --project=iphone-webkit` instead of `--project=pwa-chromium`. Dependencies still run setup, and preview still starts. Do not use `--no-deps` to skip auth.

For additional UI entry points, extend the existing harness or use an authorized fresh browser context with synthetic data. Save a local screenshot and action trace where safe. Do not inject state or use a logged-in human browser profile. Auth flows must keep traces and tokens out of evidence.

## Read evidence and clean up

Always run cleanup after success or failure:

1. Wait for Playwright to exit. It normally stops its preview and any dev process it created. If interrupted, inspect remaining processes and stop only those identified as owned by this run.
2. Stop a manually launched dev stack through its terminal session with Ctrl-C. Never use `pkill`, `killall`, or a port-wide kill. Leave borrowed dev stacks running.
3. Check preview teardown with `lsof -nP -iTCP:4173 -sTCP:LISTEN`. No listener is the expected result; lsof exits nonzero when none exists.
4. Require `test -s "$RUN/report/index.html"`, `test -s "$RUN/drive.log"`, and `test -s "$RUN/exit-code.txt"`. For PWA, locate the saved attachment with `find "$RUN/artifacts" -name installability.json`.
5. Preserve screenshots, logs, reports, local email, auth state, and isolated stage state. The notes spec deletes its own edited fixture but leaves other synthetic fixtures. Never remove unrelated notes or wipe a shared account.

Return the feature IDs exercised, revision, exact command, exit status, artifact paths, cleanup result, and skipped paths. A reachable login page or build success alone does not prove notes or auth.

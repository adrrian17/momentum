---
name: verify
description: "Trigger: verify, QA, browser proof. Drive Momentum's web UI with Playwright and preserve local evidence for auth, notes, tags, editing, and PWA."
license: Apache-2.0
metadata:
  author: adrrian17
  version: "1.0"
---

# Verify Momentum

Read [the feature index](features/README.md) before choosing a path. Follow [the runbook](references/runbook.md) for commands. Run commands from the monorepo root, not this skill directory.

## Launch

Use `pnpm -F @momentum/infra dev:local --stage e2e-bootstrap` for the real local Alchemy stack on ports 3000 and 3001. Reuse an instance only after Doctor confirms this checkout and its operator permits driving a synthetic account. Do not change ignored env files. Require a dedicated synthetic `AUTH_TEST_EMAIL` configured through Varlock before auth or notes tests.

Playwright launches the production build and preview on 4173, even for auth-only selections. Keep 4173 free. No two verification runs may share these ports, the outbox, or the shared auth state. See the runbook for isolated fresh-bootstrap stages.

## Doctor

Run `apps/web/.claude/skills/verify/scripts/doctor.sh`. It checks this checkout's listening processes and HTTP readiness without reading credentials or changing state. It requires Bash, curl, lsof, and pnpm. Exit 0 means the dev stack is reachable and 4173 is free, not that authentication works. Run the setup project to check synthetic account access. Stop on an unexpected owner or unavailable dependency.

## Drive

Use the existing specs in `apps/web/e2e`, with the project and feature listed in the map. Run the runbook's PWA command for the initial proof or its full-suite command for all automated paths. Use accessible names from the map for extra browser checks. Record uncovered entry points as skipped, not passed.

Never bypass authentication, set database fields, disable verification, use a production stage, or enable remote email bindings. Confirm email only through the local simulator's real verification URL.

## Evidence

Save each run under `apps/web/e2e-results/verify-<run-id>/`. Preserve the command, revision, exit code, HTML report, traces, and JSON attachments. Capture actions and results, not only final screens. Confirm mutations by reload or reopening the note; confirm email through simulator output and the real endpoint. The simulator isolates the external delivery boundary, not Better Auth.

Keep all evidence local and private. Auth traces are disabled by the existing specs. Never print credentials, bearer links, outbox contents, or private notes. Record failures and missing production prerequisites without claiming success.

## Cleanup

Let Playwright stop its own preview and any dev process it created. Stop a manually launched stack only through its recorded session or exact owned PID. Leave borrowed instances running. Preserve evidence, Alchemy stage data, and other users' notes. Check that 4173 is free and the recorded artifacts still exist, including after a failed run.

## Helpers

Invoke `apps/web/.claude/skills/verify/scripts/doctor.sh` directly. It is executable and read-only. Playwright is the driver; no new test-only routes or control service are needed.

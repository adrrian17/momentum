# Momentum verification map

Use this index as the maintained inventory of user-facing paths, not as a claim that every path already has automated coverage. The web UI is primary. The auth and tRPC APIs are supporting surfaces. No CLI, native app, activity log, or reports UI exists in this revision.

## Baseline preconditions

- Read [Launch and ownership](../references/runbook.md). The dev web and API run at `http://localhost:3001` and `http://localhost:3000`; the production preview uses `http://localhost:4173`.
- Require Doctor exit 0 and permission to use the synthetic account before mutating data.
- Use the fixed account from `e2e/account.ts`. Setup handles creation, verification, and storage state. Do not expose credentials or reuse a human browser profile.
- Use new identifiers per run and project. The existing notes spec uses `crypto.randomUUID()`.
- Serialize verification runs. Setup is shared inside a run; separate runs must not share ports, auth state, or email confirmation.
- Keep evidence under a unique private `apps/web/e2e-results/verify-<run-id>/` directory.

## Driving conventions

Select the spec and browser projects from each entry. Follow the runbook's output and reporter options so reruns preserve earlier evidence. Use `getByLabel`, `getByRole`, and exact accessible names instead of coordinates.

Each entry has four H2 sections. Its automated command covers only the explicitly listed automated paths. Drive additional entry points manually through a fresh authorized browser context or extend the existing spec. Do not label a skipped entry point as covered by a different one.

## Proof and skip reporting

Record the feature ID, entry point, action, resulting state, command, revision, and artifacts. Reopen or reload saved notes to prove persistence. Use the local email simulator and real confirmation endpoint to prove verification. PWA proof requires a production build, service-worker control, CDP diagnostics, and API bypass checks.

Do not upload private reports, traces, screenshots, email text, or storage state. A failed prerequisite is a blocker, not a pass. Report first-registration checks as skipped when setup reuses an already verified account.

## Features

- [Account access](account-access.md) covers sign-in, restricted registration, verification, recovery, and sign-out.
- [Capture and render notes](capture-notes.md) covers Markdown, persistence, drafts, and loading more notes.
- [Organize notes with tags](tags.md) covers inline tags, attached tags, autocomplete, filters, and the desktop sidebar.
- [Edit and delete notes](edit-notes.md) covers the full-screen editor, drafts, save, back, confirmation, and missing notes.
- [Installable PWA](pwa.md) covers the manifest, icons, iOS metadata, static caching, and online-only API behavior.

Use `/maintain-verification-skill` to compare this map with source and live behavior after changes.

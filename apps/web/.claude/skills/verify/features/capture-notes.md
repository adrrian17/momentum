# Capture and render notes

A signed-in user writes an untitled Markdown note on the home screen, saves it, and reads it in the list. Unsaved content stays on the device as a draft.

## Sub-features

- `note-create` saves nonempty content and clears the composer.
- `note-render` renders Markdown without executing unsafe HTML or links.
- `note-persist` keeps a saved note after reload.
- `note-composer-draft` restores unsaved composer content after reload.
- `note-load-more` retrieves older notes after the first page.

## How to get to it (user POV)

- Sign in and open `/`, or choose **Momentum** in the header.
- Type in **New note** and choose **Save**.
- Read the list below **All notes**, or choose **Load more** when available.

## Driving it with Playwright

Preconditions:

- Use a verified synthetic account and the setup storage state.
- Generate unique text and tags per project and run.

Run `pnpm --filter web exec playwright test notes.spec.ts --project=desktop-chromium --project=iphone-webkit` with the runbook's report options.

- Fill `getByLabel("New note")`, then click `getByRole("button", { name: "Save", exact: true })`. Require an empty composer and an article containing the unique text.
- The spec renders **the fix** as a strong element, rejects script and image elements plus JavaScript links, and asserts no script effect after clicking the unsafe link text.
- Reload and locate the same article with `getByRole("article").filter({ hasText: uniqueText })`. Its text and tags must remain.
- Additional composer-draft check: fill unique unsaved content, reload, and require the same value. Save it and reload again to confirm the composer is empty. The existing spec tests editor drafts, not this entry point.
- Additional pagination check: create enough synthetic notes through the composer to expose **Load more**. Click it and require an older known fixture without duplicate articles. The API's first page holds 50 notes; existing E2E does not exercise pagination.

## Gotchas

- Notes have no title field; Markdown headings are part of content.
- Do not assume the account has an empty list. Scope assertions to unique fixtures.
- Do not clear all localStorage or delete unrelated notes during cleanup.
- The existing spec leaves some synthetic notes. Record created fixtures for any additional checks.
- An online failure is not evidence that offline note editing is supported.

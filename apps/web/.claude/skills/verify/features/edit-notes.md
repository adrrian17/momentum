# Edit and delete notes

A user opens a saved note in the full-screen editor, keeps an unsaved draft across reload, saves changes, or confirms permanent deletion.

## Sub-features

- `edit-open` loads a saved note and its tags.
- `edit-draft` restores an unsaved edit after reload.
- `edit-save` persists new text and tags and clears the saved draft.
- `edit-back` returns to notes without deleting the record.
- `delete-confirm` requires explicit permanent-delete confirmation.
- `delete-cancel` cancels deletion.
- `edit-missing` reports a missing note.

## How to get to it (user POV)

- Choose **Edit note** on a saved article to open `/notes/ID`.
- Open a known note URL directly.
- Choose **Back to notes**, or use the browser Back action.
- Choose **Delete**, then **Delete permanently** or **Cancel**.

## Driving it with Playwright

Preconditions:

- Use the verified synthetic account and a unique note created by this run.
- Never open the destructive flow on another user's record.

Run `pnpm --filter web exec playwright test notes.spec.ts --project=desktop-chromium --project=iphone-webkit` with the runbook's report options.

- Scope to the fixture article and click `getByRole("link", { name: "Edit note" })`. Require `getByLabel("Note", { exact: true })` to contain the saved text.
- Fill unique edited content, reload, and require the unsaved edit. Save and require `/`, the new rendered text, and the new tags.
- Reopen the fixture and require the saved content, proving that a stale draft did not resurrect.
- Click **Delete**. Require the URL to remain unchanged. Click **Delete permanently** and require the fixture article to disappear.
- Revisit its captured URL. Require `getByRole("alert")` to contain **Note not found**.
- Additional checks: cancel the confirmation and reopen to prove the note remains; choose **Back to notes** with an unsaved draft and reopen it; use browser Back; directly open a valid note URL. Existing automated coverage does not prove all these entry points.

## Gotchas

- **Delete** alone must not delete the note.
- Deletion is permanent. Record the fixture ID before deleting.
- Editor drafts use a per-note localStorage key. Do not wipe shared storage to hide a draft failure.
- A successful toast alone does not prove persistence.

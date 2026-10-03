# Organize notes with tags

A user writes inline tags or attaches tags through the picker, then filters notes by one tag. Desktop also shows tag counts in a sidebar.

## Sub-features

- `tags-inline` extracts lowercase, deduplicated tags outside Markdown code.
- `tags-attached` creates or selects a tag without adding it to the note text.
- `tags-autocomplete` completes an existing inline tag.
- `tags-remove` unlinks tags and removes only the hash from inline occurrences.
- `tags-filter` filters by a single URL tag and clears the filter.
- `tags-sidebar` shows desktop links and counts.

## How to get to it (user POV)

- Type `#name` in **New note** or **Note**.
- Choose **Add tag** in the composer, editor, or a saved note.
- Choose a saved note's tag chip, or a link under the desktop **Tags** navigation.
- Choose **Clear filter** to return to all notes.
- Use a chip's **Remove tag TAG** button to unlink it.

## Driving it with Playwright

Preconditions:

- Use a verified synthetic account with run-specific tag names.
- Run desktop Chromium and iPhone WebKit for distinct sidebar and chip entry points.

Run `pnpm --filter web exec playwright test notes.spec.ts --project=desktop-chromium --project=iphone-webkit` with the runbook's report options.

- The spec enters mixed-case duplicates and a code tag, saves, and asserts the article's `getByRole("link", { name: /^#/u })` contents. Code words must not become tags.
- Scope to the form or article, click `getByRole("combobox", { name: "Add tag" })`, fill **Search or create a tag**, and select **Create new tag: #TAG**. Require a chip and unchanged text.
- Type a unique partial inline tag. Require the suggestion button named **#TAG 1**, press Enter, and assert completion.
- Click **Remove tag TAG** on the saved note. Require the chip to disappear and inline text to retain the word without its hash.
- Select an existing picker option **#TAG COUNT** on another saved note. Require its chips and the desktop sidebar count to update.
- Click a saved tag link. Require `?tag=TAG`, heading **Notes tagged #TAG**, and only matching fixture articles. Click **Clear filter**, then require the previously excluded fixture.
- Additional entry checks: click the same desktop sidebar tag and directly load the filtered URL. Exercise the picker in the editor and use Tab, arrow keys, and Escape for autocomplete. Existing automated coverage uses the composer, note cards, chip filter, and Enter, not all these alternatives.

## Gotchas

- Scope **Add tag** because several controls share that name.
- Sidebar checks apply only to desktop; use saved-note chips on iPhone.
- Tags disappear when no note uses them. Counts include all fixtures on the account.
- Do not replace the current parser's behavior with assumptions about Markdown headings or code.

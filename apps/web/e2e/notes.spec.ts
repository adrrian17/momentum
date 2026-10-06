import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { AUTH_STATE } from "./account";

// Failure modes this flow must catch:
// - the desktop layout collapses the notes column
// - a saved note is not listed, or is lost on reload
// - Cmd/Ctrl+Enter does not save, or a new note is not grouped under "Today"
// - inline #tags are not extracted, lowercased, or deduplicated ("#Deploy" and "#deploy" must be one tag)
// - a #word inside Markdown code becomes a tag
// - "Add tag" cannot create a tag, or the attached tag is not saved
// - typing `#` does not suggest existing tags, or Enter does not complete one
// - removing a chip on a saved note does not unlink it (inline tags lose their `#`)
// - adding a tag from a note card does not reach the filter or the sidebar counts
// - Markdown renders as raw text
// - raw HTML or a javascript: link in a note becomes executable
// - clicking a tag does not filter the list, or the filter cannot be cleared
// - the editor does not load the saved note, or saving does not replace content and its tags
// - an unsaved edit is lost on reload, or a saved draft resurrects later
// - delete happens without confirmation, or the note survives deletion

test.use({ storageState: AUTH_STATE });

async function createNote(page: Page, content: string) {
  await page.getByLabel("New note").fill(content);
  await page.getByLabel("New note").press("ControlOrMeta+Enter");
  await expect(page.getByLabel("New note")).toHaveValue("");
}

function noteCard(page: Page, text: string) {
  return page.getByRole("article").filter({ hasText: text });
}

test("notes: create, render, filter, edit with draft, delete", async ({
  page,
}, testInfo) => {
  // Every project and run shares one account, so this run's notes and tags carry a unique id.
  const id = `${testInfo.project.name.charAt(0)}${crypto.randomUUID()}`;
  const deploy = `deploy-${id}`;
  const work = `work-${id}`;
  const personal = `personal-${id}`;
  const release = `release-${id}`;

  const unsafeContent = [
    "<script>window.__xss = 'script'</script>",
    "<img src=x onerror=\"window.__xss = 'img'\">",
    `[click me ${id}](javascript:window.__xss='link')`,
  ].join("\n\n");

  await page.goto("/");

  if (testInfo.project.name === "desktop-chromium") {
    const composerBox = await page.getByLabel("New note").boundingBox();
    expect(composerBox?.width).toBeGreaterThan(500);
  }

  await createNote(
    page,
    `# Deploy log ${id}\n\nShipped **the fix** today. #Deploy-${id} #${work} #${deploy}`
  );
  const composer = page.getByLabel("New note");
  const composerTags = page.locator("form").getByRole("list", { name: "Tags" });

  await composer.fill(`Unrelated thought ${id} about \`#code\``);
  await page.locator("form").getByRole("combobox", { name: "Add tag" }).click();
  await page.getByLabel("Search or create a tag").fill(`Personal-${id}`);
  await page
    .getByRole("option", { name: `Create new tag: #${personal}` })
    .click();
  await expect(composer).toHaveValue(`Unrelated thought ${id} about \`#code\``);
  await expect(composerTags).toHaveText(`#${personal}`);
  await composer.press("ControlOrMeta+Enter");
  await expect(composer).toHaveValue("");

  await composer.fill(`${unsafeContent}\n\n#${work.slice(0, -1)}`);
  await expect(page.getByRole("button", { name: `#${work} 1` })).toBeVisible();
  await composer.press("Enter");
  await expect(composer).toHaveValue(`${unsafeContent}\n\n#${work} `);
  await composer.press("ControlOrMeta+Enter");
  await expect(composer).toHaveValue("");

  const deployNote = noteCard(page, `Deploy log ${id}`);
  const unrelatedNote = noteCard(page, `Unrelated thought ${id}`);
  const unsafeNote = noteCard(page, `click me ${id}`);

  const today = page.getByRole("region", { name: "Today" });
  await expect(today.getByRole("article")).toContainText([
    `click me ${id}`,
    `Unrelated thought ${id}`,
    `Deploy log ${id}`,
  ]);

  await expect(
    deployNote.getByRole("heading", { name: `Deploy log ${id}` })
  ).toBeVisible();
  await expect(deployNote.locator("strong")).toHaveText("the fix");
  await expect(deployNote.getByRole("link", { name: /^#/u })).toHaveText([
    `#${deploy}`,
    `#${work}`,
  ]);
  await expect(unrelatedNote.getByRole("link", { name: /^#/u })).toHaveText([
    `#${personal}`,
  ]);
  await expect(unsafeNote.getByRole("link", { name: /^#/u })).toHaveText([
    `#${work}`,
  ]);

  await deployNote.getByRole("button", { name: `Remove tag ${work}` }).click();
  await expect(deployNote.getByRole("link", { name: /^#/u })).toHaveText([
    `#${deploy}`,
  ]);
  await expect(deployNote).toContainText(
    `today. #Deploy-${id} ${work} #${deploy}`
  );

  await unrelatedNote.getByRole("combobox", { name: "Add tag" }).click();
  await page.getByRole("option", { name: `#${deploy} 1` }).click();
  await expect(unrelatedNote.getByRole("link", { name: /^#/u })).toHaveText([
    `#${deploy}`,
    `#${personal}`,
  ]);

  if (testInfo.project.name === "desktop-chromium") {
    const sidebar = page.getByRole("navigation", { name: "Tags" });

    await Promise.all(
      [
        [deploy, 2],
        [personal, 1],
        [work, 1],
      ].map(([tag, count]) =>
        expect(
          sidebar.getByRole("link").filter({ hasText: `#${tag}` })
        ).toHaveText(`#${tag}${count}`)
      )
    );
  }

  await expect(unsafeNote.locator("script, img")).toHaveCount(0);
  await expect(unsafeNote.locator('a[href*="javascript:" i]')).toHaveCount(0);
  await unsafeNote.getByText(`click me ${id}`).click();
  expect(await page.evaluate(() => "__xss" in window)).toBe(false);

  await page.reload();
  await expect(deployNote).toBeVisible();

  await deployNote.getByRole("link", { name: `#${deploy}` }).click();
  await expect(page).toHaveURL(new RegExp(`\\?tag=${deploy}$`, "u"));
  await expect(
    page.getByRole("heading", { name: `Notes tagged #${deploy}` })
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(unsafeNote).toHaveCount(0);

  await page.getByRole("link", { name: "Clear filter" }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(unsafeNote).toBeVisible();

  await deployNote.getByRole("link", { name: "Edit note" }).click();

  const editor = page.getByLabel("Note", { exact: true });
  const editedContent = `# Deploy log ${id}\n\nRolled back, then shipped _again_. #Release-${id}`;

  await expect(editor).toHaveValue(
    `# Deploy log ${id}\n\nShipped **the fix** today. #Deploy-${id} ${work} #${deploy}`
  );

  await editor.fill(editedContent);
  await page.reload();
  await expect(editor).toHaveValue(editedContent);

  await editor.press("ControlOrMeta+Enter");
  await expect(page).toHaveURL(/\/$/u);
  await expect(deployNote.locator("em")).toHaveText("again");
  await expect(deployNote.getByRole("link", { name: /^#/u })).toHaveText([
    `#${release}`,
  ]);

  await deployNote.getByRole("link", { name: "Edit note" }).click();
  await expect(editor).toHaveValue(editedContent);
  const noteUrl = page.url();

  await page.getByRole("button", { name: "Note actions" }).click();
  await page.getByRole("menuitem", { name: "Delete note" }).click();
  await expect(page).toHaveURL(noteUrl);
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(deployNote).toHaveCount(0);

  await page.goto(noteUrl);
  await expect(page.getByRole("alert")).toContainText("Note not found");
});

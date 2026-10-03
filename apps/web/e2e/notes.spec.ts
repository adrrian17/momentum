import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Failure modes this flow must catch:
// - sign-up does not land on the notes home
// - with no tags yet, the desktop layout collapses the notes column
// - a saved note is not listed, or is lost on reload
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

const UNSAFE_CONTENT = [
  "<script>window.__xss = 'script'</script>",
  "<img src=x onerror=\"window.__xss = 'img'\">",
  "[click me](javascript:window.__xss='link')",
].join("\n\n");

async function signUp(page: Page, email: string) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/u);
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page.getByLabel("New note")).toBeVisible();
  await expect(page).toHaveURL(/\/$/u);
}

async function createNote(page: Page, content: string) {
  await page.getByLabel("New note").fill(content);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel("New note")).toHaveValue("");
}

function noteCard(page: Page, text: string) {
  return page.getByRole("article").filter({ hasText: text });
}

test("notes: create, render, filter, edit with draft, delete", async ({
  page,
}, testInfo) => {
  const runId = `${testInfo.project.name}-${Date.now()}`;

  await signUp(page, `e2e-${runId}@example.com`);

  if (testInfo.project.name === "desktop-chromium") {
    const composerBox = await page.getByLabel("New note").boundingBox();
    expect(composerBox?.width).toBeGreaterThan(500);
  }

  await createNote(
    page,
    "# Deploy log\n\nShipped **the fix** today. #Deploy #work #deploy"
  );
  const composer = page.getByLabel("New note");
  const composerTags = page.locator("form").getByRole("list", { name: "Tags" });

  await composer.fill("Unrelated thought about `#code`");
  await page.locator("form").getByRole("combobox", { name: "Add tag" }).click();
  await page.getByLabel("Search or create a tag").fill("Personal");
  await page.getByRole("option", { name: "Create new tag: #personal" }).click();
  await expect(composer).toHaveValue("Unrelated thought about `#code`");
  await expect(composerTags).toHaveText("#personal");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(composer).toHaveValue("");

  await composer.fill(`${UNSAFE_CONTENT}\n\n#wo`);
  await expect(page.getByRole("button", { name: "#work 1" })).toBeVisible();
  await composer.press("Enter");
  await expect(composer).toHaveValue(`${UNSAFE_CONTENT}\n\n#work `);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(composer).toHaveValue("");

  const deployNote = noteCard(page, "Deploy log");

  await expect(
    deployNote.getByRole("heading", { name: "Deploy log" })
  ).toBeVisible();
  await expect(deployNote.locator("strong")).toHaveText("the fix");
  await expect(deployNote.getByRole("link", { name: /^#/u })).toHaveText([
    "#deploy",
    "#work",
  ]);

  const unrelatedNote = noteCard(page, "Unrelated thought");

  await expect(unrelatedNote.getByRole("link", { name: /^#/u })).toHaveText([
    "#personal",
  ]);
  await expect(
    noteCard(page, "click me").getByRole("link", { name: /^#/u })
  ).toHaveText(["#work"]);

  await deployNote.getByRole("button", { name: "Remove tag work" }).click();
  await expect(deployNote.getByRole("link", { name: /^#/u })).toHaveText([
    "#deploy",
  ]);
  await expect(deployNote).toContainText("today. #Deploy work #deploy");

  await unrelatedNote.getByRole("combobox", { name: "Add tag" }).click();
  await page.getByRole("option", { name: "#deploy 1" }).click();
  await expect(unrelatedNote.getByRole("link", { name: /^#/u })).toHaveText([
    "#deploy",
    "#personal",
  ]);

  if (testInfo.project.name === "desktop-chromium") {
    await expect(
      page.getByRole("navigation", { name: "Tags" }).getByRole("link")
    ).toHaveText(["#deploy2", "#personal1", "#work1"]);
  }

  const unsafeNote = noteCard(page, "click me");

  await expect(unsafeNote.locator("script, img")).toHaveCount(0);
  await expect(unsafeNote.locator('a[href*="javascript:" i]')).toHaveCount(0);
  await unsafeNote.getByText("click me").click();
  expect(await page.evaluate(() => "__xss" in window)).toBe(false);

  await page.reload();
  await expect(deployNote).toBeVisible();

  await deployNote.getByRole("link", { name: "#deploy" }).click();
  await expect(page).toHaveURL(/\?tag=deploy$/u);
  await expect(
    page.getByRole("heading", { name: "Notes tagged #deploy" })
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(noteCard(page, "click me")).toHaveCount(0);

  await page.getByRole("link", { name: "Clear filter" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);

  await deployNote.getByRole("link", { name: "Edit note" }).click();

  const editor = page.getByLabel("Note", { exact: true });

  await expect(editor).toHaveValue(
    "# Deploy log\n\nShipped **the fix** today. #Deploy work #deploy"
  );

  await editor.fill(
    "# Deploy log\n\nRolled back, then shipped _again_. #Release"
  );
  await page.reload();
  await expect(editor).toHaveValue(
    "# Deploy log\n\nRolled back, then shipped _again_. #Release"
  );

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(deployNote.locator("em")).toHaveText("again");
  await expect(deployNote.getByRole("link", { name: /^#/u })).toHaveText([
    "#release",
  ]);

  await deployNote.getByRole("link", { name: "Edit note" }).click();
  await expect(editor).toHaveValue(
    "# Deploy log\n\nRolled back, then shipped _again_. #Release"
  );
  const noteUrl = page.url();

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(noteUrl);
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(deployNote).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(2);

  await page.goto(noteUrl);
  await expect(page.getByRole("alert")).toContainText("Note not found");
});

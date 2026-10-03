import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Failure modes this flow must catch:
// - sign-up does not land on the notes home
// - a saved note is not listed, or is lost on reload
// - tags are not lowercased or deduplicated ("Deploy" and "deploy" must be one tag)
// - Markdown renders as raw text
// - raw HTML or a javascript: link in a note becomes executable
// - clicking a tag does not filter the list, or the filter cannot be cleared
// - the editor does not load the saved note, or saving does not replace content and tags
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

async function createNote(page: Page, content: string, tags: string) {
  await page.getByLabel("New note").fill(content);
  await page.getByRole("textbox", { name: "Tags" }).fill(tags);
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

  await createNote(
    page,
    "# Deploy log\n\nShipped **the fix** today.",
    "Deploy, work, deploy"
  );
  await createNote(page, "Unrelated thought", "personal");
  await createNote(page, UNSAFE_CONTENT, "security");

  const deployNote = noteCard(page, "Deploy log");

  await expect(
    deployNote.getByRole("heading", { name: "Deploy log" })
  ).toBeVisible();
  await expect(deployNote.locator("strong")).toHaveText("the fix");
  await expect(deployNote.getByRole("link", { name: /^#/u })).toHaveText([
    "#deploy",
    "#work",
  ]);

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
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(noteCard(page, "Unrelated thought")).toHaveCount(0);

  await page.getByRole("link", { name: "Clear filter" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);

  await deployNote.getByRole("link", { name: "Edit note" }).click();

  const editor = page.getByLabel("Note", { exact: true });
  const tagsInput = page.getByRole("textbox", { name: "Tags" });

  await expect(editor).toHaveValue(
    "# Deploy log\n\nShipped **the fix** today."
  );
  await expect(tagsInput).toHaveValue("deploy, work");

  await editor.fill("# Deploy log\n\nRolled back, then shipped _again_.");
  await tagsInput.fill("Release");
  await page.reload();
  await expect(editor).toHaveValue(
    "# Deploy log\n\nRolled back, then shipped _again_."
  );
  await expect(tagsInput).toHaveValue("Release");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(deployNote.locator("em")).toHaveText("again");
  await expect(deployNote.getByRole("link", { name: /^#/u })).toHaveText([
    "#release",
  ]);

  await deployNote.getByRole("link", { name: "Edit note" }).click();
  await expect(editor).toHaveValue(
    "# Deploy log\n\nRolled back, then shipped _again_."
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

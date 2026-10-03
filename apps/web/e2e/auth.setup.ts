import { expect, test as setup } from "@playwright/test";

import {
  AUTH_STATE,
  accountEmail,
  signIn,
  submitSignIn,
  submitSignUp,
} from "./account";

// Runs once before the browser projects so they never race to create the account.
setup("create the E2E account once, then sign in", async ({ page }) => {
  const email = accountEmail();

  await page.goto("/login");
  const existingAccount = await submitSignIn(page, email);

  if (!existingAccount.ok()) {
    expect(existingAccount.status()).toBe(401);
    await page.getByRole("button", { name: "Create account" }).click();
    const signUp = await submitSignUp(page, email.toUpperCase());
    expect(signUp.status()).toBe(200);

    await expect(page.getByLabel("New note")).toBeVisible();
    await page.context().clearCookies();
    await page.goto("/login");
    await signIn(page, email);
  }

  await expect(page.getByLabel("New note")).toBeVisible();
  await page.context().storageState({ path: AUTH_STATE });
});

import { expect, test } from "@playwright/test";

import { accountEmail, signIn, submitSignUp } from "./account";

// Failure modes this flow must catch:
// - /login opens on sign-up instead of sign-in
// - an email other than SIGNUP_EMAIL can sign up, or the rejection is not shown
// - SIGNUP_EMAIL in another letter case is rejected
// - the account created once cannot sign in again

test("sign-up accepts only SIGNUP_EMAIL, and that account signs in", async ({
  page,
}, testInfo) => {
  const email = accountEmail();

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/u);
  await expect(
    page.getByRole("heading", { name: "Welcome Back" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Create account" }).click();

  const rejected = await submitSignUp(
    page,
    `not-allowed-${testInfo.project.name}-${Date.now()}@example.com`
  );

  expect(rejected.status()).toBe(403);
  await expect(page.getByText("Sign-up is closed")).toBeVisible();

  // The setup project already created the account, so passing the gate ends in "already exists".
  const otherCase = await submitSignUp(page, email.toUpperCase());

  expect(otherCase.status()).toBe(422);
  await expect(
    page.getByText("User already exists. Use another email.")
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Already have an account? Sign In" })
    .click();
  await signIn(page, email);
});

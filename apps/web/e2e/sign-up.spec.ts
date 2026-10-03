// oxlint-disable sonarjs/prefer-specific-assertions -- Boolean auth checks keep bearer tokens and emails out of failure output.
import { expect, test } from "@playwright/test";

import {
  accountEmail,
  oppositeEmailCase,
  signIn,
  submitSignUp,
} from "./account";

test.use({ trace: "off" });

test("an invalid verification link offers sign-in recovery", async ({
  page,
}) => {
  await page.goto(
    "http://localhost:3000/api/auth/verify-email?token=invalid&callbackURL=http%3A%2F%2Flocalhost%3A3001%2Flogin"
  );
  await expect(page.getByRole("alert")).toHaveText(
    "The verification link is invalid or expired. Sign in to request a new link."
  );
  await signIn(page, accountEmail());
});

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

  const variedEmail = oppositeEmailCase(email);
  expect(variedEmail !== email).toBe(true);
  const otherCase = await submitSignUp(page, variedEmail);

  expect(otherCase.status()).toBe(200);
  const otherCaseBody = await otherCase.json();
  expect(otherCaseBody.token === null).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Check your email" })
  ).toBeVisible();

  const session = await page.request.get(
    "http://localhost:3000/api/auth/get-session"
  );

  expect((await session.json()) === null).toBe(true);

  await page.getByRole("button", { name: "Back to Sign In" }).click();
  await signIn(page, email);
});

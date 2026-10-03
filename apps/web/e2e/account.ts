import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { ENV } from "../src/env";

export const AUTH_STATE = "./e2e-results/.auth/user.json";

// Synthetic dev-only account shared by every project and run.
const PASSWORD = "e2e-password-123";

export function accountEmail() {
  if (!ENV.SIGNUP_EMAIL) {
    throw new Error("Set SIGNUP_EMAIL in apps/server/.env to run E2E");
  }

  return ENV.SIGNUP_EMAIL;
}

export async function submitSignUp(page: Page, email: string) {
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  const response = page.waitForResponse("**/api/auth/sign-up/email");
  await page.locator("form").getByRole("button", { name: "Sign Up" }).click();

  return response;
}

export async function submitSignIn(page: Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  const response = page.waitForResponse("**/api/auth/sign-in/email");
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();

  return response;
}

export async function signIn(page: Page, email: string) {
  const response = await submitSignIn(page, email);
  expect(response.ok()).toBe(true);
  await expect(page.getByLabel("New note")).toBeVisible();
  await expect(page).toHaveURL(/\/$/u);
}

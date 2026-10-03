// oxlint-disable sonarjs/prefer-specific-assertions -- Boolean auth checks keep bearer tokens and emails out of failure output.
import { expect, test as setup } from "@playwright/test";

import {
  AUTH_STATE,
  accountEmail,
  oppositeEmailCase,
  signIn,
  submitSignIn,
  submitSignUp,
} from "./account";
import { confirmSimulatedEmail, verificationMessages } from "./verification";

setup.use({ trace: "off" });

// Runs once before the browser projects so they never race to create the account.
setup(
  "create the E2E account once, then sign in",
  async ({ page }, testInfo) => {
    const email = accountEmail();
    const messages = await verificationMessages();

    await page.goto("/login");
    const existingAccount = await submitSignIn(page, email);
    let registrationStatus: number | undefined;
    let verificationStatus: number | undefined;
    let blockedSignInStatus: number | undefined;

    if (existingAccount.status() === 401) {
      await page.getByRole("button", { name: "Create account" }).click();
      const variedEmail = oppositeEmailCase(email);
      expect(variedEmail !== email).toBe(true);
      const signUp = await submitSignUp(page, variedEmail);
      expect(signUp.status()).toBe(200);
      registrationStatus = signUp.status();
      const signUpBody = await signUp.json();
      expect(signUpBody.token === null).toBe(true);
      await expect(
        page.getByRole("heading", { name: "Check your email" })
      ).toBeVisible();

      await page
        .getByRole("button", { name: "Resend verification email" })
        .click();
      await expect(
        page.getByText(
          "If your account needs verification, a new link was sent."
        )
      ).toBeVisible();
      await page.getByRole("button", { name: "Back to Sign In" }).click();
      const blocked = await submitSignIn(page, email);
      expect(blocked.status()).toBe(403);
      blockedSignInStatus = blocked.status();
      const blockedBody = await blocked.json();
      expect(blockedBody.code).toBe("EMAIL_NOT_VERIFIED");
    } else if (!existingAccount.ok()) {
      expect(existingAccount.status()).toBe(403);
      blockedSignInStatus = existingAccount.status();
      const existingBody = await existingAccount.json();
      expect(existingBody.code).toBe("EMAIL_NOT_VERIFIED");
    }

    if (!existingAccount.ok()) {
      await expect(
        page.getByText("Verify your email before signing in.", { exact: false })
      ).toBeVisible();

      const session = await page.request.get(
        "http://localhost:3000/api/auth/get-session"
      );

      expect((await session.json()) === null).toBe(true);

      const notes = await page.request.get(
        "http://localhost:3000/api/trpc/notes.tags"
      );

      expect(notes.status()).toBe(401);
      verificationStatus = await confirmSimulatedEmail(messages, email);
      await page.goto("/login");
      await signIn(page, email);
    }

    await expect(page.getByLabel("New note")).toBeVisible();
    await page.context().storageState({ path: AUTH_STATE });
    await testInfo.attach("verification-status.json", {
      body: JSON.stringify({
        registrationStatus,
        blockedSignInStatus,
        verificationStatus,
        signedIn: true,
      }),
      contentType: "application/json",
    });
  }
);

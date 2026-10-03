// oxlint-disable sonarjs/prefer-specific-assertions -- Boolean auth checks keep private values out of failures.
import { expect, test as setup } from "@playwright/test";

import {
  AUTH_STATE,
  PASSWORD,
  accountEmail,
  oppositeEmailCase,
  signIn,
  submitSignIn,
} from "./account";
import { bootstrapSyntheticAccount, inspectBootstrap } from "./bootstrap";
import { confirmSimulatedEmail, verificationMessages } from "./verification";

setup.use({ trace: "off" });

setup(
  "bootstrap the private E2E account if empty, verify, then sign in",
  async ({ page }, testInfo) => {
    const email = accountEmail();
    const messages = await verificationMessages();
    const target = await inspectBootstrap();
    let bootstrapStatus: number | undefined;
    let verificationStatus: number | undefined;
    let blockedSignInStatus: number | undefined;

    if (target.userCount === 0) {
      bootstrapStatus = await bootstrapSyntheticAccount(
        oppositeEmailCase(email),
        PASSWORD,
        target.confirmation
      );
      expect(bootstrapStatus).toBe(0);
      const created = await inspectBootstrap();
      expect(created.userCount).toBe(1);
      expect(created.credentialCount).toBe(1);
    }

    await page.goto("/login");
    const existingAccount = await submitSignIn(page, email);

    if (!existingAccount.ok()) {
      expect(existingAccount.status()).toBe(403);
      blockedSignInStatus = existingAccount.status();
      const body = await existingAccount.json();
      expect(body.code).toBe("EMAIL_NOT_VERIFIED");
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

    expect(
      await bootstrapSyntheticAccount(
        `other-${Date.now()}@example.com`,
        `${PASSWORD}-different`,
        target.confirmation
      )
    ).toBe(1);
    const preserved = await inspectBootstrap();
    expect(preserved.userCount).toBe(target.userCount || 1);
    expect(preserved.credentialCount).toBe(target.credentialCount || 1);
    await page.context().clearCookies();
    await page.goto("/login");
    await signIn(page, oppositeEmailCase(email));
    await page.context().storageState({ path: AUTH_STATE });
    await testInfo.attach("verification-status.json", {
      body: JSON.stringify({
        bootstrapStatus,
        blockedSignInStatus,
        verificationStatus,
        repeatBootstrapRefused: true,
        signedIn: true,
      }),
      contentType: "application/json",
    });
  }
);

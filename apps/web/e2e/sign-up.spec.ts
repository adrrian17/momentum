// oxlint-disable sonarjs/prefer-specific-assertions -- Boolean checks keep private values out of failures.
import { expect, test } from "@playwright/test";
import { z } from "zod";

import { ENV } from "../src/env";
import { PASSWORD, accountEmail, oppositeEmailCase, signIn } from "./account";
import { inspectBootstrap } from "./bootstrap";
import { verificationMessages } from "./verification";

test.use({ trace: "off" });

test("an invalid verification link offers sign-in recovery", async ({
  page,
}) => {
  await page.goto(
    `/api/auth/verify-email?token=invalid&callbackURL=${encodeURIComponent(new URL("/login", ENV.AUTH_TEST_BASE_URL).href)}`
  );
  await expect(page.getByRole("alert")).toHaveText(
    "The verification link is invalid or expired. Sign in to request a new link."
  );
  await signIn(page, accountEmail());
});

test("public registration uniformly rejects every candidate without mutation or mail", async ({
  page,
}, testInfo) => {
  const email = accountEmail();
  const before = await inspectBootstrap();
  const messages = await verificationMessages();
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/u);
  await expect(
    page.getByRole("heading", { name: "Welcome Back" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account" })
  ).toHaveCount(0);

  await Promise.all(
    [
      email,
      oppositeEmailCase(email),
      `new-${testInfo.project.name}-${Date.now()}@example.com`,
      "old-policy@example.com",
    ].map(async (candidate) => {
      const response = await fetch(
        new URL("/api/auth/sign-up/email", ENV.AUTH_TEST_BASE_URL),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: new URL(page.url()).origin,
          },
          body: JSON.stringify({
            name: "E2E User",
            email: candidate,
            password: PASSWORD,
          }),
        }
      );

      expect(response.status).toBe(400);

      const body = z
        .object({ code: z.string(), message: z.string() })
        .parse(await response.json());

      expect(body.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
      expect(body.message).toBe("Email and password sign up is not enabled");
    })
  );

  const after = await inspectBootstrap();
  expect(after.userCount).toBe(before.userCount);
  expect(after.credentialCount).toBe(before.credentialCount);
  const afterMessages = await verificationMessages();
  expect(afterMessages.size).toBe(messages.size);

  const session = await page.request.get("/api/auth/get-session");

  expect((await session.json()) === null).toBe(true);
  await signIn(page, email);
});

// oxlint-disable sonarjs/prefer-specific-assertions -- Boolean checks keep bearer tokens out of failure output.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { expect } from "@playwright/test";
import { z } from "zod";

import { ENV } from "../src/env";

const outbox = fileURLToPath(
  new URL("../../../packages/infra/.alchemy/local/email/text/", import.meta.url)
);

export async function verificationMessages() {
  try {
    return new Set(await readdir(outbox));
  } catch (error) {
    if (z.object({ code: z.literal("ENOENT") }).safeParse(error).success) {
      return new Set<string>();
    }

    throw error;
  }
}

export async function confirmSimulatedEmail(
  previousMessages: Set<string>,
  email: string
) {
  let verificationURL: URL | undefined;
  await expect
    .poll(
      async () => {
        const messages = await verificationMessages();

        const texts = await Promise.all(
          messages
            .values()
            .filter(
              (name) => !previousMessages.has(name) && name.endsWith(".txt")
            )
            .map((name) => readFile(`${outbox}/${name}`, "utf-8"))
            .toArray()
        );

        for (const text of texts) {
          const link = text.match(
            /http:\/\/localhost:3000\/api\/auth\/verify-email\?[^\s]+/u
          )?.[0];

          if (!link) {
            continue;
          }

          const url = new URL(link);
          const payload = url.searchParams.get("token")?.split(".")[1];

          if (
            payload &&
            JSON.parse(Buffer.from(payload, "base64url").toString()).email ===
              email.toLowerCase()
          ) {
            verificationURL = url;

            return true;
          }
        }

        return false;
      },
      {
        message:
          "Local Cloudflare simulator saved this account's verification email",
        timeout: 10_000,
      }
    )
    .toBe(true);

  if (!verificationURL) {
    throw new Error("No local verification email found");
  }

  expect(
    verificationURL.searchParams.get("callbackURL") ===
      new URL("/login", ENV.AUTH_TEST_BASE_URL).href
  ).toBe(true);
  // Node fetch keeps the bearer link out of Playwright traces and report attachments.
  let response: Response;

  try {
    response = await fetch(verificationURL, { redirect: "manual" });
  } catch {
    throw new Error("Local email confirmation request failed");
  }

  expect(response.status).toBe(302);
  expect(
    response.headers.get("location") ===
      new URL("/login", ENV.AUTH_TEST_BASE_URL).href
  ).toBe(true);
  expect(response.headers.get("set-cookie") === null).toBe(true);

  return response.status;
}

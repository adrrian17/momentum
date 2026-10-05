// oxlint-disable sonarjs/prefer-specific-assertions -- Boolean checks prevent credential headers appearing in failures.
import { expect, test } from "@playwright/test";

import { ENV } from "../src/env";
import { AUTH_STATE } from "./account";

// Catch asset fallback on API paths, lost request metadata, foreign API requests,
// forged auth origins, and broken static deep links through the actual Worker.
test.use({ trace: "off" });

test("the web Worker forwards API boundaries and preserves origin protection", async ({
  page,
  browser,
}) => {
  const unauthenticated = await page.request.get("/api/trpc/notes.tags");
  expect(unauthenticated.status()).toBe(401);

  await Promise.all(
    ["/api", "/api?probe=boundary", "/api/nonexistent"].map(async (path) => {
      const response = await page.request.get(path, {
        headers: { accept: "text/html" },
      });

      expect(response.status()).toBe(404);
      expect(response.headers()["content-type"]?.includes("text/html")).toBe(
        false
      );
    })
  );

  const context = await browser.newContext({
    baseURL: ENV.AUTH_TEST_BASE_URL,
    storageState: AUTH_STATE,
  });

  try {
    const hostile = await context.request.post("/api/auth/sign-out", {
      headers: {
        origin: "https://hostile.example",
        "content-type": "application/json",
      },
      data: {},
    });

    expect(hostile.status()).toBe(403);
    const authenticated = await context.newPage();
    const apiOrigins = new Set<string>();
    authenticated.on("request", (request) => {
      const url = new URL(request.url());

      if (url.pathname.startsWith("/api/")) {
        apiOrigins.add(url.origin);
      }
    });
    await authenticated.goto("/notes/nonexistent-single-origin");
    await expect(authenticated.getByRole("alert")).toContainText(
      "Note not found"
    );
    expect(apiOrigins.size).toBeGreaterThan(0);
    expect(
      [...apiOrigins].every(
        (origin) => origin === new URL(ENV.AUTH_TEST_BASE_URL).origin
      )
    ).toBe(true);
    const session = await context.request.get("/api/auth/get-session");
    expect(session.ok()).toBe(true);
    expect((await session.json()) !== null).toBe(true);
  } finally {
    await context.close();
  }
});

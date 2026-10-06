import { writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

// Failure modes this check must catch:
// - Chrome reports the app as not installable
// - the manifest loses its name, standalone display, start URL, theme color, or maskable icon
// - the service worker does not serve the precached app shell offline
// - the service worker answers /api navigations with the app shell

test("installable PWA whose service worker skips /api", async ({
  context,
  page,
}, testInfo) => {
  await page.goto("/login");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  const cdp = await context.newCDPSession(page);

  const { installabilityErrors } = await cdp.send(
    "Page.getInstallabilityErrors"
  );

  const { errors, data } = await cdp.send("Page.getAppManifest");
  const manifest: unknown = JSON.parse(data ?? "{}");

  const cachedURLs = await page.evaluate(async () => {
    const names = await caches.keys();

    const entries = await Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);

        const requests = await cache.keys();

        return requests.map((request) => request.url);
      })
    );

    return entries.flat();
  });

  const reportPath = testInfo.outputPath("installability.json");
  await writeFile(
    reportPath,
    JSON.stringify(
      { installabilityErrors, manifestErrors: errors, manifest, cachedURLs },
      null,
      2
    )
  );
  await testInfo.attach("installability.json", {
    path: reportPath,
    contentType: "application/json",
  });
  expect(installabilityErrors).toEqual([]);
  expect(errors).toEqual([]);
  expect(manifest).toMatchObject({
    name: "Momentum",
    short_name: "Momentum",
    display: "standalone",
    start_url: "/",
    theme_color: "#1f1f1f",
    icons: expect.arrayContaining([
      expect.objectContaining({ purpose: "maskable" }),
    ]),
  });
  expect(cachedURLs.length).toBeGreaterThan(0);
  expect(
    cachedURLs.every((url) => !/^\/api(?:\/|$)/u.test(new URL(url).pathname))
  ).toBe(true);

  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon-180x180.png"
  );
  await expect(
    page.locator('meta[name="apple-mobile-web-app-capable"]')
  ).toHaveAttribute("content", "yes");

  await context.setOffline(true);
  await page.goto("/notes/offline");
  await expect(page).toHaveTitle("Momentum");
  await expect(
    page.evaluate(() => fetch("/api/auth/get-session"))
  ).rejects.toThrow();
  await expect(page.goto("/api/auth/get-session")).rejects.toThrow();
  await expect(page.goto("/api")).rejects.toThrow();
  await expect(page.goto("/api?probe=pwa")).rejects.toThrow();
});

import { expect, test } from "@playwright/test";

// Failure mode: the first paint before the app bundle runs uses the light
// theme, so a refresh flashes white before the dark UI mounts.

const cases = [
  { stored: null, scheme: "light", expected: "dark" },
  { stored: "dark", scheme: "light", expected: "dark" },
  { stored: "light", scheme: "dark", expected: "light" },
  { stored: "system", scheme: "dark", expected: "dark" },
  { stored: "system", scheme: "light", expected: "light" },
] as const;

for (const { stored, scheme, expected } of cases) {
  test(`paints ${expected} before the bundle runs (stored ${stored}, OS ${scheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });

    if (stored) {
      await page.addInitScript(
        (theme) => localStorage.setItem("vite-ui-theme", theme),
        stored
      );
    }

    // Without the bundle the page stays at its pre-React first paint.
    await page.route(/\/assets\/.*\.js$/u, (route) => route.abort());
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");

    await expect(page.locator("#app")).toBeEmpty();

    expect(
      await html.evaluate((element) => element.classList.contains("dark"))
    ).toBe(expected === "dark");

    await expect(html).toHaveCSS("color-scheme", expected);
  });
}

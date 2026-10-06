# Installable PWA

A user can install Momentum as a standalone app. Its static shell can load offline, but notes and authentication require the network.

## Sub-features

- `pwa-manifest` provides Momentum's name, standalone display, start URL, theme color, and maskable icon.
- `pwa-ios` provides Apple Touch icon and iOS app metadata.
- `pwa-static-shell` precaches static files without user data.
- `pwa-api-online` excludes API fetches and navigations from caching and app-shell fallback.
- `pwa-install` installs and reopens the standalone app.
- `pwa-update` replaces the service worker automatically after a new build.
- `first-paint-theme` applies the stored or system theme from `index.html` before the bundle runs, so a refresh never flashes the other theme.

## How to get to it (user POV)

- Open the production application and use the browser's install control.
- On iPhone Safari, use **Add to Home Screen**, then open the installed Momentum icon.
- Open an app route without network connectivity to observe the static shell.
- Return to the app after a new deployment to receive the service-worker update.

## Driving it with Playwright

Preconditions:

- Doctor passes and preview port 4173 is free.
- Use a fresh Chromium context with no human session.
- Dev Vite does not register the production service worker.

Run the exact PWA recipe in [the runbook](../references/runbook.md). It selects `pwa-chromium` and saves a unique report.

- Open `/login` on preview and wait for `navigator.serviceWorker.controller`.
- The spec calls CDP `Page.getInstallabilityErrors` and `Page.getAppManifest`. Require empty error arrays and the expected manifest fields, including a maskable PNG.
- Read Cache Storage URLs. Require cached files but no API URLs. The spec also checks the Apple Touch link and `apple-mobile-web-app-capable` metadata.
- Set the context offline and open `/notes/offline`. Require title **Momentum**. This proves the cached shell, not a private note.
- Require API fetch and navigation to fail offline for `/api/auth/get-session`, `/api`, and `/api?probe=pwa`.
- Save and read the `installability.json` attachment and trace. The report must survive preview cleanup.
- Actual installation and reopen need an authorized browser or real iPhone on the production origin. Mark them skipped in a local CDP-only run.
- `theme.spec.ts` runs in the same project. It aborts the app bundle, then requires the `dark` class and `color-scheme` on `html` to match each stored theme and OS preference.
- Auto-update needs two controlled builds served on the same origin and an observed new worker taking control. The current spec checks installability and caching, not this update sequence.

## Gotchas

- An installability check is not proof of a real Safari installation.
- Do not run PWA assertions against port 3001.
- Preview is not the production API host. Do not use it to prove production login or cookie behavior.
- No runtime API caching or offline notes are implemented. A shell title is not proof that private content is available.
- Do not deploy or change DNS just to complete this local recipe.

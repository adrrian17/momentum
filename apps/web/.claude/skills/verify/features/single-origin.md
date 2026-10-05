# One public origin

The browser uses the web Worker for both assets and `/api`. The separate server Worker is private and reached through its native service binding.

## Sub-features

- `origin-api` keeps browser API requests on the web origin.
- `origin-boundaries` prevents `/api` and descendants receiving SPA HTML.
- `origin-cookie` uses host-only Lax/HttpOnly cookies and Secure under HTTPS.
- `origin-csrf` rejects a hostile auth origin with an existing session.
- `origin-deep-link` serves client routes while forwarding authenticated API queries.

## How to get to it (user POV)

Open the one public web URL, sign in, and open a note route. Verification links return to the same origin's `/login`. There is no separate public API URL.

## Driving it with Playwright

Run `single-origin.spec.ts --project=desktop-chromium --project=iphone-webkit` with the runbook's evidence options. Dependencies run private setup. The actual Alchemy entry and service binding are required; bare Vite proxy is not proof.

Require API 401 without a session, unknown and exact API 404 with HTML Accept, hostile sign-out 403 with the saved synthetic session, successful session lookup afterward, and the missing-note alert on a direct static deep link. Observe every browser API request using the configured web origin. Setup verifies cookie attributes without printing cookie values and confirms the actual simulator URL. Auth traces remain off.

## Gotchas

Unauthenticated sign-out has no session to mutate and may return 200. The hostile-origin assertion needs a cookie. Local HTTP cookies are intentionally not Secure. HTTPS cookie generation needs separate local integration proof or a separately authorized live check. Physical Safari installation and production routing are outside local WebKit proof.

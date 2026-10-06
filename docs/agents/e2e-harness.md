# E2E harness reference

Read this before editing `apps/web/e2e/**`. These are the guarantees the specs enforce; keep them when changing tests.

## Setup and bootstrap

- Setup inspects the selected local D1 and bootstraps only when it is empty, through the private CLI with JSON stdin. It uses an email case variant on fresh creation to exercise normalization. An existing verified synthetic account is reused.
- Unverified sign-in returns 403 and resends. Setup asserts no session and notes API 401, reads the new simulator message, confirms through Node fetch, then signs in and stores cookies. Confirmation must not set session cookies. The token endpoint and callback must use the web origin.
- A second bootstrap with a different email and password must refuse without changing user or credential counts, and the original password must still sign in.
- Only setup confirms the shared account, so browser projects do not race.
- A per-stage filesystem lease serializes private CLI calls, because concurrent local D1 gateways can fail. It holds no account data, is removed in `finally`, and an interrupted run leaves a safe refusal instead of deleting another process's lease.

## Closed signup

Submit the existing email, its opposite case and unrelated new emails. Each valid request returns 400, code `EMAIL_PASSWORD_SIGN_UP_DISABLED`, message `Email and password sign up is not enabled`, with user, credential and simulator message counts unchanged. The login page has no **Create account** button. There is no configuration-dependent variant.

## Single origin

On Chromium and WebKit, through the real web Worker and service binding: anonymous API 401; exact `/api` and unknown API paths 404 without HTML fallback; authenticated hostile-origin rejection; static deep links; browser API requests on the web origin. Setup checks host-only Lax HttpOnly cookies and the verification URL origin. The bare Vite proxy is disabled under Alchemy and is not the E2E transport.

## Notes

Use unique text and tags, preserve existing notes, and delete only the test's own fixture.

## Privacy

Auth traces are disabled. Use Node fetch for bearer links and credentials so they stay out of Playwright traces.

## PWA

`pwa-chromium` builds the production bundle and serves Vite preview on 4173. It checks the manifest, Chrome installability, cache contents, Apple Touch metadata, the offline static shell and rejected offline API requests.

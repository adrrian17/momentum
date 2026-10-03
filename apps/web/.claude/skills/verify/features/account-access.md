# Account access

A user signs in to view private notes. Registration accepts only the configured email, requires email verification, and provides a way to request another link.

## Sub-features

- `auth-sign-in` signs in a verified account.
- `auth-closed-sign-up` rejects a different email and rejects all registration when the allowlist is unset.
- `auth-case-variation` permits a different letter case of the configured email.
- `auth-verification` blocks an unverified account until its owner confirms the link.
- `auth-resend` requests another verification email.
- `auth-invalid-link` explains an invalid or expired link.
- `auth-sign-out` ends access through the user menu.

## How to get to it (user POV)

- Open `/` without a session, or choose **Sign In** in the header.
- Open `/login`, then choose **Create account** for registration.
- Use **Back to Sign In** or **Already have an account? Sign In** to return.
- Open the received verification link. Use **Resend verification email** on the pending screen, or attempt sign-in again when unverified.
- Open the header menu named after the signed-in user, then choose **Sign Out**.

## Driving it with Playwright

Preconditions:

- Doctor passes, the account is synthetic, and the local email binding is not remote.
- Use setup to serialize confirmation; auth tests disable traces to protect credentials and bearer links.

Run `pnpm --filter web exec playwright test sign-up.spec.ts --project=desktop-chromium --project=iphone-webkit` with the runbook's private report options.

- Sign-in uses `getByLabel("Email")`, `getByLabel("Password")`, and the form's **Sign In** button. Require **New note** and URL `/`.
- Registration uses **Create account**, fields **Name**, **Email**, **Password**, and the form's **Sign Up** button. A disallowed email returns 403 and visible **Sign-up is closed**.
- Submit `oppositeEmailCase(accountEmail())` and assert that it differs from the configured value. Duplicate registration returns generic 200 with no token; it must not create a session or change the password.
- Fresh setup asserts **Check your email**, clicks **Resend verification email**, and observes sign-in 403, null session, and notes API 401. `e2e/verification.ts` reads newly generated simulator text, confirms via Node fetch, and asserts 302 without session cookies before sign-in succeeds.
- The invalid-link test visits the real verification endpoint with an invalid token. Require the recovery alert and successful subsequent sign-in.
- Header sign-in and sign-out need an additional browser check. Click the current user's menu, choose **Sign Out**, and require `/login`; revisit `/` and confirm no private notes appear.
- Closed-default registration needs the controlled empty-binding restart described in the testing guide. Do not count a disallowed-email test as proof of unset configuration.

## Gotchas

- Existing verified setup skips initial registration, resend, and the before-verification gate. Use a new local stage for fresh-account proof; never reset the shared database.
- Existing unverified accounts receive a link on sign-in. Preserve their records.
- Do not display or attach verification URLs. Confirm only a synthetic registration initiated by the test.
- Verification does not stop an attacker reserving an email first. Do not confirm unsolicited registrations.
- Local delivery simulation does not prove production sender-domain readiness.

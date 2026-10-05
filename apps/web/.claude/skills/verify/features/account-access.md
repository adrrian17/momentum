# Account access

Users sign in to access private notes. The operator creates the single account with a private CLI on an empty database. Public registration is always closed. Email verification is required.

## Sub-features

- `auth-sign-in` signs in a verified account, including an email case variant.
- `auth-closed-sign-up` rejects all public candidates with an identical response and no mutation or mail.
- `auth-private-bootstrap` creates an unverified account through the private CLI only on an empty local D1.
- `auth-verification` blocks access until the owner confirms the link.
- `auth-resend` requests another verification through unverified sign-in.
- `auth-invalid-link` explains an invalid or expired link.
- `auth-sign-out` ends access through the user menu.

## How to get to it (user POV)

- Open `/` without a session, or choose **Sign In** in the header.
- Open `/login` and fill **Email** and **Password**. Account creation is absent.
- Open the verification link after authorized bootstrap. Attempt sign-in again to resend a pending link.
- Open the signed-in user's header menu and choose **Sign Out**.
- The operator follows the private [bootstrap runbook](../../../../../../docs/agents/runtime.md#private-account-bootstrap). This is a CLI operation, not a web entry point.

## Driving it with Playwright

Require Doctor success, a synthetic `AUTH_TEST_EMAIL`, matching local stage and origin, and a local EMAIL binding. Setup serializes account creation and confirmation. Auth specs disable traces.

Run `pnpm --filter web exec playwright test sign-up.spec.ts --project=desktop-chromium --project=iphone-webkit` with the private evidence options in the runbook.

- Sign-in uses `getByLabel("Email")`, `getByLabel("Password")`, and the form's **Sign In** button. Require **New note** and URL `/`.
- Public signup tests use Node fetch to submit existing, case-varied and new emails. Require the exact built-in 400 code/message, unchanged database counts, no extra simulator messages and no session. The login UI must have zero **Create account** buttons.
- Fresh setup calls the real private CLI with stdin before any sign-in, then asserts sign-in 403, null session and notes API 401. `e2e/verification.ts` reads new actual simulator text and confirms via Node fetch. Require the verification URL and callback on the web origin, and 302 without session cookies before normal sign-in succeeds.
- Setup attempts a second bootstrap with another email and password. Require nonzero exit and unchanged counts. Sign in with the original password afterward.
- The invalid-link test visits the real verification endpoint with an invalid token. Require the recovery alert and successful subsequent sign-in.
- Header sign-in and sign-out need an additional browser check. Click the current user's menu, choose **Sign Out**, and require `/login`; revisit `/` and confirm no private notes appear.
- The separate real D1 probe in the testing guide verifies rollback, two-process distinct-email concurrency and record preservation. It is additional evidence outside the 10 Playwright tests.

## Gotchas

- Existing verified setup skips first creation and before-verification behavior. Use a new local stage for fresh-account proof; never reset the shared database.
- Leave `AUTH_TEST_EMAIL` unset in the shell or deliberately aligned with its file. Playwright and Alchemy load different schemas. They must share the selected origin and stage.
- Bootstrap refuses any nonempty user table, even when its email differs from the requested identity. It cannot replace or recover an account.
- Do not display or attach verification URLs. Confirm only a synthetic bootstrap initiated by the test.
- Unsolicited verification can still be social engineering. Standard public resend behavior is outside signup closure.
- Local simulation does not prove production sender readiness or remote bootstrap execution.

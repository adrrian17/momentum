# Runtime and deployment

Read this guide when changing the server runtime, database, environment schemas, or deployment configuration.

## Cloudflare and database

- The web app and server target Cloudflare. Worker database access uses the native `DB` binding defined in `packages/infra/alchemy.run.ts`.
- Use Drizzle migrations in `packages/db/src/migrations`, also in development: after a schema change run `pnpm run db:generate`, and Alchemy applies pending migrations on `deploy` and when `alchemy dev` starts. Deleting `packages/infra/.alchemy/local/d1` leaves an empty database, because Alchemy state still records the migrations as applied; recreate it with `pnpm -F @momentum/infra exec alchemy dev --force`. A local `DATABASE_URL` is for database tooling.
- Keep `CORS_ORIGIN` aligned with the deployed web origin. Verify the Alchemy stage before deploying or destroying resources.

## Environment configuration

- Environment schemas live in `.env.schema`. Regenerate `src/env.ts` with `pnpm run env:generate` after schema changes. Keep secrets in ignored environment files or platform configuration.
- Use the app's environment accessor. Workers read native bindings through the existing server integration, and browser code uses `apps/web/src/env.public.ts`.
- Run standalone environment-dependent tools from the owning application directory. Generating types does not initialize environment values for another command.
- Public Better Auth always uses `emailAndPassword.disableSignUp: true`. There is no allowlist, bootstrap Worker binding, environment toggle, admin plugin or administrative HTTP route. Valid signup attempts return the same built-in 400 code and message before email lookup.
- Legacy ignored `SIGNUP_EMAIL` values are inert and need not be deleted. The synthetic E2E email belongs in the sensitive `AUTH_TEST_EMAIL` setting in `apps/web/.env`.

## Private account bootstrap

Run from the repository root. This command operates on the existing migrated D1 named by the `database` resource in the explicitly selected Momentum stage. It never provisions resources, applies schema changes, replaces users or deletes data. It refuses if any user exists. Local mode is the default, requires local Alchemy state with a `dev:` database ID, and cannot silently target Cloudflare. Remote mode requires `--remote` and rejects local IDs.

Inspect the intended local target first:

```bash
pnpm -F @momentum/infra auth:bootstrap --stage e2e-bootstrap --database database --inspect
```

The output contains a confirmation string with the mode, stack, stage and resolved physical database name, plus record counts. Copy that exact confirmation for the write:

```bash
pnpm -F @momentum/infra auth:bootstrap --stage e2e-bootstrap --database database \
  --confirm 'local:momentum/e2e-bootstrap/<resolved-physical-name>' \
  --auth-url http://localhost:3000
```

Name, email, password and password confirmation are hidden terminal prompts. Nothing echoes these values. Never pass a password in argv or environment variables. `--stdin` instead accepts one bounded JSON object containing `name`, `email` and `password` through a pipe, for a secret-manager integration or synthetic E2E. Do not use literal shell commands, shell history or temporary files to hold private input.

Only the private, unserved Better Auth 1.7.7 instance enables signup. Its supported `auth.api.signUpEmail` and official memory adapter validate the password, normalize email and generate the default credential hash. No plaintext credential is inserted and no custom hashing algorithm is used. Drizzle-generated Zod schemas validate the resulting records before insertion. The records exist only in process memory until one native D1 batch inserts the user conditional on an empty user table and inserts the credential conditional on that invocation's generated user ID. D1 executes the batch atomically. Concurrent operators with different emails can produce at most one account; a failed credential insert rolls back the user. No interactive D1 transaction or schema migration is assumed. Repeated invocation exits nonzero with a generic refusal and preserves all existing records.

After persistence the command POSTs `send-verification-email` to the explicitly supplied auth origin. Use the backend attached to that same stage and database. This goes through the public Better Auth verification callback and Cloudflare binding. The private instance never marks email verified or creates a session. Exit 2 means the account was saved but the verification request failed; signing in resends the link. A 200 acknowledges the request, not recipient delivery. Standard public resend can return a generic success for an unknown account, so the operator must align the backend with the selected database.

Alchemy 2.0.0-beta.80 provides `D1.QueryDatabaseLocal`, its local workerd gateway, profile credentials, resource references and native HTTP D1 client. The CLI uses those installed APIs and the existing `createDb` without a custom emulator or database type casts. Local state is read from `packages/infra/.alchemy/state`; `dev:local` uses the file state store to avoid cloud state calls. The normal deployment entrypoint and its Cloudflare state store are unchanged.

For a separately authorized production operation, first prepare an empty migrated D1, deploy the public backend with signup disabled and verification configured, and prepare the sender domain. The chosen Alchemy profile must already have cached Cloudflare state-store credentials matching its account. The command reads this cache directly and refuses if missing or mismatched; it cannot bootstrap or deploy a state store. Shell Cloudflare credential settings can override profile resolution, so use a shell aligned with the intended account and inspect the explicit target. Do not print credentials or profiles.

```bash
pnpm -F @momentum/infra auth:bootstrap --remote --stage production --database database --profile default --inspect
pnpm -F @momentum/infra auth:bootstrap --remote --stage production --database database --profile default \
  --confirm 'remote:momentum/production/<resolved-physical-name>' \
  --auth-url https://<deployed-auth-origin>
```

The remote path is inspected and typechecked, not verified live. These examples are operator instructions, not permission to run a remote write or send a real email. Resetting an existing account remains outside this command's scope.

## Email verification

`packages/auth` requires email verification and receives its delivery callback from `apps/server/src/services.ts`. The application sends structured `{ from, to, subject, text }` through the native `EMAIL` binding. `EMAIL_FROM` is a required sensitive email with the default `noreply@adrianayala.mx`, imported by the infrastructure schema. The Alchemy binding permits only that sender. No Routing, Address, or DNS resource is provisioned by this integration.

Better Auth 1.7.7 sends verification on the bootstrap's public verification request and on unverified sign-in. Confirmation returns to the absolute web-origin `/login`, derived from `CORS_ORIGIN`; it does not sign the user in. Protected API procedures also require a verified email, so sessions issued before this requirement cannot access notes until confirmation. Existing sessions are not deleted. Links expire after one hour. A failed send returns a safe 503 message. Signing in again retries delivery for a pending account. Delivery is awaited so the UI does not claim success after a binding failure. Better Auth's own logger is disabled because it can log account email addresses. The existing HTTP logger records paths without query strings, keeping verification tokens out of request logs. Do not log delivery bodies, callback URLs, or provider error payloads.

Under `alchemy dev`, the installed Alchemy 2.0.0-beta.80 simulator persists structured message text at `packages/infra/.alchemy/local/email/text/*.txt`; raw MIME messages use `.eml`. It does not deliver email. Its built-in console output includes recipient headers and private file paths, so keep dev logs local. Never decorate this binding with `Alchemy.remote()` for development or share its outbox.

Before production delivery, the operator must confirm Email Service beta access and onboard `adrianayala.mx` as a sending domain on the same Cloudflare account. [Cloudflare domain setup](https://developers.cloudflare.com/email-service/get-started/send-emails/) describes the required DNS verification records. Sending to arbitrary recipients requires Workers Paid; verified destinations are available on the free path according to [Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/). The installed descriptor and [binding documentation](https://developers.cloudflare.com/email-service/configuration/send-bindings/) describe verified destination restrictions for the unrestricted legacy path. Confirm the account's sending entitlement and recipient restrictions before deployment. The local simulator cannot prove production sender verification or delivery. Domain onboarding, DNS changes, destination verification, and deployment require a separate authorized operation.

Closed public registration prevents an unauthenticated caller from reserving the owner's email or choosing its password. Verification and sign-in still have their standard public behavior, including resend and potential account-existence signals outside signup. Confirm only a verification you initiated; unsolicited verification remains a social-engineering risk. Account recovery and credential reset are outside this change.

## PWA assets

`apps/web/vite.config.ts` builds a service worker with `autoUpdate`. Precache contains static assets only, including fonts. Runtime caching is disabled, and `/api` plus its descendants are excluded from the navigation fallback. Notes and authentication remain online operations. The production build emits `manifest.webmanifest`, `sw.js`, and the Workbox script in `apps/web/dist/`.

Regenerate icons from `apps/web/public/logo.svg` with `pnpm --filter web generate-pwa-assets`. The manifest references the generated PNGs; `index.html` references the favicon and Apple Touch icon.

## Commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install dependencies and generate environment types |
| `pnpm run dev` | Start the Alchemy development environment |
| `pnpm run db:generate` | Generate Drizzle migration files |
| `pnpm run env:generate` | Regenerate environment types |
| `pnpm run deploy` | Deploy the selected Alchemy stage |
| `pnpm run destroy` | Destroy resources in the selected Alchemy stage |

See the [README setup and deployment instructions](../../README.md) for details. Update affected guides when commands or configuration responsibilities change.

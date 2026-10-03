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
- `SIGNUP_EMAIL` is an optional, sensitive email in `apps/server/.env.schema`, imported by the infrastructure schema. The Worker receives an empty string when it is unset, so sign-up is closed by default. Set it to the initial account's email to allow registration, ignoring case. Restart the dev stack after changes. Verified accounts can sign in regardless of this allowlist. Unverified accounts receive a verification link on sign-in and cannot create a session until they confirm it.

## Email verification

`packages/auth` requires email verification and receives its delivery callback from `apps/server/src/services.ts`. The application sends structured `{ from, to, subject, text }` through the native `EMAIL` binding. `EMAIL_FROM` is a required sensitive email with the default `noreply@adrianayala.mx`, imported by the infrastructure schema. The Alchemy binding permits only that sender. No Routing, Address, or DNS resource is provisioned by this integration.

Better Auth 1.7.7 sends on sign-up and unverified sign-in. Confirmation returns to the absolute web-origin `/login`, derived from `CORS_ORIGIN`; it does not sign the user in. Protected API procedures also require a verified email, so sessions issued before this requirement cannot access notes until confirmation. Existing sessions are not deleted. Links expire after one hour. A failed send returns a safe 503 message. Signing in again retries delivery for a pending account; the check-email screen also offers explicit resend. Duplicate sign-up returns a generic 200 with a null token, even for an existing verified account, and does not replace its password or send a new link.

Delivery is awaited so the UI does not claim success after a binding failure. Better Auth's own logger is disabled because it can log account email addresses. The existing HTTP logger records paths without query strings, keeping verification tokens out of request logs. Do not log delivery bodies, callback URLs, or provider error payloads.

Under `alchemy dev`, the installed Alchemy 2.0.0-beta.80 simulator persists structured message text at `packages/infra/.alchemy/local/email/text/*.txt`; raw MIME messages use `.eml`. It does not deliver email. Its built-in console output includes recipient headers and private file paths, so keep dev logs local. Never decorate this binding with `Alchemy.remote()` for development or share its outbox.

Before production delivery, the operator must confirm Email Service beta access and onboard `adrianayala.mx` as a sending domain on the same Cloudflare account. [Cloudflare domain setup](https://developers.cloudflare.com/email-service/get-started/send-emails/) describes the required DNS verification records. Sending to arbitrary recipients requires Workers Paid; verified destinations are available on the free path according to [Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/). The installed descriptor and [binding documentation](https://developers.cloudflare.com/email-service/configuration/send-bindings/) describe verified destination restrictions for the unrestricted legacy path. Confirm the account's sending entitlement and recipient restrictions before deployment. The local simulator cannot prove production sender verification or delivery. Domain onboarding, DNS changes, destination verification, and deployment require a separate authorized operation.

Email verification blocks immediate password sign-in after an attacker reserves the allowlisted email. It does not prevent that reservation from denying the owner registration, and confirming an attacker-initiated email can activate the attacker's chosen password. Only confirm registrations you initiated. Closing `SIGNUP_EMAIL` after creating the intended account limits new registration; it does not resolve an account already claimed by someone else. An authenticated bootstrap or credential recovery would be separate work.

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

# Runtime and deployment

Read this before editing the database, auth, server, infrastructure, environment schemas or PWA config.

## Rules

- Change the schema in `packages/db`, then run `pnpm run db:generate`. Alchemy applies pending migrations on deploy and when `alchemy dev` starts. Never use `db:push`, reset D1 or delete stage data.
- Workers reach D1 only through the native `DB` binding in `packages/infra/alchemy.run.ts`. A local `DATABASE_URL` is for database tooling only.
- The browser uses relative `/api` paths. The web Worker forwards them to the private server through the native `API` service binding; the server keeps `workersDev: false`. Do not add a server URL setting.
- `CORS_ORIGIN` is the only origin setting and is also bound as `BETTER_AUTH_URL`. Do not add `APP_ORIGIN` or a server self-URL. After changing the origin resolver, run the [origin settings probe](testing.md#probes).
- Public signup stays disabled (`emailAndPassword.disableSignUp: true`). Do not add an allowlist, bootstrap binding, environment toggle, admin plugin or admin route. Accounts come only from the [bootstrap CLI](../runbooks/account-bootstrap.md).
- Get separate authorization before any deploy, `destroy`, remote binding or other cloud operation. Read the matching runbook first:
  - [Account bootstrap](../runbooks/account-bootstrap.md): running `auth:bootstrap` or editing `packages/infra/scripts/bootstrap*.ts`.
  - [Production domains](../runbooks/production-domains.md): changing a production origin or hostname.
  - [Isolated cloud stage](../runbooks/cloud-stage.md): testing a change against real Cloudflare bindings.

## Environment

- Each app's schema lives in `.env.schema`. Run `pnpm run env:generate` after changing it to regenerate `src/env.ts`. Keep secrets in ignored env files or platform configuration.
- Workers read native bindings. Varlock configures operator and test tooling only.
- Run env-dependent standalone tools from the owning app directory. `env:generate` does not load values for a later command.
- Leave legacy ignored `SIGNUP_EMAIL`, `VITE_SERVER_URL` and standalone `BETTER_AUTH_URL` values in place; they are inert.
- If `packages/infra/.alchemy/local/d1` was deleted, Alchemy still records migrations as applied. Recreate the database with `pnpm -F @momentum/infra exec alchemy dev --force`.

## Email verification

- `packages/auth` requires a verified email; protected API procedures reject unverified sessions. The callback in `apps/server/src/services.ts` sends `{ from, to, subject, text }` through the native `EMAIL` binding. The binding permits only `EMAIL_FROM` (default `noreply@adrianayala.mx`).
- Await delivery and return a safe 503 on failure, so the UI never claims success after a binding error.
- Confirmation redirects to `/login` on the `CORS_ORIGIN` origin and must not create a session. Links expire after one hour; signing in while unverified resends.
- Keep Better Auth's logger disabled and the HTTP logger free of query strings. Never log delivery bodies, callback URLs or provider error payloads.
- Locally, the Alchemy simulator writes messages to `packages/infra/.alchemy/local/email/text/*.txt` (raw MIME as `.eml`) and delivers nothing. Its console shows recipients, so keep dev logs local. Never wrap `EMAIL` in `Alchemy.remote()` for development.
- Local tests prove only the simulator. Claim the deployed binding works only after an [isolated cloud stage](../runbooks/cloud-stage.md) delivery.
- Domain onboarding, DNS, Routing or Address resources, and a MIME dependency each need separate authorization. Account recovery and credential reset are out of scope.

## PWA

- `apps/web/vite.config.ts` builds an `autoUpdate` service worker that precaches static assets only. Keep runtime caching disabled and `/api/**` excluded from the navigation fallback; notes and auth stay online-only.
- Regenerate icons from `apps/web/public/logo.svg` with `pnpm --filter web generate-pwa-assets`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run dev` | Start the Alchemy development environment |
| `pnpm run db:generate` | Generate Drizzle migrations |
| `pnpm run env:generate` | Regenerate environment types |
| `pnpm run deploy` | Deploy the selected stage (authorization required) |
| `pnpm run destroy` | Destroy the selected stage's resources (authorization required) |

Update this guide and the runbooks when commands or configuration responsibilities change.

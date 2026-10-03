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
- `SIGNUP_EMAIL` is an optional, sensitive email in `apps/server/.env.schema`, imported by the infrastructure schema. The Worker receives an empty string when it is unset, so sign-up is closed by default. Set it to the initial account's email to allow registration, ignoring case. Restart the dev stack after changes. Sign-in for existing accounts does not depend on it.

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

# Momentum

Momentum is a personal work journal for capturing notes and activities and turning them into monthly reports.

Momentum will bring capture, organization, and reporting into one application, replacing a workflow of collecting scattered notes into a text file and asking an agent to produce a PDF using an existing report template. This includes PDF generation and eventual delivery.

This monorepo will contain all Momentum applications and shared components. Momentum is built for personal use.

## Planned capabilities

These capabilities describe the product direction and are not implemented yet:

- Activity entries with a date and a brief description of work performed. Tags can capture project context.
- Configurable reminders to record work, initially within the app, with VAPID web push notifications planned for the PWA on phones.
- Tasks users can choose to add to the activity log. Completing a task does not automatically add it.
- Related notes, activities, tasks, and meetings, with tags for organization and discovery.
- Meeting recording and audio uploads, speech-to-text transcription, later analysis, and optional summaries.
- A native macOS app written in Swift for local transcription and text generation using local models or Apple tools.
- Monthly PDF reports using the existing template, with eventual report delivery from Momentum.

## Current state

The repository currently provides authentication, Markdown notes with tags in the web app (create, filter by tag, edit, delete, and local drafts of unsaved input), an installable PWA, shared UI components, and Cloudflare deployment infrastructure. The planned capabilities above still need to be built.

The PWA caches static assets and updates its service worker automatically. Notes and authentication require a network connection; API responses are never cached. On iPhone, use Safari's **Add to Home Screen** to install it. Push notifications and offline notes are not implemented.

The login page offers sign-in only. Public account registration is always disabled. The operator creates the single account through a private bootstrap command on an empty database. Accounts must verify their email before signing in. Confirmation returns to sign-in without creating a session; signing in while unverified requests another link. Existing verified accounts and notes are preserved. See the [bootstrap runbook](docs/runbooks/account-bootstrap.md).

## Privacy

Notes, activity records, tasks, and meeting content are private. Cloudflare is the chosen hosting platform. Sending that content to other external services for processing or delivery requires the developer's explicit authorization. Local processing is the intended direction for the macOS app.

Agent instructions start in [AGENTS.md](AGENTS.md).

## Stack

The initial stack was generated with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Cloudflare Workers** - Server runtime
- **Drizzle** - TypeScript-first ORM
- **Cloudflare D1** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting started

First, install the dependencies:

```bash
pnpm install
```

## Database setup

This project uses Cloudflare D1 (SQLite) with Drizzle ORM.

Runtime database access uses the Cloudflare `DB` binding from `packages/infra/alchemy.run.ts`. If a local `DATABASE_URL` is present, it is only for database tooling.

Alchemy provisions the D1 database and applies migrations during `deploy`.

1. Generate migration files:

```bash
pnpm run db:generate
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application. Browser API requests use the same web origin under `/api`. The separate local server listener on 3000 is for Alchemy development; the web Worker uses a native service binding.

## UI customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@momentum/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `pnpm run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

For Cloudflare, Alchemy loads and validates deployment inputs with `varlock/auto-load` in its Node/Bun deployment process. Worker code reads native bindings; web clients call relative `/api` paths and need no browser server URL. Alchemy supplies managed database credentials and the private API service binding. In-Worker Varlock protections are deferred until an official Alchemy integration is available; see [the non-Wrangler deployment guidance](https://varlock.dev/integrations/cloudflare/#non-wrangler-deploy-tools-alchemy-sst-pulumi).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

Public auth has no registration allowlist or bootstrap environment switch. Legacy ignored `SIGNUP_EMAIL`, `VITE_SERVER_URL` and standalone `BETTER_AUTH_URL` values can stay in local files; they have no application effect.

Verification uses the native Cloudflare `EMAIL` binding with `EMAIL_FROM=noreply@adrianayala.mx` by default. Local Alchemy development saves messages without delivering them. The deployed binding was verified on an isolated cloud stage on 2026-10-04, delivering to the account's verified destination; arbitrary recipients and a sender domain are not set up. See the [isolated cloud stage runbook](docs/runbooks/cloud-stage.md).

For E2E, configure a dedicated synthetic `AUTH_TEST_EMAIL` in `apps/web/.env`. This sensitive test setting is never exposed to the browser or imported into the public server. Copy the old synthetic email there when migrating; retain existing ignored values and secrets. The harness uses an isolated local stage and private bootstrap. See the [E2E guide](apps/web/e2e/AGENTS.md).

## Regenerate PWA icons

Run `pnpm --filter web generate-pwa-assets` after editing `apps/web/public/logo.svg` or `apps/web/pwa-assets.config.ts`. The generator creates the manifest icons, maskable icon, Apple Touch icon, and favicon. Commit the SVG, config, and generated images together. The M uses the light theme's `--brand` color, with the glyph inside the maskable safe zone. The manifest and HTML theme color match the dark `--background` token in `packages/ui/src/styles/globals.css`.

## Deployment

### Alchemy

- Target: web on Cloudflare + server on Cloudflare
- Configure provider accounts: `cd packages/infra && pnpm exec alchemy profile edit`
- Dev: pnpm run dev
- Deploy: pnpm run deploy
- Destroy: pnpm run destroy

Provider profiles are stored under `~/.alchemy`. This project uses Cloudflare.

Deploys are staged and default to a personal `dev_<username>` stage. For production, run the deploy with an explicit stage from `packages/infra`:

```bash
cd packages/infra && pnpm exec alchemy deploy --stage production
```

### Production origins

The browser, auth, and notes API share one public web Worker origin. The server has no public hostname. Remote stages can use their stage-derived `workers.dev` origin. Production also accepts `https://momentum.adrianayala.mx` or the temporary `https://next.momentum.adrianayala.mx` hostname. A production custom origin attaches that hostname to the web Worker and disables its `workers.dev` URLs. See the [origin runbook](docs/runbooks/production-domains.md) and [single-origin decision](docs/adr/0001-single-origin-for-web-and-api.md). Code support does not establish DNS ownership or perform a deployment.

## Project structure

```
momentum/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Cloudflare Worker API (Hono, tRPC)
└── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   ├── db/          # Database schema, queries, and migrations
│   ├── infra/       # Cloudflare resources and Alchemy deployment
│   └── config/      # Shared tooling configuration
```

The Swift macOS app is planned and does not have a directory yet.

## Available scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run check`: Check formatting and lint rules
- `pnpm run fix`: Apply formatting and lint fixes
- `pnpm run env:generate`: Regenerate environment types
- `pnpm --filter web e2e`: Verify private bootstrap, closed public registration, notes on Chromium and iPhone WebKit, and PWA installability
- `pnpm --filter web generate-pwa-assets`: Regenerate PWA icons from the SVG
- `pnpm run db:generate`: Generate Drizzle migration files
- `pnpm run deploy`: Deploy Cloudflare resources with Alchemy
- `pnpm run destroy`: Destroy resources in the selected Alchemy stage

# Momentum

Momentum is a personal work journal for capturing notes and activities and turning them into monthly reports.

Momentum will bring capture, organization, and reporting into one application, replacing a workflow of collecting scattered notes into a text file and asking an agent to produce a PDF using an existing report template. This includes PDF generation and eventual delivery.

This monorepo will contain all Momentum applications and shared components. Momentum is built for personal use.

## First milestone: notes

Build the notes experience in the web app first:

- Write notes in Markdown without a separate title.
- Assign multiple tags to a note and use tags to find related content.
- Organize work through tags without a separate project entity.

The web app and server will run on Cloudflare. Offline access and editing can come later.

## Planned capabilities

These capabilities describe the product direction and are not implemented yet:

- Activity entries with a date and a brief description of work performed. Tags can capture project context.
- Configurable reminders to record work, initially within the app, with VAPID web push notifications planned for an installable PWA on phones.
- Tasks users can choose to add to the activity log. Completing a task does not automatically add it.
- Related notes, activities, tasks, and meetings, with tags for organization and discovery.
- Meeting recording and audio uploads, speech-to-text transcription, later analysis, and optional summaries.
- A native macOS app written in Swift for local transcription and text generation using local models or Apple tools.
- Monthly PDF reports using the existing template, with eventual report delivery from Momentum.

## Current state

The repository currently provides authentication, Markdown notes with tags in the web app (create, filter by tag, edit, delete, and local drafts of unsaved input), shared UI components, and Cloudflare deployment infrastructure. The planned capabilities above still need to be built.

## Product principles

Keep the experience simple and the code efficient, readable, and maintainable. Build one useful workflow at a time and reuse existing packages before adding new machinery.

Notes, activity records, tasks, and meeting content are private. Cloudflare is the chosen hosting platform. Sending that content to other external services for processing or delivery requires the developer's explicit authorization. Local processing is the intended direction for the macOS app.

See [AGENTS.md](AGENTS.md) for guidance when changing this repository.

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

In development, run `pnpm run dev` once so Alchemy creates the local D1, then push schema changes to it:

```bash
pnpm run db:push
```

Generate migration files only for changes that ship to production:

```bash
pnpm run db:generate
```

Run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application. The API is running at [http://localhost:3000](http://localhost:3000).

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

For Cloudflare, Alchemy loads and validates deployment inputs with `varlock/auto-load` in its Node/Bun deployment process. Worker code reads native bindings; web clients use the framework's public env API through `src/env.public.ts` where needed. Alchemy supplies resource URLs and managed database credentials. In-Worker Varlock protections are deferred until an official Alchemy integration is available; see [the non-Wrangler deployment guidance](https://varlock.dev/integrations/cloudflare/#non-wrangler-deploy-tools-alchemy-sst-pulumi).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

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

- Required after the first deploy: set `CORS_ORIGIN` in `apps/server/.env` to the exact deployed web origin, such as `https://app.example.com`, then deploy the server again.

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
- `pnpm run db:push`: Push the Drizzle schema to the local dev D1
- `pnpm run db:generate`: Generate Drizzle migration files
- `pnpm run deploy`: Deploy Cloudflare resources with Alchemy
- `pnpm run destroy`: Destroy resources in the selected Alchemy stage

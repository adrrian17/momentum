# Momentum

Momentum is a personal work journal for capturing notes and activities and turning them into monthly reports. Work content is private: Cloudflare hosts it, and nothing else receives it without explicit authorization.

## Status

Works today:

- Sign-in for a single operator-created account with email verification; public registration is disabled. See the [bootstrap runbook](docs/runbooks/account-bootstrap.md).
- Markdown notes with tags: create, filter by tag, edit, delete, and local drafts of unsaved input.
- Installable PWA (on iPhone, Safari's **Add to Home Screen**). It caches static assets only; notes and sign-in need a network connection.
- Cloudflare deployment on a single web origin. See the [production domains runbook](docs/runbooks/production-domains.md) and [single-origin decision](docs/adr/0001-single-origin-for-web-and-api.md).

Planned ([product scope](docs/agents/product-scope.md)): activities, tasks, reminders with web push, meeting recording and transcription, a local-first macOS app, offline notes, and monthly PDF reports.

## Quick start

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001). The API is served from the same origin under `/api`.

## Common tasks

- `pnpm run dev:web` / `pnpm run dev:server`: Start only the web app or the server
- `pnpm run build`: Build all applications
- `pnpm run check-types`: Check TypeScript types
- `pnpm run check` / `pnpm run fix`: Check or apply formatting and lint rules
- `pnpm run db:generate`: Generate Drizzle migrations after a schema change; Alchemy applies them on `dev` and `deploy`
- `pnpm run env:generate`: Regenerate `src/env.ts` after editing an app's `.env.schema`
- `pnpm --filter web e2e`: Run the end-to-end suite (needs `AUTH_TEST_EMAIL`; see the [E2E guide](apps/web/e2e/AGENTS.md))
- `pnpm --filter web generate-pwa-assets`: Regenerate PWA icons after editing `apps/web/public/logo.svg` or `apps/web/pwa-assets.config.ts`
- `npx shadcn@latest add <component> -c packages/ui`: Add a shared UI primitive, imported as `@momentum/ui/components/<component>`

Commit `.env.schema` files. Keep secrets in ignored env files or the deployment platform.

## Deployment

Configure the Cloudflare profile once with `cd packages/infra && pnpm exec alchemy profile edit`. Deploys default to a personal `dev_<username>` stage; name production explicitly:

```bash
cd packages/infra && pnpm exec alchemy deploy --stage production
```

`pnpm run destroy` removes the selected stage. Before testing against real Cloudflare bindings, follow the [isolated cloud stage runbook](docs/runbooks/cloud-stage.md).

## Project structure

```
momentum/
├── apps/
│   ├── web/         # React PWA (TanStack Router, Tailwind)
│   └── server/      # Cloudflare Worker API (Hono, tRPC)
└── packages/
    ├── ui/          # Shared shadcn/ui components and styles
    ├── api/         # API layer / business logic
    ├── auth/        # Better-Auth configuration
    ├── db/          # Drizzle schema and D1 migrations
    ├── infra/       # Cloudflare resources and Alchemy deployment
    └── config/      # Shared tooling configuration
```

## Further reading

- [AGENTS.md](AGENTS.md): agent instructions and the index of guides
- [CONTEXT.md](CONTEXT.md): domain terms
- [Infra guide](packages/infra/AGENTS.md): configuration, email and the bootstrap CLI
- [Runbooks](docs/runbooks/) and [decisions](docs/adr/)

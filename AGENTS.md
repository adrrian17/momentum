# Momentum

Personal work journal: notes, activities, monthly PDF reports. Use pnpm from the repository root. Read the [README](README.md) for setup and implementation status.

## Always

- Never send private work content (notes, activities, tasks, audio, transcripts, summaries, reports) to an external service for AI processing, analytics, logging or delivery without the developer's explicit authorization for that use. Only Cloudflare hosting of the web app, server and database is approved.
- Never let task completion create an activity. The user chooses which tasks become activities.
- Build only the requested stage. Do not implement or scaffold planned features.
- Never print or log credentials, secrets or private content.
- Get separate explicit authorization for each deploy, remote write, cloud operation or real email send.
- When a change crosses packages, trace the flow through client, API and database.

## Before you act

| When you are about to | Read first |
| --- | --- |
| Plan a feature or change product behavior | [Product scope](docs/agents/product-scope.md) |
| Name or rename a domain concept | [Domain glossary](CONTEXT.md) |
| Write code, typecheck or commit | [Coding standards](CODING_STANDARDS.md) |
| Add a package, move code between packages, or change the request flow | [Architecture](docs/agents/architecture.md) |
| Edit `packages/db/**`, `packages/auth/**`, `packages/infra/**`, `apps/server/**`, any `.env.schema`, or PWA config | [Runtime](docs/agents/runtime.md) |
| Write tests, start a local stack, or run E2E | [Testing](docs/agents/testing.md) |
| Verify a change in the real web app | [Web verification skill](apps/web/.claude/skills/verify/SKILL.md) |
| Run `auth:bootstrap` or edit the bootstrap CLI | [Account bootstrap runbook](docs/runbooks/account-bootstrap.md) |
| Change a production origin or hostname | [Production domains runbook](docs/runbooks/production-domains.md) |
| Deploy to test real Cloudflare bindings | [Isolated cloud stage runbook](docs/runbooks/cloud-stage.md) |

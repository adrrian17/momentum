# Momentum

Personal work journal. Use pnpm from the repository root. The [README](README.md) has setup and implementation status; [CONTEXT.md](CONTEXT.md) defines domain terms.

## Always

- Never send private work content (notes, activities, tasks, audio, transcripts, summaries, reports) to an external service for AI processing, analytics, logging or delivery without the developer's explicit authorization for that use. Only Cloudflare hosting of the web app, server and database is approved.
- Enforce authentication and per-user ownership in every API procedure and database operation.
- Never print or log credentials, secrets or private content.
- Get separate explicit authorization for each deploy, `destroy`, remote write, DNS or domain change, or real email send.
- Never run `db:push`, reset D1 or delete stage data. After changing the schema in `packages/db`, run `pnpm run db:generate`.
- Stop only processes you started and recorded.
- Never let task completion create an activity. The user chooses which tasks become activities.
- Build only the requested stage. Do not implement or scaffold planned features.

## Read first

- Planning or changing product behavior: [product scope](docs/agents/product-scope.md).
- Writing code, tests or commits: [coding standards](CODING_STANDARDS.md).
- Editing `packages/infra` (origins, bindings, email, bootstrap CLI): [infra guide](packages/infra/AGENTS.md).
- Running E2E or starting a local stack: [E2E guide](apps/web/e2e/AGENTS.md).
- Verifying a change in the real web app: [verify skill](apps/web/.claude/skills/verify/SKILL.md).
- Running `auth:bootstrap`: [account bootstrap runbook](docs/runbooks/account-bootstrap.md).
- Changing a production origin or hostname: [production domains runbook](docs/runbooks/production-domains.md).
- Testing against real Cloudflare bindings: [isolated cloud stage runbook](docs/runbooks/cloud-stage.md).
- Changing the request flow or origins: [single-origin decision](docs/adr/0001-single-origin-for-web-and-api.md).

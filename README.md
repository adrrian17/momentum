# Momentum

A personal work journal for capturing notes and activities and turning them into monthly reports. Work content stays private: Cloudflare hosts it, and nothing else receives it without explicit authorization.

Works today:

- Sign-in for one account with email verification. Registration is closed; the operator creates the account with the [bootstrap runbook](docs/runbooks/account-bootstrap.md).
- Markdown notes with tags: create, filter, edit, delete, and local drafts.
- Installable PWA (iPhone: Safari's **Add to Home Screen**). Notes and sign-in need a network connection.

Everything else in the [product scope](docs/agents/product-scope.md) is planned.

## Run locally

```bash
pnpm install
pnpm run dev
```

Open <http://localhost:3001>; the API is served from the same origin under `/api`. Commit `.env.schema` files and keep secrets in ignored env files. `pnpm run` lists the other scripts.

## Deploy

Set up the Cloudflare profile once, then deploy. Without `--stage`, deploys go to a personal `dev_<username>` stage:

```bash
pnpm -F @momentum/infra exec alchemy profile edit
pnpm -F @momentum/infra exec alchemy deploy --stage production
```

Before changing a production hostname or testing real Cloudflare bindings, follow the [production domains](docs/runbooks/production-domains.md) or [cloud stage](docs/runbooks/cloud-stage.md) runbook.

## Further reading

[AGENTS.md](AGENTS.md) indexes the guides; [CONTEXT.md](CONTEXT.md) defines domain terms; [decisions](docs/adr/) record architecture choices.

# Private account bootstrap

Read this before running `auth:bootstrap`. Implementation invariants for the CLI live in [packages/infra/AGENTS.md](../../packages/infra/AGENTS.md#bootstrap-cli).

## Rules

- Run from the repository root. Always `--inspect` first, then pass its exact confirmation string to `--confirm`.
- Local mode is the default and needs local Alchemy state with a `dev:` database ID. `--remote` is a remote write: get separate authorization, and never run it against production as part of testing.
- Supply name, email and password only through the hidden prompts or `--stdin` (one JSON object with `name`, `email`, `password`, piped from a secret manager or synthetic E2E). Never put them in argv, environment variables, shell history or temporary files.
- Never print credentials, profiles or the account email.
- The command refuses if any user exists. Do not reset or delete accounts to rerun it.

## Local

```bash
pnpm -F @momentum/infra auth:bootstrap --stage e2e-bootstrap --database database --inspect
pnpm -F @momentum/infra auth:bootstrap --stage e2e-bootstrap --database database \
  --confirm 'local:momentum/e2e-bootstrap/<resolved-physical-name>' \
  --auth-url http://localhost:3001
```

`--inspect` prints the confirmation string (mode, stack, stage, resolved physical database name) and record counts.

## Remote (production)

Preconditions, all separately authorized:

1. An empty, migrated D1, with the web and server Workers deployed, signup disabled and verification configured.
2. A sender and destination combination the account can deliver to.
3. An Alchemy profile with cached Cloudflare state-store credentials for that account. The command reads this cache and refuses if it is missing or mismatched. Shell Cloudflare credential variables override profile resolution, so use a shell aligned with the intended account.

```bash
pnpm -F @momentum/infra auth:bootstrap --remote --stage production --database database --profile default --inspect
pnpm -F @momentum/infra auth:bootstrap --remote --stage production --database database --profile default \
  --confirm 'remote:momentum/production/<resolved-physical-name>' \
  --auth-url https://momentum.adrianayala.mx
```

## Auth origin

- Pass the public web origin of the same stage and database: `https://momentum.adrianayala.mx` in production, `https://next.momentum.adrianayala.mx` during a hostname rehearsal, or an HTTP loopback origin on the selected web port locally. Remote mode requires HTTPS. Credentials, paths, queries and fragments are rejected.
- After saving the account, the command POSTs `send-verification-email` to that origin. Exit 2 means the account was saved but the request failed; signing in resends the link. A 200 acknowledges the request, not delivery. Resend can report success for an unknown account, so a mismatched origin fails silently.
- Confirm only a verification you initiated.

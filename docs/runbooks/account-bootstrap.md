# Private account bootstrap

Read this before running `auth:bootstrap` or editing `packages/infra/scripts/bootstrap*.ts`.

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

## Implementation invariants

Keep these when editing the CLI:

- Never provision resources, apply migrations, replace users or delete data. Reject local IDs in remote mode and never fall back from local to Cloudflare.
- Only the private, unserved Better Auth instance enables signup. Use `auth.api.signUpEmail` with the official memory adapter for password validation, email normalization and the default hash. No plaintext credential, no custom hashing.
- Validate records with the Drizzle-generated Zod schemas, then write them in one native D1 batch: the user conditional on an empty user table, the credential conditional on that invocation's user ID. Do not assume an interactive transaction.
- Never mark an email verified or create a session.
- Repeated runs exit nonzero with a generic refusal and change nothing.
- Use the installed Alchemy D1 APIs and the existing `createDb`. No custom emulator or database type casts. `dev:local` uses the file state store; leave the normal deploy entrypoint and its state store unchanged.

After a change, run the bootstrap probe on a new empty stage:

```bash
ALCHEMY_DEV_ONCE=1 pnpm -F @momentum/infra exec alchemy dev \
  --config scripts/local.alchemy.ts --stage e2e-bootstrap-probe-<unique-run-id> --include database
pnpm -F @momentum/infra exec bun run scripts/verify-bootstrap.ts \
  --stage e2e-bootstrap-probe-<same-run-id>
```

The probe requires zero users. It forces a credential-insert failure with its own temporary trigger to prove rollback, races two distinct-email processes, then checks refusal and record preservation. It keeps the winning account and all stage data, so use a new stage for each run. Exit 0 is success. It sends no email and issues no session.

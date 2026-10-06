# Infra

`alchemy.run.ts` deploys the stack; `scripts/local.alchemy.ts` runs it locally with a file state store and no cloud calls. Every deploy, `destroy` or `--remote` run needs separate authorization; follow the matching runbook linked from the root [AGENTS.md](../../AGENTS.md#read-first).

## Configuration

- `CORS_ORIGIN` is the only origin setting and is also bound as `BETTER_AUTH_URL`. Do not add `APP_ORIGIN`, a server URL or a server self-URL. See the [single-origin decision](../../docs/adr/0001-single-origin-for-web-and-api.md).
- After editing `src/web-settings.ts`, run `pnpm -F @momentum/infra exec bun run scripts/verify-web-settings.ts`. It is offline and loads no credentials; it does not prove DNS, TLS, zone ownership or routing.
- Workers reach D1 only through the `DB` binding. A local `DATABASE_URL` is for database tooling only.
- If `.alchemy/local/d1` was deleted, Alchemy still records migrations as applied. Recreate it with `pnpm -F @momentum/infra exec alchemy dev --force`.

## Email

- Never wrap `EMAIL` in `Alchemy.remote()` for development. Locally the simulator writes messages to `.alchemy/local/email/text/*.txt` (raw MIME as `.eml`) and delivers nothing. Its console shows recipients, so keep dev logs local.
- Local tests prove only the simulator. Claim the deployed binding works only after an [isolated cloud stage](../../docs/runbooks/cloud-stage.md) delivery.
- Domain onboarding, DNS, Email Routing or Address resources, and a MIME dependency each need separate authorization.

## Bootstrap CLI

Keep these when editing `scripts/bootstrap*.ts`:

- Never provision resources, apply migrations, replace users or delete data. Reject local IDs in remote mode and never fall back from local to Cloudflare.
- Only the private, unserved Better Auth instance enables signup. Use `auth.api.signUpEmail` with the official memory adapter for password validation, email normalization and the default hash. No plaintext credential, no custom hashing.
- Validate records with the Drizzle-generated Zod schemas, then write them in one native D1 batch: the user conditional on an empty user table, the credential conditional on that invocation's user ID. Do not assume an interactive transaction.
- Never mark an email verified or create a session.
- Repeated runs exit nonzero with a generic refusal and change nothing.
- Use the installed Alchemy D1 APIs and the existing `createDb`. No custom emulator or database type casts. Leave the normal deploy entrypoint and its state store unchanged.
- Keep the inspect-then-exact-confirm flow and hidden-prompt or `--stdin` input; credentials never go in argv, environment variables or files.

After a change, run the probe on a new empty stage:

```bash
ALCHEMY_DEV_ONCE=1 pnpm -F @momentum/infra exec alchemy dev \
  --config scripts/local.alchemy.ts --stage e2e-bootstrap-probe-<unique-run-id> --include database
pnpm -F @momentum/infra exec bun run scripts/verify-bootstrap.ts \
  --stage e2e-bootstrap-probe-<same-run-id>
```

The probe requires zero users. It forces a credential-insert failure with its own temporary trigger to prove rollback, races two distinct-email processes, then checks refusal and record preservation. It keeps the winning account and all stage data, so use a new stage for each run. Exit 0 is success. It sends no email and issues no session.

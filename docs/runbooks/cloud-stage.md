# Isolated cloud stage

Read this before testing a change against real Cloudflare bindings, such as native `EMAIL` delivery. The deploy, bootstrap and email send each need separate authorization.

## Rules

- Use a new stage, never production, for example `auth-origin-smoke-<date>`.
- Do not reuse a production target, delete accounts, or print profiles, secrets or the destination address.
- Delivery is established only to the account's verified destination. Do not assume arbitrary recipients, a sender domain or Workers Paid.

## Steps

1. Confirm the Alchemy profile, its account `workers.dev` subdomain and the one intended verified destination.
2. Keep `BETTER_AUTH_SECRET` (at least 32 characters) in the ignored server configuration or a secure process setting, never in shell history or logs. Leave `EMAIL_FROM` at its default.
3. Deploy. Clearing `__VARLOCK_ENV` lets the infra schema resolve the process override; keep the same `CORS_ORIGIN` override for every later operation on this stage.

   ```bash
   __VARLOCK_ENV='' CORS_ORIGIN='https://momentum-<stage>-web.<account-workers-subdomain>.workers.dev' \
     pnpm -F @momentum/infra exec alchemy deploy --stage <stage>
   ```

4. Bootstrap the empty migrated stage with `--remote --stage <stage> --profile <selected-profile>` and the same `--auth-url`, following the [bootstrap runbook](account-bootstrap.md).
5. Confirm the received verification email, then sign in and exercise the protected API.

Keep status-only evidence under the ignored `apps/web/e2e-results/evidence/`.

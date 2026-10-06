# Production origins and custom domains

Read this before changing a production origin or hostname. Every deploy below needs separate authorization.

## Rules

- Use stage `production`, the same profile, the same web Worker and the same D1 for rehearsal, cutover and rollback. A different stage means different resources and data.
- Never reset D1, change stage or profile, or delete resources, including during rollback.
- Local checks cannot prove hostname ownership, certificates, DNS or live routing.

## Allowed origins

`CORS_ORIGIN` sets the public web origin and `BETTER_AUTH_URL`.

- Local: an HTTP loopback origin.
- Remote nonproduction: exactly the stage-derived `workers.dev` origin.
- Production: also `https://momentum.adrianayala.mx` or `https://next.momentum.adrianayala.mx`. The stage-derived `workers.dev` origin stays valid for rollback.

A custom origin attaches exactly that hostname to the `web` Worker in zone `adrianayala.mx` and disables its `workers.dev` and preview URLs. The `server` Worker stays private. Deploying a local or `workers.dev` origin sets `domain: null`, which removes custom domains Alchemy manages on that Worker.

## Preflight

1. Review [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/). The zone must be active and owned by the account; Cloudflare rejects a hostname that has a CNAME record or is assigned to another Worker.
2. Inspect both hostnames' DNS and Worker mappings.
3. Record the current production origin.
4. Alchemy detaches the old managed domain before attaching the new one and does not move another application's mapping. If a conflict requires detaching one, that is a separate authorized operation; record how to restore it first. A failed attachment can leave the web Worker without a custom domain until rollback.

## Rehearsal

```bash
__VARLOCK_ENV='' CORS_ORIGIN='https://next.momentum.adrianayala.mx' \
  pnpm -F @momentum/infra exec alchemy deploy --stage production --profile <selected-profile>
```

Verify the web app and API against the existing production data.

## Cutover

```bash
__VARLOCK_ENV='' CORS_ORIGIN='https://momentum.adrianayala.mx' \
  pnpm -F @momentum/infra exec alchemy deploy --stage production --profile <selected-profile>
```

A new hostname is a new browser origin. Cookies, local drafts and PWA installs do not carry over; users sign in and reinstall.

## Rollback

Deploy the recorded previous origin with the same command, stage and profile. Restore any detached application mapping as a separate operation.

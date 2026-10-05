# Single origin for web and API

Momentum serves the browser, authentication, and notes API from one public web origin. The web Worker forwards API requests to the private server through its native service binding. Production can use either approved custom hostname, while other remote stages use their stage-specific `workers.dev` hostname.

The web Worker owns static assets and `apps/web/src/worker.ts`. Its native `API` service binding targets the separate server Worker. Requests for `/api` and `/api/*` run the web Worker first, including HTML navigations, then pass the original Request to `API.fetch`. The backend Response returns intact, including cookies and redirects. Other paths use the static asset binding with SPA fallback. [Cloudflare's SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) supports these selective worker-first patterns.

The server sets `workersDev: false`, which the installed Alchemy 2.0.0-beta.80 provider lowers to disabled stable and preview URLs. Local and nonproduction web Workers enable their stable `workers.dev` URL and disable previews. Production accepts its existing stage-derived `workers.dev` origin for compatibility and rollback. It can also accept `momentum.adrianayala.mx` or `next.momentum.adrianayala.mx`, attach exactly that hostname in zone `adrianayala.mx`, and disable `workers.dev` and domain previews. No server hostname or zone route is provisioned.

The public Worker has the deterministic name `momentum-<stage>-web`, lowercased with underscores changed to hyphens. The operator sets `CORS_ORIGIN` to the intended public origin. Local development accepts HTTP loopback. Remote nonproduction stages accept only `https://momentum-<stage>-web.<account-workers-subdomain>.workers.dev`. Production accepts the two approved custom hostnames or its stage-derived `workers.dev` hostname. Despite its historical name, `CORS_ORIGIN` is the canonical web origin. Alchemy binds it as both `CORS_ORIGIN` and `BETTER_AUTH_URL` on the private server. Configuration rejects paths, queries, credentials, wrong protocols, wrong stage Worker names, and unapproved hosts. Local checks cannot establish zone ownership or account association.

This graph is acyclic. Web binds server, and server binds D1 and EMAIL. Server never references web.url or its own disabled Worker.URL. An existing-stage Worker.ref does not solve initial deployment, so no such reference is used. The normal and local entrypoints share the same web resource definition.

Browser clients use relative `/api/auth` and `/api/trpc` paths. Better Auth uses the explicit public origin, preserves trusted desktop origins and requires verification. Verification links and `/login` callbacks use the same public origin. Cookies are host-only, HttpOnly and SameSite=Lax, with Secure under HTTPS. There is no browser CORS middleware and no origin derived from incoming Host, Origin or forwarded headers. Better Auth's origin checks remain enabled.

## Considered options

- Separate workers.dev sites require third-party cookies and fail Safari's cookie restrictions.
- Separate custom subdomains add DNS, CORS and another public address.
- A custom domain plus a server zone route was the earlier proposed direction. The web Worker remains the only public host and forwards API requests through the private binding.
- Reading web.url while web binds server creates a dependency cycle. Explicit operator configuration gives initial deployment a known origin.

## Local verification

Real Alchemy dev uses workerd and the native service binding. The bare Vite server alone uses a `/api` proxy to port 3000. This proxy is disabled when Alchemy injects its runtime, so it cannot mask a broken Worker entry during E2E. The private bootstrap CLI accepts an explicit local loopback web origin or a remote HTTPS origin.

API paths never receive the SPA fallback or service-worker cache. E2E covers authenticated requests on the web origin, cookie attributes, unauthenticated API 401, unknown API 404, deep links, verification and hostile-origin rejection. WebKit is not a claim of installation on a physical iPhone. A hostname change creates a new browser origin. Host-only cookies, local drafts, and PWA installation state do not move to the new hostname. This code change does not deploy Workers or change DNS. Local checks do not prove custom-domain ownership, TLS, or live routing.

## Production hostname rehearsal

Use `next.momentum.adrianayala.mx` for a production rehearsal only after separately authorizing it. Deploy it to stage `production` with the same account profile, web Worker, and D1. After the rehearsal succeeds, switch `CORS_ORIGIN` to `https://momentum.adrianayala.mx` in the same stage.

Alchemy removes the previous managed attachment from Momentum's Worker before adding the requested hostname. Cloudflare rejects hostnames with an existing CNAME, a zone the account does not own, or another Worker assignment. Alchemy does not move another application's mapping. A failed live attach can leave Momentum's Worker without a custom domain until rollback. Inspect both hostnames and record the prior production origin before cutover. If a separate approved change detaches another application's mapping, record and perform its restoration separately. Roll back by deploying the previous origin to the same stage and profile. Do not change stages or profiles, reset D1, or delete resources.

A later authorized deploy with a noncustom `CORS_ORIGIN` sets `domain: null` and removes custom-domain attachments managed on this Worker.

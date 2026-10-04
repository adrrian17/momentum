# Single origin for web and API

Momentum serves the browser, authentication and notes API from one stable public `workers.dev` origin. The developer approved this implementation before production deployment, without DNS changes.

The web Worker owns static assets and `apps/web/src/worker.ts`. Its native `API` service binding targets the separate server Worker. Requests for `/api` and `/api/*` run the web Worker first, including HTML navigations, then pass the original Request to `API.fetch`. The backend Response returns intact, including cookies and redirects. Other paths use the static asset binding with SPA fallback. [Cloudflare's SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) supports these selective worker-first patterns.

The server sets `workersDev: false`, which the installed Alchemy 2.0.0-beta.80 provider lowers to disabled stable and preview URLs. The web enables its stable URL and disables version previews. No custom domain or zone route is provisioned.

The public Worker has the deterministic name `momentum-<stage>-web`, lowercased with underscores changed to hyphens. The operator sets `CORS_ORIGIN` to `https://momentum-<stage>-web.<account-workers-subdomain>.workers.dev` before the first authorized deploy. Despite its historical name, this setting is the canonical public web origin. Alchemy binds it as both `CORS_ORIGIN` and `BETTER_AUTH_URL` on the private server. Configuration rejects a path, query, credentials, wrong protocol, wrong stage Worker name or non-workers.dev production host. The operator must confirm the account's actual workers.dev subdomain and profile; local validation cannot verify that live account association.

This graph is acyclic. Web binds server, and server binds D1 and EMAIL. Server never references web.url or its own disabled Worker.URL. An existing-stage Worker.ref does not solve initial deployment, so no such reference is used. The normal and local entrypoints share the same web resource definition.

Browser clients use relative `/api/auth` and `/api/trpc` paths. Better Auth uses the explicit public origin, preserves trusted desktop origins and requires verification. Verification links and `/login` callbacks use the same public origin. Cookies are host-only, HttpOnly and SameSite=Lax, with Secure under HTTPS. There is no browser CORS middleware and no origin derived from incoming Host, Origin or forwarded headers. Better Auth's origin checks remain enabled.

## Considered options

- Separate workers.dev sites require third-party cookies and fail Safari's cookie restrictions.
- Separate custom subdomains add DNS, CORS and another public address.
- A custom domain plus a server zone route was the earlier proposed direction. The approved workers.dev service-binding design replaces that proposal and needs no DNS.
- Reading web.url while web binds server creates a dependency cycle. Explicit operator configuration gives initial deployment a known origin.

## Local verification

Real Alchemy dev uses workerd and the native service binding. The bare Vite server alone uses a `/api` proxy to port 3000. This proxy is disabled when Alchemy injects its runtime, so it cannot mask a broken Worker entry during E2E. The private bootstrap CLI accepts an explicit local loopback web origin or a remote HTTPS origin.

API paths never receive the SPA fallback or service-worker cache. E2E covers authenticated requests on the web origin, cookie attributes, unauthenticated API 401, unknown API 404, deep links, verification and hostile-origin rejection. WebKit is not a claim of installation on a physical iPhone. This code task performs no cloud deployment or real email delivery; the parent owns the separately authorized isolated-stage test.

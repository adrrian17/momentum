# Single origin for web and API

Production serves both the web app and the API from `momentum.adrianayala.mx`: the web Worker owns the hostname as a Custom Domain, and the server Worker takes the route `momentum.adrianayala.mx/api/*`, which runs before the Custom Domain. With the default `*.workers.dev` URLs the two Workers are different sites (`workers.dev` is on the Public Suffix List), so the Better Auth session cookie becomes a third-party cookie that Safari on iOS blocks, and sign-in fails in the installed PWA. On one origin the cookie is first-party with the default `SameSite=Lax`, CORS disappears, and the client calls relative `/api/...` paths.

## Considered Options

- Separate subdomains (`momentum.` and `api.momentum.`): same-site, so cookies work, but it keeps CORS, a second hostname, and an absolute server URL in the client for no benefit.
- Keep `workers.dev` with `SameSite=None`: breaks on iOS and depends on browsers allowing third-party cookies.

## Consequences

Every server endpoint lives under `/api` (`/api/auth/*`, `/api/trpc/*`); anything outside it is served by the web app. Local development mirrors this with a Vite proxy from `/api` to the server.

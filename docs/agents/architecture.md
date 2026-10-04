# Architecture and data handling

Read this guide when changing application code or package boundaries. All Momentum applications and shared components belong in this monorepo.

## Package responsibilities

| Location | Responsibility |
| --- | --- |
| `apps/web` | React and Vite client, TanStack Router and Query, public Worker forwarding `/api` through its native service binding |
| `apps/server` | Hono Worker, HTTP handlers, auth endpoints, tRPC mounting, runtime bindings |
| `packages/api` | tRPC procedures and shared API types |
| `packages/auth` | Better Auth configuration |
| `packages/db` | Drizzle schema, database access, and migrations |
| `packages/ui` | Shared shadcn components and global styles |
| `packages/infra` | Alchemy resources and Cloudflare deployment |
| `packages/config` | Shared tooling configuration |

Keep UI primitives in `packages/ui` and application-specific behavior in `apps/web`. Shared packages receive configuration or initialized clients from the application.

Reuse existing packages, platform features, and installed dependencies before adding another abstraction or dependency. Avoid scaffolding interfaces, factories, and wrappers for unrequested capabilities.

## User content

- Treat Markdown as untrusted input when rendering it. Do not allow executable HTML or unsafe links.
- Protect personal data behind authentication and enforce ownership in database operations. Personal use does not make public endpoints safe.
- Validate input at trust boundaries.
- Handle errors without silently losing user content. Avoid logging private content or secrets.
- Use semantic HTML, labeled controls, and keyboard-accessible interactions.

Update affected guides when package responsibilities change. See [runtime](runtime.md) for configuration and [testing](testing.md) before writing code.

## Public request flow

The browser uses one public web origin. The web Worker forwards `/api` and `/api/*` to the private server Worker with the original Request and Response. Other paths use static assets and SPA fallback. Auth and tRPC clients use relative paths; database and EMAIL bindings remain on the server. See the [single-origin decision](../adr/0001-single-origin-for-web-and-api.md).

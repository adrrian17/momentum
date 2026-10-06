# Coding standards

Ultracite (Oxlint + Oxfmt) enforces lint and formatting. Do not restate its rules; fix what it reports.

## Checks

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm exec ultracite check` | Check lint and formatting |
| `pnpm exec ultracite fix` | Apply lint and formatting fixes |
| `pnpm run check-types` | Typecheck every package through Turbo, including infra scripts |
| `pnpm run build` | Build every package |

Before committing, run `pnpm exec ultracite fix`, inspect the diff, and run relevant type and real behavior checks. The Lefthook pre-commit hook also runs `ultracite fix` on staged code files and restages them.

## Code

- Reuse existing packages, platform features, and installed dependencies before adding another abstraction or dependency. Do not scaffold interfaces, factories, or wrappers for unrequested capabilities.

## User content

- Treat Markdown as untrusted input when rendering it. Do not allow executable HTML or unsafe links.
- Protect personal data behind authentication and enforce ownership in database operations. Personal use does not make public endpoints safe.
- Validate input at trust boundaries.
- Handle errors without silently losing user content. Do not log private content or secrets.
- Use semantic HTML, labeled controls, and keyboard-accessible interactions.

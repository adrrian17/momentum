# Coding standards

Ultracite (Oxlint + Oxfmt) enforces lint and formatting; fix what it reports instead of restating its rules. Before committing, run `pnpm exec ultracite fix` and `pnpm run check-types` (Turbo, every package including infra scripts), inspect the diff, and run the relevant behavior checks. The Lefthook pre-commit hook reruns `ultracite fix` on staged files.

## Code

- Reuse existing packages, platform features and installed dependencies before adding an abstraction or dependency. Do not scaffold interfaces, factories or wrappers for unrequested capabilities.
- Keep UI primitives in `packages/ui` and application behavior in `apps/web`. Shared packages receive configuration or initialized clients from the application.
- After editing an `.env.schema`, run `pnpm run env:generate`; `src/env.ts` is generated and ignored. Workers read native bindings; Varlock configures operator and test tooling only.

## User content

- Treat Markdown as untrusted input when rendering it. Do not allow executable HTML or unsafe links.
- Validate input at trust boundaries.
- Handle errors without silently losing user content.
- Use semantic HTML, labeled controls and keyboard-accessible interactions.

## Tests

- Never write unit tests after the code they test.
- Prefer end-to-end tests through the real application. If a system must be tested in isolation, list every way it can fail before writing the code.
- After E2E, report a repeatable artifact with its location and command.

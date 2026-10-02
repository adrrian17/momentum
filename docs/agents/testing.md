# Testing and validation

Read this guide before writing code or choosing a testing approach.

## Testing policy

- Never write unit tests after writing the code they test.
- Strongly prefer end-to-end (E2E) tests as the sole testing mechanism. Use them to verify that complex features work through the real application.
- At the end of E2E tests, produce a verifiable and repeatable artifact. Include the artifact location and the command or steps to reproduce it.
- If a system must be tested in isolation, first write down all the ways it could fail, then write the code.

## Code checks

Ultracite uses Oxlint and Oxfmt for this repository. Run commands from the repository root:

| Command                      | Purpose                         |
| ---------------------------- | ------------------------------- |
| `pnpm exec ultracite check`  | Check lint and formatting       |
| `pnpm exec ultracite fix`    | Apply lint and formatting fixes |
| `pnpm exec ultracite doctor` | Diagnose the tooling setup      |

Before committing code, run `pnpm exec ultracite fix`, review the resulting diff, and run the relevant type and behavior checks. Build and typecheck commands are listed in [AGENTS.md](../../AGENTS.md).

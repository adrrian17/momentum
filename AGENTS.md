# Momentum

Momentum is a personal work journal for capturing notes and activities and generating monthly PDF reports.

Momentum brings capture, organization, and reporting into one application, replacing a workflow of collecting scattered notes and asking an agent to generate a PDF from them. All of its applications and shared components belong in this monorepo.

## What matters about Momentum

### 1. Capture comes first

The first milestone is untitled Markdown notes with multiple tags in the web app. Tags also represent project context. A separate project system and offline editing are outside this milestone.

### 2. Keep control over the work record

Completing a task must not automatically add it to the activity log. Users choose which tasks to add. Monthly reports will use the existing PDF template.

### 3. Work content stays private

Never send private work content to external services without the developer's explicit authorization for that use. This includes notes, activities, tasks, audio, transcripts, summaries, and reports, whether sent for AI processing, analytics, logging, or delivery.

Cloudflare hosting for the web app, server, and database is approved. Local transcription and text generation are planned for the Swift macOS app. Neither direction authorizes unrelated external processing or automatic report delivery.

### 4. Build one useful stage at a time

Build only the requested stage. Reminders, meeting processing, reports, and the macOS app are product direction, not permission to implement or scaffold them now. See the [product scope](docs/agents/product-scope.md) for their constraints.

## A note on how to build

Follow the current capture-to-report workflow before adding structure. Reuse the packages and tools already here, and add abstractions when the requested behavior needs them. Future features should not make today's notes milestone harder to build or use.

## A small glossary

- **Developer** means the person directing changes to Momentum.
- **User** means the person using Momentum to record their work.
- **Agent** means the coding agent reading these instructions and changing Momentum.
- **Activity** means a dated description of work performed. A note or completed task does not automatically become an activity.

## Where to go next

Read the applicable guides before starting the corresponding work:

- [Product scope](docs/agents/product-scope.md): feature planning and product behavior.
- [Architecture and data handling](docs/agents/architecture.md): application code and package boundaries.
- [Runtime and deployment](docs/agents/runtime.md): server, database, environment, and infrastructure changes.
- [Testing and validation](docs/agents/testing.md): before writing code or choosing a testing approach.

Read the [README](README.md) for setup and current implementation status. When a change crosses packages, follow the affected flow through the client, API, and database rather than checking only the edited file.

## Development commands

Use **pnpm**, as pinned in `package.json`. Run commands from the repository root:

- Build: `pnpm run build`
- Typecheck: `pnpm run check-types`

Other development, formatting, migration, and deployment commands live in the linked guides.

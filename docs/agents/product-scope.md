# Product scope

Read this guide when planning features or changing product behavior. See the [README](../../README.md) for the product overview and current implementation status.

## First milestone

Build notes in the web app first:

- Store Markdown without a separate title.
- Allow multiple tags per note and use tags to find related content.
- Use tags for project context. Do not introduce a separate project entity.
- Defer offline access and editing.

## Later stages

These constraints apply when the corresponding feature is requested:

- An activity records a date and a brief description of work performed.
- Users choose which tasks become activity entries. Task completion must not automatically create an activity.
- Notes, activities, tasks, and meetings should be relatable. Tags remain the organizational vocabulary.
- Reminder intervals are configurable. The web app is intended to become an installable PWA with VAPID push notifications on phones.
- Meetings support both recording and audio uploads, with transcription, later analysis, and optional summaries.
- A planned Swift macOS app handles local transcription and text generation using local models or Apple tools. Do not create its directory or shared abstractions until that work is requested.
- Reports use the existing PDF template. Obtain that template when implementing reports instead of inventing a replacement. Delivery is planned, and actual external sending requires authorization under the [root privacy rule](../../AGENTS.md).

Describe implemented behavior separately from planned capabilities. Update the README and affected agent guides when scope changes.

# Product scope

Read this before planning a feature or changing product behavior. The [README](../../README.md) states what is implemented.

## Notes (shipped)

- Notes are Markdown without a separate title.
- Notes carry multiple tags; tags find related content and carry project context. Do not add a project entity.
- Offline access and editing stay deferred.

## Later stages

Apply these only when the stage is requested:

- An activity records a date and a brief description of work performed.
- Users choose which tasks become activities. Task completion never creates one.
- Notes, activities, tasks and meetings are relatable. Tags remain the organizational vocabulary.
- Reminder intervals are configurable. Push uses VAPID on the installed PWA.
- Meetings support recording and audio upload, with transcription, later analysis and optional summaries.
- A Swift macOS app will handle local transcription and text generation. Do not create its directory or shared abstractions until requested.
- Reports use the existing PDF template. Obtain it when implementing reports; do not invent a replacement. Sending a report externally requires authorization under the [privacy rule](../../AGENTS.md#always).

Describe implemented behavior separately from planned capabilities. Update the README and affected guides when scope changes.

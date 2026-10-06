# Product scope

The [README](../../README.md) lists what is implemented and planned. Build a planned capability only when its stage is requested, within these constraints:

- Notes are Markdown without a title and carry multiple tags. Tags carry project context; never add a project entity.
- Offline access and editing stay deferred.
- An activity records a date and a brief description of work performed.
- Notes, activities, tasks and meetings are relatable. Tags remain the organizational vocabulary.
- Reminder intervals are configurable. Push uses VAPID on the installed PWA.
- Meetings support recording and audio upload, with transcription, later analysis and optional summaries.
- A Swift macOS app will handle local transcription and text generation. Do not create its directory or shared abstractions until requested.
- Reports use the existing PDF template. Obtain it when implementing reports; do not invent a replacement.
- Account recovery and credential reset are out of scope.

Describe implemented behavior separately from planned capabilities. Update the README when scope changes.

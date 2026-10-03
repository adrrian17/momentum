# Momentum

Personal work journal: capture notes, record activities, produce monthly reports.

## Language

**Note**: Free-form Markdown text without a title, labeled with any number of tags. Not tied to a date of work performed. _Avoid_: entry, log, journal entry

**Tag**: A lowercase label that groups related **Notes** and carries project context. A tag exists only while at least one **Note** uses it; it has no attributes of its own. `Deploy` and `deploy` are the same tag. A **Note**'s tags are its **Inline Tags** plus its **Attached Tags**. _Avoid_: project, category, label

**Inline Tag**: A **Tag** written in the **Note**'s text as `#name`, outside Markdown code. Removing it drops the `#` and keeps the word.

**Attached Tag**: A **Tag** added to a **Note** without appearing in its text.

**Activity**: A dated description of work performed. A **Note** never becomes an **Activity** automatically. _Avoid_: note, log entry

## Relationships

- A **Note** has zero or more **Tags**; a **Tag** belongs to one or more **Notes**.
- Projects are expressed as **Tags**, never as a separate entity.
- A **Note** and an **Activity** are distinct; any link between them is chosen by the user.

## Example dialogue

> **Dev:** "I wrote a **Note** about the deploy issue — does it show in this month's report?" **Domain expert:** "No. Reports use **Activities**. If that work counts, record an **Activity** for it."

## Flagged ambiguities

- "nota" was at risk of meaning a daily work log; resolved: a **Note** is free text, the daily work record is an **Activity**.

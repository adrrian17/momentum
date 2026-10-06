import assert from "node:assert/strict";

// Mexico City is UTC-6 with no DST, so local and UTC days split at 18:00 UTC.
process.env.TZ = "America/Mexico_City";

const { groupByDay } = await import("../src/lib/group-by-day");

const now = new Date("2026-10-06T04:00:00Z");

assert.equal(now.getDate(), 5, "TZ override applied");

function note(id: string, updatedAt: string) {
  return { id, updatedAt };
}

const notes = [
  note("late-today", "2026-10-06T03:30:00Z"),
  note("start-of-today", "2026-10-05T06:00:00Z"),
  note("end-of-yesterday", "2026-10-05T05:59:59Z"),
  note("yesterday", "2026-10-04T15:00:00Z"),
  note("this-year", "2026-10-02T12:00:00Z"),
  note("last-year", "2025-12-31T20:00:00Z"),
];

const groups = groupByDay(notes, now, "en-US");

assert.deepEqual(
  groups.map(({ key, label, notes: entries }) => ({
    key,
    label,
    ids: entries.map((entry) => entry.id),
  })),
  [
    {
      key: "2026-10-05",
      label: "Today",
      ids: ["late-today", "start-of-today"],
    },
    {
      key: "2026-10-04",
      label: "Yesterday",
      ids: ["end-of-yesterday", "yesterday"],
    },
    { key: "2026-10-02", label: "Friday, Oct 2", ids: ["this-year"] },
    {
      key: "2025-12-31",
      label: "Wednesday, Dec 31, 2025",
      ids: ["last-year"],
    },
  ],
  "groups by local day, newest first, with relative labels"
);

const startOfMonth = new Date(2026, 9, 1, 0, 5);

assert.deepEqual(
  groupByDay(
    [
      note("first", startOfMonth.toISOString()),
      note("prev-month", new Date(2026, 8, 30, 23, 55).toISOString()),
    ],
    startOfMonth,
    "en-US"
  ).map((group) => group.label),
  ["Today", "Yesterday"],
  "yesterday crosses a month boundary"
);

assert.deepEqual(groupByDay([], now), [], "no notes, no groups");

console.log("group-by-day: ok");

export interface DayGroup<T> {
  // Local calendar day, YYYY-MM-DD.
  key: string;
  label: string;
  notes: T[];
}

function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function dayLabel(date: Date, now: Date, locale: Intl.LocalesArgument) {
  const key = dayKey(date);

  if (key === dayKey(now)) {
    return "Today";
  }

  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  );

  if (key === dayKey(yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function groupByDay<T extends { updatedAt: string }>(
  notes: T[],
  now: Date,
  locale?: Intl.LocalesArgument
): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();

  for (const note of notes) {
    const date = new Date(note.updatedAt);
    const key = dayKey(date);
    const group = groups.get(key);

    if (group) {
      group.notes.push(note);
    } else {
      groups.set(key, {
        key,
        label: dayLabel(date, now, locale),
        notes: [note],
      });
    }
  }

  return [...groups.values()];
}

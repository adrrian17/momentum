import { useState } from "react";
import { z } from "zod";

const draftSchema = z.object({ content: z.string(), tags: z.string() });

export type Draft = z.infer<typeof draftSchema>;

function readDraft(key: string) {
  try {
    const stored = localStorage.getItem(key);

    return stored ? draftSchema.parse(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

// Keeps unsaved input in localStorage so it survives reloads and iOS discarding a backgrounded tab.
export function useDraft(key: string, initial: Draft) {
  const [draft, setDraft] = useState(() => readDraft(key) ?? initial);

  function updateDraft(next: Draft) {
    setDraft(next);
    localStorage.setItem(key, JSON.stringify(next));
  }

  function clearDraft() {
    localStorage.removeItem(key);
    setDraft(initial);
  }

  return { draft, updateDraft, clearDraft };
}

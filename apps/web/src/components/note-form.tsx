import { Button } from "@momentum/ui/components/button";
import { Input } from "@momentum/ui/components/input";
import { Label } from "@momentum/ui/components/label";
import { Textarea } from "@momentum/ui/components/textarea";
import { useId } from "react";
import type { ReactNode } from "react";

import { useDraft } from "@/hooks/use-draft";
import type { Draft } from "@/hooks/use-draft";

export interface NoteInput {
  content: string;
  tags: string[];
}

interface NoteFormProps {
  draftKey: string;
  initial: Draft;
  label: string;
  pending: boolean;
  onSave: (note: NoteInput, onSaved: () => void) => void;
  children?: ReactNode;
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export default function NoteForm({
  draftKey,
  initial,
  label,
  pending,
  onSave,
  children,
}: NoteFormProps) {
  const id = useId();
  const { draft, updateDraft, clearDraft } = useDraft(draftKey, initial);
  const isEmpty = draft.content.trim().length === 0;

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(
          { content: draft.content, tags: parseTags(draft.tags) },
          clearDraft
        );
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-content`}>{label}</Label>
        <Textarea
          id={`${id}-content`}
          className="min-h-32"
          required
          maxLength={100_000}
          placeholder="Write in Markdown"
          value={draft.content}
          onChange={(event) =>
            updateDraft({ ...draft, content: event.target.value })
          }
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-tags`}>Tags</Label>
        <Input
          id={`${id}-tags`}
          className="h-11"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="deploy, project-x"
          aria-describedby={`${id}-tags-hint`}
          value={draft.tags}
          onChange={(event) =>
            updateDraft({ ...draft, tags: event.target.value })
          }
        />
        <p id={`${id}-tags-hint`} className="text-muted-foreground text-xs">
          Separate tags with commas.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className="h-11" disabled={pending || isEmpty}>
          {pending ? "Saving..." : "Save"}
        </Button>
        {children}
      </div>
    </form>
  );
}

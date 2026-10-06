import {
  attachedTags,
  inlineTags,
  partialTagAt,
  removeInlineTag,
} from "@momentum/api/tags";
import { Button } from "@momentum/ui/components/button";
import { Label } from "@momentum/ui/components/label";
import { Textarea } from "@momentum/ui/components/textarea";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, Undo2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode, SyntheticEvent } from "react";

import TagChips from "@/components/tag-chips";
import TagPicker from "@/components/tag-picker";
import { useDraft } from "@/hooks/use-draft";
import type { Draft } from "@/hooks/use-draft";
import { trpc } from "@/utils/trpc";

const MAX_SUGGESTIONS = 5;

const LEADING_SPACE = /^\s/u;

const APPLE_PLATFORM = /Mac|iPhone|iPad/u;

const MODIFIER_KEY = APPLE_PLATFORM.test(navigator.platform) ? "⌘" : "Ctrl";

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

export default function NoteForm({
  draftKey,
  initial,
  label,
  pending,
  onSave,
  children,
}: NoteFormProps) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tagsRowRef = useRef<HTMLDivElement>(null);
  const { draft, updateDraft, clearDraft } = useDraft(draftKey, initial);
  const [caret, setCaret] = useState<number | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const workspaceTags = useQuery(trpc.notes.tags.queryOptions());

  const isEmpty = draft.content.trim().length === 0;

  // Only saved notes can be reverted; the composer's empty start needs no discard.
  const revertible =
    initial.content !== "" &&
    (draft.content !== initial.content ||
      draft.tags.join(",") !== initial.tags.join(","));

  const inline = inlineTags(draft.content);
  const attached = attachedTags(draft.content, draft.tags);
  const allTags = [...inline, ...attached];

  const partial = caret === null ? null : partialTagAt(draft.content, caret);
  const typed = partial?.toLowerCase() ?? "";

  const suggestions =
    partial === null || dismissed
      ? []
      : (workspaceTags.data ?? [])
          .filter((entry) => entry.tag.startsWith(typed) && entry.tag !== typed)
          .slice(0, MAX_SUGGESTIONS);

  const suggesting = suggestions.length > 0;
  const activeIndex = Math.min(highlighted, suggestions.length - 1);

  function moveCaret(position: number) {
    // Wait for React to render the new value before placing the caret.
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(position, position);
      setCaret(position);
    });
  }

  function trackCaret(event: SyntheticEvent<HTMLTextAreaElement>) {
    setCaret(event.currentTarget.selectionStart);
  }

  function completeTag(tag: string) {
    if (partial === null || caret === null) {
      return;
    }

    const before = draft.content.slice(0, caret - partial.length);
    const after = draft.content.slice(caret);
    const spacer = LEADING_SPACE.test(after) ? "" : " ";

    updateDraft({ ...draft, content: `${before}${tag}${spacer}${after}` });
    moveCaret(before.length + tag.length + 1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      // An IME uses Enter to confirm composed text, not to submit.
      if (event.nativeEvent.isComposing) {
        return;
      }

      event.preventDefault();

      if (!pending && !isEmpty) {
        event.currentTarget.form?.requestSubmit();
      }

      return;
    }

    if (!suggesting) {
      return;
    }

    const count = suggestions.length;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((activeIndex + step + count) % count);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      completeTag(suggestions[activeIndex]?.tag ?? typed);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDismissed(true);
    }
  }

  function removeTag(tag: string) {
    updateDraft({
      content: inline.includes(tag)
        ? removeInlineTag(draft.content, tag)
        : draft.content,
      tags: draft.tags.filter((existing) => existing !== tag),
    });
  }

  function addTag(tag: string) {
    if (!allTags.includes(tag)) {
      updateDraft({ ...draft, tags: [...draft.tags, tag] });
      // The new chip lands at the end of the scrolling row; bring it into view.
      requestAnimationFrame(() => {
        const row = tagsRowRef.current;
        row?.scrollTo({ left: row.scrollWidth, behavior: "smooth" });
      });
    }
  }

  return (
    <form
      className="bg-card has-[textarea:focus-visible]:border-ring grid gap-3 rounded-xl border px-4 pt-3 shadow-sm transition-colors"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ content: draft.content, tags: attached }, clearDraft);
      }}
    >
      <div className="relative grid">
        <Label htmlFor={`${id}-content`} className="sr-only">
          {label}
        </Label>
        <Textarea
          ref={textareaRef}
          id={`${id}-content`}
          variant="bare"
          className="min-h-28 resize-none"
          required
          maxLength={100_000}
          placeholder="What are you thinking or working on today?"
          aria-describedby={`${id}-suggestions-status`}
          aria-keyshortcuts="Meta+Enter Control+Enter"
          value={draft.content}
          onChange={(event) => {
            updateDraft({ ...draft, content: event.target.value });
            trackCaret(event);
            setHighlighted(0);
            setDismissed(false);
          }}
          onSelect={trackCaret}
          onBlur={() => setCaret(null)}
          onKeyDown={handleKeyDown}
        />
        <p
          id={`${id}-suggestions-status`}
          className="sr-only"
          aria-live="polite"
        >
          {suggesting
            ? `${suggestions.length} tag suggestions. Arrow keys to choose, Enter to complete.`
            : ""}
        </p>
        {suggesting ? (
          <ul className="bg-popover text-popover-foreground ring-foreground/10 absolute top-full left-0 z-10 mt-1 grid w-64 gap-0.5 rounded-md p-1 shadow-md ring-1">
            {suggestions.map((entry, index) => (
              <li key={entry.tag}>
                <button
                  type="button"
                  // The textarea keeps focus and drives the list with arrow keys.
                  tabIndex={-1}
                  data-highlighted={index === activeIndex ? "" : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => completeTag(entry.tag)}
                  className="data-highlighted:bg-muted flex min-h-11 w-full cursor-default items-center justify-between gap-2 rounded-sm px-2 font-mono text-sm"
                >
                  <span>#{entry.tag}</span>
                  <span className="text-muted-foreground text-xs">
                    {entry.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {/* Sticks to the viewport bottom so actions stay reachable while a long note scrolls. */}
      <div className="bg-card sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 rounded-b-xl border-t px-4 pt-2 pb-2">
        <div className="flex min-w-0 flex-1 basis-48 items-center gap-2">
          {/* Padding keeps focus rings inside the scroll clip. */}
          <div
            ref={tagsRowRef}
            className="-m-1 min-w-0 [scrollbar-width:thin] overflow-x-auto p-1"
          >
            <TagChips tags={allTags} nowrap onRemove={removeTag} />
          </div>
          <TagPicker current={allTags} onAdd={addTag} />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {revertible ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              disabled={pending}
              onClick={clearDraft}
            >
              <Undo2 aria-hidden="true" />
              Discard changes
            </Button>
          ) : null}
          {children}
          <span
            aria-hidden="true"
            className="text-muted-foreground flex items-center gap-1 text-xs max-sm:hidden"
          >
            {[MODIFIER_KEY, "Enter"].map((key) => (
              <kbd
                key={key}
                className="bg-muted text-foreground/80 border-border inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 px-1.5 font-mono text-xs leading-none"
              >
                {key}
              </kbd>
            ))}
            <span className="ml-0.5">to save</span>
          </span>
          <Button
            type="submit"
            variant="brand"
            // Keyboards save with the shortcut; touch screens have no such key.
            className="h-11 sm:hidden"
            disabled={pending || isEmpty}
          >
            {pending ? "Saving..." : "Save"}
            <ArrowUp aria-hidden="true" />
          </Button>
        </div>
      </div>
    </form>
  );
}

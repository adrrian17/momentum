import { Button } from "@momentum/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@momentum/ui/components/combobox";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

interface TagOption {
  tag: string;
  count: number | null;
}

const LEADING_HASH = /^#+/u;

const WHITESPACE = /\s+/gu;

// The picker accepts what a person types (`#Finanzas personales`) and offers it in stored form.
function toTag(query: string) {
  return query
    .trim()
    .replace(LEADING_HASH, "")
    .replaceAll(WHITESPACE, "-")
    .toLowerCase();
}

interface TagPickerProps {
  // Tags already on the note; they are not offered again.
  current: string[];
  onAdd: (tag: string) => void;
}

export default function TagPicker({ current, onAdd }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const workspaceTags = useQuery({
    ...trpc.notes.tags.queryOptions(),
    enabled: open,
  });

  const typed = toTag(query);

  const taken = new Set(current);

  const available = (workspaceTags.data ?? []).filter(
    (entry) => !taken.has(entry.tag)
  );

  const matches = available.filter((entry) => entry.tag.includes(typed));

  const exists =
    taken.has(typed) || available.some((entry) => entry.tag === typed);

  const options: TagOption[] =
    typed !== "" && !exists
      ? [...matches, { tag: typed, count: null }]
      : matches;

  return (
    <Combobox
      items={options}
      filter={null}
      value={null}
      autoHighlight
      open={open}
      onOpenChange={setOpen}
      inputValue={query}
      onInputValueChange={setQuery}
      itemToStringLabel={(option: TagOption) => option.tag}
      onValueChange={(option: TagOption | null) => {
        if (option) {
          onAdd(option.tag);
          setQuery("");
          setOpen(false);
        }
      }}
    >
      <ComboboxTrigger
        aria-label="Add tag"
        render={<Button variant="ghost" className="h-11" />}
      >
        <span className="text-muted-foreground inline-flex items-center gap-1 font-mono text-xs">
          <Plus aria-hidden="true" className="size-3.5" />
          tag
        </span>
      </ComboboxTrigger>
      <ComboboxContent className="w-64">
        <ComboboxInput
          showTrigger={false}
          aria-label="Search or create a tag"
          placeholder="Search or create a tag"
          maxLength={50}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <ComboboxEmpty>
          {workspaceTags.isPending ? "Loading tags..." : "No tags yet."}
        </ComboboxEmpty>
        <ComboboxList>
          {(option: TagOption) => (
            <ComboboxItem
              key={option.tag}
              value={option}
              className="min-h-11 justify-between"
            >
              {option.count === null ? (
                <span>Create new tag: #{option.tag}</span>
              ) : (
                <>
                  <span>#{option.tag}</span>
                  <span className="text-muted-foreground text-xs">
                    {option.count}
                  </span>
                </>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

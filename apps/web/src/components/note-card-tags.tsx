import { attachedTags, removeInlineTag } from "@momentum/api/tags";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import TagChips from "@/components/tag-chips";
import TagPicker from "@/components/tag-picker";
import { queryClient, trpc } from "@/utils/trpc";

interface NoteCardTagsProps {
  note: { id: string; content: string; tags: string[] };
}

// Tag a saved note from the list without opening the editor.
export default function NoteCardTags({ note }: NoteCardTagsProps) {
  const updateNote = useMutation(
    trpc.notes.update.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: trpc.notes.pathKey() }),
    })
  );

  const attached = attachedTags(note.content, note.tags);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TagChips
        tags={note.tags}
        linked
        disabled={updateNote.isPending}
        onRemove={(tag) =>
          updateNote.mutate({
            id: note.id,
            content: removeInlineTag(note.content, tag),
            tags: attached.filter((existing) => existing !== tag),
          })
        }
      />
      <TagPicker
        current={note.tags}
        onAdd={(tag) =>
          updateNote.mutate({
            id: note.id,
            content: note.content,
            tags: [...attached, tag],
          })
        }
      />
    </div>
  );
}

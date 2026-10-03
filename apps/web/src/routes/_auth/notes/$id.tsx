import { attachedTags } from "@momentum/api/tags";
import { Button } from "@momentum/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import NoteForm from "@/components/note-form";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/notes/$id")({
  component: EditNote,
  loader: ({ context, params }) =>
    context.queryClient.fetchQuery(
      context.trpc.notes.get.queryOptions({ id: params.id })
    ),
  errorComponent: NoteError,
});

function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex min-h-11 items-center self-start rounded-md text-sm underline underline-offset-4"
    >
      Back to notes
    </Link>
  );
}

function NoteError({ error }: ErrorComponentProps) {
  return (
    <main className="mx-auto grid w-full max-w-2xl content-start gap-4 px-4 py-6">
      <BackLink />
      <p role="alert">
        {error instanceof Error
          ? error.message
          : "This note could not be loaded."}
      </p>
    </main>
  );
}

function showError(error: { message: string }) {
  toast.error(error.message);
}

function invalidateNotes() {
  return queryClient.invalidateQueries({ queryKey: trpc.notes.pathKey() });
}

function EditNote() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const note = Route.useLoaderData();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateNote = useMutation(
    trpc.notes.update.mutationOptions({ onError: showError })
  );

  const deleteNote = useMutation(
    trpc.notes.delete.mutationOptions({ onError: showError })
  );

  return (
    <main className="mx-auto grid w-full max-w-2xl content-start gap-4 px-4 py-6">
      <BackLink />
      <h1 className="text-lg font-medium">Edit note</h1>
      <NoteForm
        // The router can render cached loader data and reload in the background; remounting on a newer version restarts the form from it.
        key={`${note.id}:${note.updatedAt}`}
        draftKey={`draft:note:${note.id}`}
        initial={{
          content: note.content,
          tags: attachedTags(note.content, note.tags),
        }}
        label="Note"
        pending={updateNote.isPending}
        onSave={(input, onSaved) =>
          updateNote.mutate(
            { id, ...input },
            {
              onSuccess: async () => {
                onSaved();
                toast.success("Note saved");
                await navigate({ to: "/" });
                await invalidateNotes();
              },
            }
          )
        }
      >
        {confirmingDelete ? (
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Confirm delete</legend>
            <span className="text-sm">Delete this note permanently?</span>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              disabled={deleteNote.isPending}
              onClick={() =>
                deleteNote.mutate(
                  { id },
                  {
                    onSuccess: async () => {
                      localStorage.removeItem(`draft:note:${id}`);
                      toast.success("Note deleted");
                      await navigate({ to: "/" });
                      await invalidateNotes();
                    },
                  }
                )
              }
            >
              Delete permanently
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </fieldset>
        ) : (
          <Button
            type="button"
            variant="destructive"
            className="h-11"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}
      </NoteForm>
    </main>
  );
}

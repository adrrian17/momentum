import { attachedTags } from "@momentum/api/tags";
import { Button } from "@momentum/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@momentum/ui/components/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { ArrowLeft, Ellipsis, Trash2 } from "lucide-react";
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

const editedFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function BackLink() {
  return (
    <Link
      to="/"
      className="text-muted-foreground hover:text-foreground -ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-2 text-sm"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to notes
    </Link>
  );
}

function NoteError({ error }: ErrorComponentProps) {
  return (
    <main className="mx-auto grid w-full max-w-3xl content-start gap-4 px-4 py-6 lg:px-8 lg:py-12">
      <BackLink />
      <p role="alert" className="rounded-lg border border-dashed px-4 py-3">
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
    <main className="mx-auto grid w-full max-w-3xl content-start gap-4 px-4 py-6 lg:px-8 lg:py-12">
      <BackLink />
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-lg font-semibold">Edit note</h1>
          <p className="text-muted-foreground font-mono text-xs">
            Last edited{" "}
            <time dateTime={note.updatedAt}>
              {editedFormat.format(new Date(note.updatedAt))}
            </time>
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="size-11" />}
          >
            <Ellipsis aria-hidden="true" />
            <span className="sr-only">Note actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 aria-hidden="true" />
              Delete note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {confirmingDelete ? (
        <fieldset className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
          <legend className="sr-only">Confirm delete</legend>
          <span className="mr-auto text-sm">Delete this note permanently?</span>
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
      ) : null}
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
      />
    </main>
  );
}

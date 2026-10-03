import { Button } from "@momentum/ui/components/button";
import { Markdown } from "@tanstack/markdown/react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import NoteForm from "@/components/note-form";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/")({
  component: NotesHome,
  validateSearch: z.object({ tag: z.string().optional() }),
});

const EMPTY_DRAFT = { content: "", tags: "" };

// Tailwind's preflight strips default element styles, so rendered Markdown gets them back here.
const MARKDOWN_CLASSES =
  "grid gap-3 [overflow-wrap:anywhere] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:font-mono [&_code]:text-sm [&_h1]:font-semibold [&_h1]:text-2xl [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-6";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function NotesHome() {
  const { tag } = Route.useSearch();

  const createNote = useMutation(
    trpc.notes.create.mutationOptions({
      onError: (error) => toast.error(error.message),
    })
  );

  const notes = useInfiniteQuery(
    trpc.notes.list.infiniteQueryOptions(
      { tag },
      { getNextPageParam: (page) => page.nextCursor }
    )
  );

  const items = notes.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <main className="mx-auto grid w-full max-w-2xl content-start gap-8 px-4 py-6">
      <section aria-labelledby="new-note-heading" className="grid gap-3">
        <h1 id="new-note-heading" className="sr-only">
          Notes
        </h1>
        <NoteForm
          draftKey="draft:new-note"
          initial={EMPTY_DRAFT}
          label="New note"
          pending={createNote.isPending}
          onSave={(note, onSaved) =>
            createNote.mutate(note, {
              onSuccess: async () => {
                onSaved();
                toast.success("Note saved");
                await queryClient.invalidateQueries({
                  queryKey: trpc.notes.list.pathKey(),
                });
              },
            })
          }
        />
      </section>

      <section aria-labelledby="notes-heading" className="grid gap-4">
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
          <h2 id="notes-heading" className="text-lg font-medium">
            {tag ? `Notes tagged #${tag}` : "All notes"}
          </h2>
          {tag ? (
            <Link
              to="/"
              search={{}}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm underline underline-offset-4"
            >
              Clear filter
            </Link>
          ) : null}
        </div>

        {notes.isPending ? (
          <p className="text-muted-foreground">Loading notes...</p>
        ) : null}
        {notes.isSuccess && items.length === 0 ? (
          <p className="text-muted-foreground">No notes yet.</p>
        ) : null}

        <ul className="grid gap-4">
          {items.map((note) => (
            <li key={note.id}>
              <article className="grid gap-3 rounded-lg border p-4">
                <div className={MARKDOWN_CLASSES}>
                  <Markdown>{note.content}</Markdown>
                </div>
                {note.tags.length > 0 ? (
                  <ul className="flex flex-wrap gap-1" aria-label="Tags">
                    {note.tags.map((noteTag) => (
                      <li key={noteTag}>
                        <Link
                          to="/"
                          search={{ tag: noteTag }}
                          className="bg-secondary text-secondary-foreground inline-flex min-h-11 items-center rounded-full px-3 text-sm"
                        >
                          #{noteTag}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="text-muted-foreground flex items-center justify-between gap-2 text-sm">
                  <time dateTime={note.updatedAt}>
                    {dateFormat.format(new Date(note.updatedAt))}
                  </time>
                  <Link
                    to="/notes/$id"
                    params={{ id: note.id }}
                    className="text-foreground inline-flex min-h-11 items-center rounded-md px-3 underline underline-offset-4"
                  >
                    Edit<span className="sr-only"> note</span>
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {notes.hasNextPage ? (
          <Button
            variant="outline"
            className="h-11"
            disabled={notes.isFetchingNextPage}
            onClick={() => notes.fetchNextPage()}
          >
            {notes.isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        ) : null}
      </section>
    </main>
  );
}

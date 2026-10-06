import { Button } from "@momentum/ui/components/button";
import { Markdown } from "@tanstack/markdown/react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import NoteCardTags from "@/components/note-card-tags";
import NoteForm from "@/components/note-form";
import { groupByDay } from "@/lib/group-by-day";
import { queryClient, trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/")({
  component: NotesHome,
  validateSearch: z.object({ tag: z.string().optional() }),
});

const EMPTY_DRAFT = { content: "", tags: [] };

// Tailwind's preflight strips default element styles, so rendered Markdown gets them back here.
const MARKDOWN_CLASSES =
  "grid gap-3 leading-relaxed [overflow-wrap:anywhere] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:font-mono [&_code]:text-sm [&_h1]:font-semibold [&_h1]:text-2xl [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-6";

const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

function entryCount(count: number) {
  return `${count} ${count === 1 ? "entry" : "entries"}`;
}

function NotesHome() {
  const { tag } = Route.useSearch();
  const { session } = Route.useRouteContext();

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
  // Relative to the last fetch, which refetches on focus, so "Today" rolls over when the app is reopened.
  const days = groupByDay(items, new Date(notes.dataUpdatedAt));

  return (
    <main className="mx-auto grid w-full max-w-3xl content-start gap-10 px-4 py-6 lg:px-8 lg:py-12">
      <section aria-labelledby="new-note-heading">
        <h1 id="new-note-heading" className="sr-only">
          Notes
        </h1>
        <NoteForm
          // Per user, so a later sign-in on this device never restores someone else's unsaved text.
          draftKey={`draft:new-note:${session.user.id}`}
          initial={EMPTY_DRAFT}
          label="New note"
          pending={createNote.isPending}
          onSave={(note, onSaved) =>
            createNote.mutate(note, {
              onSuccess: async () => {
                onSaved();
                toast.success("Note saved");
                await queryClient.invalidateQueries({
                  queryKey: trpc.notes.pathKey(),
                });
              },
            })
          }
        />
      </section>

      <section aria-labelledby="notes-heading" className="grid gap-8">
        {tag ? (
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
            <h2 id="notes-heading" className="font-mono text-sm">
              Notes tagged <span className="text-brand">#{tag}</span>
            </h2>
            {/* The desktop sidebar carries its own clear link. */}
            <Link
              to="/"
              search={{}}
              className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center rounded-md px-3 text-sm underline-offset-4 hover:underline lg:hidden"
            >
              Clear filter
            </Link>
          </div>
        ) : (
          <h2 id="notes-heading" className="sr-only">
            All notes
          </h2>
        )}

        {notes.isPending ? (
          <p className="text-muted-foreground font-mono text-sm">
            Loading notes...
          </p>
        ) : null}
        {notes.isSuccess && items.length === 0 ? (
          <p className="text-muted-foreground font-mono text-sm">
            No notes yet.
          </p>
        ) : null}

        {days.map((day) => (
          <section key={day.key} aria-labelledby={`day-${day.key}`}>
            <header className="bg-background sticky top-14 z-10 flex items-baseline gap-3 border-b py-3 lg:top-0">
              <h3 id={`day-${day.key}`} className="text-lg font-semibold">
                {day.label}
              </h3>
              <span className="text-muted-foreground font-mono text-xs">
                {entryCount(day.notes.length)}
              </span>
            </header>
            <ul className="divide-y">
              {day.notes.map((note) => (
                <li key={note.id}>
                  <article className="grid gap-3 py-5">
                    <div className="flex items-center justify-between gap-2">
                      <time
                        dateTime={note.updatedAt}
                        className="text-muted-foreground font-mono text-xs"
                      >
                        {timeFormat.format(new Date(note.updatedAt))}
                      </time>
                      <Link
                        to="/notes/$id"
                        params={{ id: note.id }}
                        className="text-muted-foreground hover:text-foreground -my-3 inline-flex min-h-11 items-center rounded-md px-3 font-mono text-xs underline-offset-4 hover:underline"
                      >
                        Edit<span className="sr-only"> note</span>
                      </Link>
                    </div>
                    <NoteBody content={note.content} />
                    <NoteCardTags note={note} />
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ))}

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

function NoteBody({ content }: { content: string }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    // Collapsed height is set in CSS, so overflow is only known after layout.
    const observer = new ResizeObserver(() => {
      setOverflowing(element.scrollHeight > element.clientHeight + 1);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const collapsed = !expanded;

  return (
    <div className="grid gap-2">
      <div
        ref={ref}
        id={id}
        data-collapsed={collapsed ? "" : undefined}
        data-overflowing={overflowing ? "" : undefined}
        className={`${MARKDOWN_CLASSES} data-collapsed:max-h-80 data-collapsed:overflow-hidden data-collapsed:data-overflowing:mask-b-from-60%`}
      >
        <Markdown>{content}</Markdown>
      </div>
      {overflowing || expanded ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground -mx-3 inline-flex min-h-11 w-fit items-center rounded-md px-3 font-mono text-xs underline-offset-4 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

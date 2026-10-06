import { Button } from "@momentum/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@momentum/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Hash, NotebookPen } from "lucide-react";
import type { ReactNode } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import UserMenu from "@/components/user-menu";
import { trpc } from "@/utils/trpc";

function Brand() {
  return (
    <Link
      to="/"
      search={{}}
      className="inline-flex min-h-11 items-center rounded-md px-2 font-mono font-semibold"
    >
      Momentum
    </Link>
  );
}

function TagsNav({ active }: { active: string | undefined }) {
  const tags = useQuery(trpc.notes.tags.queryOptions());

  return (
    <nav
      aria-label="Tags"
      className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto"
    >
      <div className="flex min-h-9 items-center justify-between gap-2 px-2">
        <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          Tags
        </h2>
      </div>
      {tags.isError ? (
        <div role="alert" className="grid justify-items-start gap-2 px-2">
          <p className="text-muted-foreground text-xs">
            Tags could not be loaded.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={tags.isFetching}
            onClick={() => tags.refetch()}
          >
            {tags.isFetching ? "Retrying..." : "Try again"}
          </Button>
        </div>
      ) : null}
      {tags.data?.length ? (
        <ul className="grid gap-0.5">
          {tags.data.map((entry) => (
            <li key={entry.tag}>
              <Link
                to="/"
                search={{ tag: entry.tag }}
                aria-current={entry.tag === active ? "page" : undefined}
                className="hover:bg-sidebar-accent aria-[current=page]:bg-brand/10 aria-[current=page]:text-brand flex min-h-9 items-center justify-between gap-2 rounded-md px-2 font-mono text-sm"
              >
                <span className="truncate">#{entry.tag}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {entry.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {!tags.isError && !tags.data?.length ? (
        <p className="text-muted-foreground px-2 text-xs">
          {tags.isPending ? "Loading tags..." : "Write a #tag in a note."}
        </p>
      ) : null}
    </nav>
  );
}

// On phones the tag list moves into a menu so the feed keeps the full width.
function TagsMenu({ active }: { active: string | undefined }) {
  const navigate = useNavigate();
  const tags = useQuery(trpc.notes.tags.queryOptions());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-11 max-w-40 min-w-11" />}
      >
        <Hash aria-hidden="true" />
        <span className="sr-only">Filter by tag</span>
        {active ? <span className="truncate font-mono">{active}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tags</DropdownMenuLabel>
          <DropdownMenuItem
            className="min-h-11"
            onClick={() => navigate({ to: "/", search: {} })}
          >
            All notes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {tags.isError ? (
            <DropdownMenuItem
              className="min-h-11"
              // Stay open so the refetched tags replace this item in place.
              closeOnClick={false}
              disabled={tags.isFetching}
              onClick={() => tags.refetch()}
            >
              {tags.isFetching
                ? "Retrying..."
                : "Tags could not be loaded. Try again"}
            </DropdownMenuItem>
          ) : null}
          {tags.data?.map((entry) => (
            <DropdownMenuItem
              key={entry.tag}
              className="min-h-11 justify-between"
              onClick={() => navigate({ to: "/", search: { tag: entry.tag } })}
            >
              <span
                className={`truncate font-mono ${entry.tag === active ? "text-brand" : ""}`}
              >
                #{entry.tag}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {entry.count}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { tag: active } = useSearch({ strict: false });

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-svh flex-col gap-6 border-r px-3 py-5 lg:flex">
        <Brand />
        <nav aria-label="Main">
          <Link
            to="/"
            search={{}}
            activeOptions={{ exact: true, includeSearch: false }}
            className="hover:bg-sidebar-accent aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground flex min-h-9 items-center gap-2.5 rounded-md px-2 text-sm font-medium"
          >
            <NotebookPen aria-hidden="true" className="size-4" />
            Notes
          </Link>
        </nav>
        <TagsNav active={active} />
        <div className="flex items-center gap-1 border-t pt-3">
          <div className="min-w-0 flex-1">
            <UserMenu />
          </div>
          <ModeToggle />
        </div>
      </aside>
      <header className="bg-background/90 sticky top-0 z-20 flex h-14 items-center gap-1 border-b px-2 backdrop-blur lg:hidden">
        <Brand />
        <div className="ml-auto flex items-center gap-1">
          <TagsMenu active={active} />
          <ModeToggle />
          <UserMenu />
        </div>
      </header>
      {children}
    </div>
  );
}

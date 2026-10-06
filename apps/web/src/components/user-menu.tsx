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
import { Skeleton } from "@momentum/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";

const WHITESPACE = /\s+/u;

function initials(name: string) {
  return name
    .split(WHITESPACE)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="size-11 lg:h-11 lg:w-full" />;
  }

  if (!session) {
    return null;
  }

  const { name, email } = session.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-11 min-w-11 justify-start lg:w-full"
          />
        }
      >
        <span
          aria-hidden="true"
          className="bg-brand/15 text-brand grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold"
        >
          {initials(name)}
        </span>
        <span className="grid min-w-0 text-left max-lg:sr-only">
          <span className="truncate">{name}</span>
          <span className="text-muted-foreground truncate font-mono text-xs font-normal">
            {email}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid">
            <span className="text-foreground truncate">{name}</span>
            <span className="truncate font-mono font-normal">{email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({
                      to: "/",
                    });
                  },
                },
              });
            }}
          >
            <LogOut aria-hidden="true" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

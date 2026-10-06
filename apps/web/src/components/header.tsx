import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";

// Signed-out pages only; the authenticated shell has its own sidebar and top bar.
export default function Header() {
  return (
    <header className="flex items-center justify-between border-b px-2 py-1">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center px-2 font-mono font-semibold"
      >
        Momentum
      </Link>
      <ModeToggle />
    </header>
  );
}

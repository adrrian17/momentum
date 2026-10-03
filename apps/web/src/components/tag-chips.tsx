import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

interface TagChipsProps {
  tags: string[];
  onRemove: (tag: string) => void;
  // Saved notes link each chip to the filtered list; the composer's chips are plain labels.
  linked?: boolean;
  disabled?: boolean;
}

export default function TagChips({
  tags,
  onRemove,
  linked = false,
  disabled = false,
}: TagChipsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap items-center gap-2 py-2" aria-label="Tags">
      {tags.map((tag) => (
        <li
          key={tag}
          className="group/chip bg-brand/10 text-brand inline-flex h-7 items-center gap-0.5 rounded-sm pl-1.5 font-mono text-xs"
        >
          {linked ? (
            <Link
              to="/"
              search={{ tag }}
              className="focus-visible:ring-ring/50 relative rounded-sm underline-offset-2 outline-none after:absolute after:-inset-y-2.5 after:-left-1.5 hover:underline focus-visible:ring-3"
            >
              #{tag}
            </Link>
          ) : (
            <span>#{tag}</span>
          )}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            disabled={disabled}
            onClick={() => onRemove(tag)}
            // The negative inset widens the hit area toward 44px without growing the chip.
            className="hover:bg-brand/20 focus-visible:ring-ring/50 relative inline-flex size-6 items-center justify-center rounded-sm opacity-60 transition-opacity outline-none group-hover/chip:opacity-100 after:absolute after:-inset-2.5 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 disabled:opacity-30"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

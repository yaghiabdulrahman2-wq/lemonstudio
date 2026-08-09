import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="relative grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="currentColor">
          <path d="M12 2.5c4.2 0 8 3.4 8.6 7.6.2 1.2-.7 2.3-1.9 2.3H16c-.8 0-1.4.7-1.4 1.5v4.6c0 1.6-1.3 3-3 3s-3-1.4-3-3v-1.1c0-.8-.6-1.5-1.4-1.5H5.3c-1.2 0-2.1-1.1-1.9-2.3C4 5.9 7.8 2.5 12 2.5Z" />
        </svg>
      </span>
      {showText ? (
        <span className="text-[15px] font-bold tracking-tight">
          Lemonade<span className="text-primary">.</span>Studio
        </span>
      ) : null}
    </Link>
  );
}

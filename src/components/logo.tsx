import { cn } from "@/lib/cn";

/** The mark: a loop that comes back round to the point it started from. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-6 text-accent", className)}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="18.4" cy="5.6" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-lg font-bold tracking-tight", className)}>
      <LogoMark />
      Recall
    </span>
  );
}

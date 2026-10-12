import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap " +
  "transition duration-[var(--m-fast)] ease-out select-none active:scale-[0.97] " +
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 aria-busy:cursor-progress";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent shadow-card hover:shadow-lift hover:brightness-110 " +
    "[&_kbd]:border-on-accent/30 [&_kbd]:bg-on-accent/15 [&_kbd]:text-on-accent",
  secondary: "border border-border-input bg-surface text-text hover:bg-sunken",
  ghost: "text-text hover:bg-sunken",
  danger: "border border-danger text-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-6 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/** A link that looks like a button. Use for navigation; use Button for actions. */
export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  className,
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted",
        "transition duration-[var(--m-fast)] ease-out hover:bg-sunken hover:text-text active:scale-[0.94]",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Keyboard hint shown beside actions, e.g. Enter to continue. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-sm border border-border bg-sunken px-1.5 py-0.5 font-mono text-xs font-medium text-muted">
      {children}
    </kbd>
  );
}

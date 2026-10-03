import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface shadow-card", className)}
      {...rest}
    />
  );
}

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const badgeTones: Record<Tone, string> = {
  neutral: "bg-sunken text-muted",
  accent: "bg-accent-soft text-accent-text",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-sm px-2 font-mono text-xs font-medium",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}

const bannerTones = {
  info: { box: "border-border bg-sunken text-text", icon: Info },
  success: { box: "border-success bg-success-soft text-success", icon: CircleCheck },
  warning: { box: "border-warning bg-warning-soft text-warning", icon: TriangleAlert },
  danger: { box: "border-danger bg-danger-soft text-danger", icon: CircleAlert },
} as const;

/** Inline message for usage limits, errors and confirmations. */
export function Banner({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: keyof typeof bannerTones;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const { box, icon: Icon } = bannerTones[tone];
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md border px-4 py-3", box)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {children ? <div className="mt-0.5 text-sm text-text">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function Progress({
  value,
  max = 100,
  label,
}: {
  value: number;
  max?: number;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-pill bg-sunken"
    >
      <div
        className="h-full rounded-pill bg-accent transition-[width] duration-[var(--m-base)] ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-sm bg-sunken", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent, color-mix(in srgb, var(--c-border) 70%, transparent), transparent)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s linear infinite",
      }}
    />
  );
}

/** Shown while the model is writing. The caret blinks at the end of streamed text. */
export function StreamCaret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.15em] bg-accent"
      style={{ animation: "caret 1s steps(1) infinite" }}
    />
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-input px-6 py-8">
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-[52ch] text-sm text-muted">{children}</p>
      {action}
    </div>
  );
}

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-surface shadow-card", className)} {...rest} />;
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
        "inline-flex h-6 items-center gap-1 rounded-pill px-2.5 text-xs font-semibold whitespace-nowrap",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}

const bannerTones = {
  info: { box: "border-border bg-surface", icon: Info, color: "text-accent" },
  success: { box: "border-success/40 bg-success-soft", icon: CircleCheck, color: "text-success" },
  warning: { box: "border-warning/40 bg-warning-soft", icon: TriangleAlert, color: "text-warning" },
  danger: { box: "border-danger/40 bg-danger-soft", icon: CircleAlert, color: "text-danger" },
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
  const { box, icon: Icon, color } = bannerTones[tone];
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("anim-fade flex flex-wrap items-start gap-3 rounded-md border px-4 py-3", box)}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", color)} aria-hidden />
      <div className="min-w-40 flex-1">
        <p className={cn("text-sm font-semibold", tone === "info" ? "text-text" : color)}>{title}</p>
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
  className,
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-1.5 w-full overflow-hidden rounded-pill bg-sunken", className)}
    >
      <div
        className="h-full origin-left rounded-pill bg-accent transition-transform duration-[var(--m-slow)] ease-out"
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}

/** Circular progress with an optional label in the middle. */
export function ProgressRing({
  value,
  max,
  size = 40,
  stroke = 4,
  label,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={cn(
            "transition-[stroke-dashoffset] duration-[600ms] ease-out",
            ratio >= 1 ? "stroke-success" : "stroke-accent",
          )}
        />
      </svg>
      {children ? (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{children}</span>
      ) : null}
    </span>
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
      className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.15em] rounded-pill bg-accent"
      style={{ animation: "caret 1s steps(1) infinite" }}
    />
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="anim-rise flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-input px-6 py-12 text-center">
      {icon ? (
        <span className="flex size-12 items-center justify-center rounded-pill bg-accent-soft text-accent-text">
          {icon}
        </span>
      ) : null}
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-[48ch] text-sm text-muted">{children}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

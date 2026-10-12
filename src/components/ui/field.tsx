import { ChevronDown } from "lucide-react";
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-md border border-border-input bg-surface px-3 text-base text-text outline-none " +
  "placeholder:text-muted transition-[border-color,box-shadow] duration-[var(--m-fast)] " +
  "hover:border-text focus:border-accent focus:shadow-[0_0_0_3px_var(--c-accent-soft)] " +
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-60 aria-invalid:border-danger";

type FieldShell = { label: string; hint?: string; error?: string; hideLabel?: boolean };

function Shell({
  id,
  label,
  hint,
  error,
  hideLabel,
  children,
}: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={cn("text-sm font-semibold text-text", hideLabel && "sr-only")}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  label,
  hint,
  error,
  hideLabel,
  className,
  ...rest
}: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <input
        id={id}
        className={cn(control, "h-11", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        {...rest}
      />
    </Shell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  hideLabel,
  className,
  rows = 4,
  ...rest
}: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <textarea
        id={id}
        rows={rows}
        className={cn(control, "resize-y py-2.5 leading-6", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        {...rest}
      />
    </Shell>
  );
}

export function Select({
  label,
  hint,
  error,
  hideLabel,
  className,
  children,
  ...rest
}: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <div className="relative">
        <select
          id={id}
          className={cn(control, "h-11 appearance-none pr-10", className)}
          aria-describedby={hint || error ? `${id}-msg` : undefined}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    </Shell>
  );
}

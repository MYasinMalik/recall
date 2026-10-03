"use client";

import { X } from "lucide-react";
import { Dialog as RDialog, Tabs as RTabs, Toast as RToast } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";

/** Underlined tabs that switch between the views of one lesson. */
export function Tabs({
  tabs,
  defaultValue,
}: {
  tabs: { value: string; label: string; content: ReactNode; pending?: boolean }[];
  defaultValue?: string;
}) {
  return (
    <RTabs.Root defaultValue={defaultValue ?? tabs[0]?.value}>
      <RTabs.List className="flex gap-6 overflow-x-auto border-b border-border" aria-label="Lesson views">
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              "-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent text-sm text-muted",
              "transition-colors duration-[var(--m-fast)] hover:text-text",
              "data-[state=active]:border-accent data-[state=active]:font-semibold data-[state=active]:text-text",
            )}
          >
            {t.label}
            {t.pending ? (
              <span className="size-1.5 rounded-pill bg-border-input" title="Not generated yet" />
            ) : null}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {tabs.map((t) => (
        <RTabs.Content key={t.value} value={t.value} className="pt-6">
          {t.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}

export function Dialog({
  trigger,
  title,
  description,
  children,
  footer,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <RDialog.Root>
      <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 bg-text/40" />
        <RDialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-border bg-surface p-6 shadow-pop",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <RDialog.Title className="font-serif text-lg">{title}</RDialog.Title>
            <RDialog.Close asChild>
              <IconButton label="Close" className="-mt-2 -mr-2">
                <X className="size-5" aria-hidden />
              </IconButton>
            </RDialog.Close>
          </div>
          {description ? (
            <RDialog.Description className="mt-1 text-sm text-muted">{description}</RDialog.Description>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
          {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function ToastRegion({ children }: { children: ReactNode }) {
  return (
    <RToast.Provider swipeDirection="right" duration={5000}>
      {children}
      <RToast.Viewport className="fixed right-4 bottom-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2" />
    </RToast.Provider>
  );
}

export function Toast({
  open,
  onOpenChange,
  title,
  tone = "neutral",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <RToast.Root
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border bg-surface px-4 py-3 shadow-pop",
        tone === "danger" ? "border-danger" : "border-border",
      )}
    >
      <RToast.Title className={cn("text-sm font-medium", tone === "danger" && "text-danger")}>
        {title}
      </RToast.Title>
      <RToast.Close asChild>
        <IconButton label="Dismiss" className="size-8">
          <X className="size-4" aria-hidden />
        </IconButton>
      </RToast.Close>
    </RToast.Root>
  );
}

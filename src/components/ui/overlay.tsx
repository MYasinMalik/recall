"use client";

import { X } from "lucide-react";
import { Dialog as RDialog, Tabs as RTabs, Toast as RToast } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";

/** Pill tabs that switch between panels in place. */
export function Tabs({
  tabs,
  defaultValue,
}: {
  tabs: { value: string; label: string; content: ReactNode; pending?: boolean }[];
  defaultValue?: string;
}) {
  return (
    <RTabs.Root defaultValue={defaultValue ?? tabs[0]?.value}>
      <RTabs.List className="flex gap-1 overflow-x-auto rounded-md bg-sunken p-1" aria-label="Views">
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-sm px-3 text-sm font-medium text-muted",
              "transition duration-[var(--m-fast)] hover:text-text",
              "data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-card",
            )}
          >
            {t.label}
            {t.pending ? <span className="size-1.5 rounded-pill bg-border-input" title="Not made yet" /> : null}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {tabs.map((t) => (
        <RTabs.Content key={t.value} value={t.value} className="anim-fade pt-6">
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
        <RDialog.Overlay className="overlay-scrim fixed inset-0 z-40 bg-text/45 backdrop-blur-[2px]" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          <RDialog.Content
            className={cn(
              "overlay-dialog pointer-events-auto w-full max-w-120",
              "rounded-lg border border-border bg-surface p-6 shadow-pop",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <RDialog.Title className="text-lg">{title}</RDialog.Title>
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
        </div>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function ToastRegion({ children }: { children: ReactNode }) {
  return (
    <RToast.Provider swipeDirection="right" duration={4000}>
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
        "overlay-toast flex items-center justify-between gap-3 rounded-md border bg-surface py-2 pr-2 pl-4 shadow-pop",
        tone === "danger" ? "border-danger" : "border-border",
      )}
    >
      <RToast.Title className={cn("text-sm font-semibold", tone === "danger" && "text-danger")}>
        {title}
      </RToast.Title>
      <RToast.Close asChild>
        <IconButton label="Dismiss" className="size-9">
          <X className="size-4" aria-hidden />
        </IconButton>
      </RToast.Close>
    </RToast.Root>
  );
}

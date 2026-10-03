"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Banner, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data } from "@/lib/data";
import { useData } from "@/lib/use-data";

type Theme = "system" | "light" | "dark";
const THEME_KEY = "recall.theme";

function applyTheme(theme: Theme) {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(THEME_KEY);
  } else {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-border py-6 sm:grid-cols-[12rem_1fr]">
      <h2 className="eyebrow pt-1">{title}</h2>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const me = useData(() => data.me(), []);
  const models = useData(() => data.listModels(), []);
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  return (
    <div className="mx-auto max-w-(--l-read) px-4 py-8 md:py-12">
      <p className="eyebrow">Settings</p>
      <h1 className="mt-1 mb-6 text-xl">Your setup</h1>

      <Row title="Account">
        {me.value ? (
          <>
            <div>
              <p className="font-medium break-words">{me.value.name}</p>
              <p className="text-sm break-words text-muted">{me.value.email}</p>
            </div>
            {me.value.planUsage ? (
              <Badge tone="success">ChatGPT plan connected</Badge>
            ) : (
              <Banner tone="info" title="ChatGPT is not connected">
                You are looking at sample content. Signing in lets lessons be written from your own material.
              </Banner>
            )}
            <div>
              <ButtonLink href="/signin">Sign in</ButtonLink>
            </div>
          </>
        ) : (
          <Skeleton className="h-10 w-3/5" />
        )}
      </Row>

      <Row title="Model">
        {models.value ? (
          <>
            <label htmlFor="model" className="sr-only">
              Model
            </label>
            <select
              id="model"
              className="h-10 max-w-full rounded-md border border-border-input bg-surface px-3 text-base"
              defaultValue={models.value[0]}
            >
              {models.value.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <p className="text-sm text-muted">The list comes from the models your ChatGPT plan offers.</p>
          </>
        ) : (
          <Skeleton className="h-10 w-3/5" />
        )}
      </Row>

      <Row title="Appearance">
        <div role="radiogroup" aria-label="Theme" className="flex gap-2">
          {(["system", "light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={theme === t}
              onClick={() => {
                setTheme(t);
                applyTheme(t);
              }}
              className={cn(
                "h-10 rounded-md border px-4 text-sm capitalize transition-colors duration-[var(--m-fast)]",
                theme === t
                  ? "border-accent bg-accent-soft font-medium text-accent-text"
                  : "border-border-input bg-surface hover:bg-sunken",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Row>

      <Row title="Data">
        <p className="text-sm text-muted">
          Everything is stored on this computer. Resetting removes your lessons and restores the samples.
        </p>
        <div>
          <Dialog
            trigger={<Button variant="danger">Reset all data</Button>}
            title="Reset all data?"
            description="Every lesson, card, quiz answer and chat on this computer is removed and the sample lessons are restored. This cannot be undone."
            footer={
              <Button variant="danger" onClick={() => data.resetAll().then(() => window.location.assign("/app"))}>
                Reset everything
              </Button>
            }
          />
        </div>
      </Row>
    </div>
  );
}

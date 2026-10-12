"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, ButtonLink, Kbd } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Banner, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data } from "@/lib/data";
import { applyTheme, savedTheme, type Theme } from "@/lib/theme";
import { useData } from "@/lib/use-data";

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const shortcuts: { keys: string[]; what: string }[] = [
  { keys: ["Ctrl", "K"], what: "Search and jump" },
  { keys: ["N"], what: "New lesson" },
  { keys: ["1", "–", "4"], what: "Pick an answer" },
  { keys: ["Enter"], what: "Check, then continue" },
  { keys: ["Space"], what: "Flip a flashcard" },
  { keys: ["←", "→"], what: "Previous or next quiz question" },
];

function Row({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
      <h2 className="text-base font-bold">{title}</h2>
      {detail ? <p className="mt-0.5 text-sm text-muted">{detail}</p> : null}
      <div className="mt-4 flex min-w-0 flex-col gap-3">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const me = useData(() => data.me(), []);
  const models = useData(() => data.listModels(), []);
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => setTheme(savedTheme()), []);

  return (
    <div className="anim-rise mx-auto max-w-(--l-read) px-4 py-8 md:py-10">
      <p className="eyebrow">Settings</p>
      <h1 className="mt-1 mb-6 text-xl">Your setup</h1>

      <div className="stagger flex flex-col gap-4">
        <Row title="Account">
          {me.value ? (
            <>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-base font-bold text-accent-text"
                >
                  {me.value.name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words">{me.value.name}</p>
                  <p className="text-sm break-words text-muted">{me.value.email}</p>
                </div>
                {me.value.signedIn && me.value.planUsage ? <Badge tone="success">ChatGPT plan connected</Badge> : null}
              </div>
              {!me.value.signedIn ? (
                <>
                  <Banner tone="info" title="ChatGPT is not connected">
                    You are looking at sample content. Signing in lets lessons be written from your own material.
                  </Banner>
                  <div>
                    <ButtonLink href="/signin" variant="primary">
                      Sign in
                    </ButtonLink>
                  </div>
                </>
              ) : (
                <>
                  {!me.value.planUsage ? (
                    <Banner tone="warning" title="ChatGPT is not connected">
                      The connection expired or plan usage was not granted. Your lessons are safe, but nothing new
                      can be written until you reconnect.
                    </Banner>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {!me.value.planUsage ? (
                      <Button variant="primary" onClick={() => window.location.assign("/auth/start")}>
                        Reconnect ChatGPT
                      </Button>
                    ) : null}
                    <Button onClick={() => window.location.assign("/auth/start?switch=1")}>
                      Use a different account
                    </Button>
                    <Button
                      onClick={async () => {
                        await data.signOut();
                        window.location.assign("/signin");
                      }}
                    >
                      Sign out and disconnect
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <Skeleton className="h-11 w-3/5" />
          )}
        </Row>

        <Row title="Model" detail="The list comes from the models your ChatGPT plan offers.">
          {models.value ? (
            <div className="max-w-sm">
              <Select
                label="Model"
                hideLabel
                defaultValue={me.value?.model ?? models.value[0]?.slug}
                onChange={(e) => data.setModel(e.target.value)}
              >
                {models.value.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : models.error ? (
            <Banner tone="warning" title="The model list could not be loaded">
              {models.error}
            </Banner>
          ) : (
            <Skeleton className="h-11 w-3/5" />
          )}
        </Row>

        <Row title="Appearance">
          <div role="radiogroup" aria-label="Theme" className="flex max-w-sm gap-1 rounded-md bg-sunken p-1">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => {
                  setTheme(value);
                  applyTheme(value);
                }}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center gap-2 rounded-sm text-sm font-semibold",
                  "transition duration-[var(--m-fast)]",
                  theme === value ? "bg-surface text-text shadow-card" : "text-muted hover:text-text",
                )}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </Row>

        <Row title="Keyboard shortcuts">
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {shortcuts.map((s) => (
              <div key={s.what} className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted">{s.what}</dt>
                <dd className="flex items-center gap-1">
                  {s.keys.map((k, i) => (k === "–" ? <span key={i}>–</span> : <Kbd key={i}>{k}</Kbd>))}
                </dd>
              </div>
            ))}
          </dl>
        </Row>

        <Row title="Data" detail="Everything is stored on this computer. Resetting removes every lesson and folder.">
          <div>
            <Dialog
              trigger={<Button variant="danger">Reset all data</Button>}
              title="Reset all data?"
              description="Every lesson, folder, card, quiz answer and chat is removed from this computer, along with uploaded files. This cannot be undone."
              footer={
                <Button variant="danger" onClick={() => data.resetAll().then(() => window.location.assign("/app"))}>
                  Reset everything
                </Button>
              }
            />
          </div>
        </Row>
      </div>
    </div>
  );
}

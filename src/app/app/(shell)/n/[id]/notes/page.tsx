"use client";

import { Check, Copy, List, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { useLessonId } from "@/components/lesson-frame";
import { headingId, Markdown } from "@/components/markdown";
import { Button, IconButton } from "@/components/ui/button";
import { Banner, Progress, Skeleton, StreamCaret } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data } from "@/lib/data";
import { useData } from "@/lib/use-data";

/** The level-two headings of the notes, for the contents list. */
function outline(markdown: string) {
  const headings: { id: string; label: string }[] = [];
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const match = fenced ? null : /^##\s+(.+?)\s*#*$/.exec(line);
    if (match) {
      const label = match[1].replace(/[*_`$]/g, "");
      headings.push({ id: headingId(label), label });
    }
  }
  return headings;
}

type Panel = "contents" | "tutor";

export default function NotesPage() {
  const id = useLessonId();
  const lesson = useData(() => data.getLesson(id), [id]);
  const note = useData(() => data.getNote(id), [id]);
  const [panel, setPanel] = useState<Panel>("contents");
  // On narrow screens the side panel sits above the notes and starts closed.
  const [openSmall, setOpenSmall] = useState(false);
  const [copied, setCopied] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  const markdown = note.value?.markdown ?? "";
  const headings = useMemo(() => outline(markdown), [markdown]);

  // Highlight the heading being read.
  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((el) => el !== null);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setCurrent(entry.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings]);

  if (note.error) return <Banner tone="danger" title="The notes could not be loaded">{note.error}</Banner>;
  if (!note.value || !lesson.value) {
    return (
      <div className="flex max-w-(--l-read) flex-col gap-3" aria-busy="true">
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    );
  }

  const n = note.value;
  const failed = lesson.value.status === "failed";

  const pick = (p: Panel) => {
    setOpenSmall(panel === p ? !openSmall : true);
    setPanel(p);
  };

  const segment = (p: Panel, label: string, Icon: typeof List, disabled = false) => (
    <button
      type="button"
      role="tab"
      aria-selected={panel === p}
      disabled={disabled}
      onClick={() => pick(p)}
      className={cn(
        "flex h-9 flex-1 items-center justify-center gap-2 rounded-sm px-3 text-sm font-semibold",
        "transition duration-[var(--m-fast)] disabled:cursor-not-allowed disabled:opacity-45",
        panel === p ? "bg-surface text-text shadow-card" : "text-muted hover:text-text",
      )}
    >
      <Icon className="size-4" aria-hidden /> {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <article className="min-w-0 flex-1 lg:max-w-(--l-read)" aria-busy={n.generating}>
        {n.generating ? (
          <div className="mb-6 flex flex-col gap-2 rounded-md border border-border bg-surface p-4" role="status">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{n.label || "Starting"}</span>
              <span className="font-mono text-muted">{n.progress}%</span>
            </div>
            <Progress value={n.progress} label="Writing notes" />
          </div>
        ) : null}
        {failed ? (
          <div className="mb-6">
            <Banner
              tone="warning"
              title="Writing stopped before the notes were finished"
              action={
                <Button size="sm" onClick={() => data.retryGeneration(id)}>
                  Start again
                </Button>
              }
            >
              {n.error ?? "What was written so far is kept below."}
            </Banner>
          </div>
        ) : null}
        {n.truncated ? (
          <div className="mb-6">
            <Banner tone="warning" title="This source is longer than one lesson can cover">
              These notes cover only the first part of it. Split the document and make a lesson from each
              part to cover the rest.
            </Banner>
          </div>
        ) : null}
        {n.markdown ? <Markdown>{n.markdown}</Markdown> : null}
        {n.generating ? <StreamCaret /> : null}
        {!n.markdown && !n.generating && !failed ? (
          <p className="text-muted">There are no notes for this lesson.</p>
        ) : null}
      </article>

      <aside className="order-first flex w-full shrink-0 flex-col gap-3 lg:sticky lg:top-6 lg:order-last lg:w-90">
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Side panel" className="flex flex-1 gap-1 rounded-md bg-sunken p-1">
            {segment("contents", "Contents", List)}
            {segment("tutor", "Ask the tutor", MessageSquare, n.generating)}
          </div>
          <IconButton
            label={copied ? "Copied" : "Copy notes"}
            disabled={!n.markdown}
            onClick={async () => {
              await navigator.clipboard.writeText(n.markdown);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? (
              <Check className="anim-pop size-4 text-success" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
          </IconButton>
        </div>

        <div className={cn(!openSmall && "hidden lg:block")}>
          {panel === "contents" ? (
            <nav
              aria-label="Contents"
              className="anim-fade max-h-[50dvh] overflow-y-auto rounded-lg border border-border bg-surface p-2 lg:max-h-[calc(100dvh-8rem)]"
            >
              {headings.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted">Headings appear here as the notes are written.</p>
              ) : null}
              {headings.map((h, i) => (
                <a
                  key={`${h.id}-${i}`}
                  href={`#${h.id}`}
                  aria-current={current === h.id ? "location" : undefined}
                  className={cn(
                    "flex min-h-9 items-center rounded-md border-l-2 px-3 py-1.5 text-sm",
                    "transition-colors duration-[var(--m-fast)]",
                    current === h.id
                      ? "border-accent bg-accent-soft font-semibold text-accent-text"
                      : "border-transparent text-muted hover:bg-sunken hover:text-text",
                  )}
                >
                  {h.label}
                </a>
              ))}
            </nav>
          ) : (
            <div className="anim-fade h-[60dvh] rounded-lg border border-border bg-surface lg:h-[calc(100dvh-8rem)]">
              <ChatPanel lessonId={id} scope="notes" />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

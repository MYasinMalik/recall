"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { Question } from "@/components/question";
import { Button, ButtonLink, Kbd } from "@/components/ui/button";
import { Banner, Progress, Skeleton } from "@/components/ui/surface";
import { data } from "@/lib/data";
import { useData } from "@/lib/use-data";

export default function SectionReaderPage() {
  const { id, section: sectionId } = useParams<{ id: string; section: string }>();
  const section = useData(() => data.getSection(sectionId), [sectionId]);
  const [finished, setFinished] = useState(false);
  const latest = useRef<HTMLDivElement>(null);
  const back = `/app/n/${id}`;

  const s = section.value;
  const shown = s ? Math.min(s.furthest, s.blocks.length - 1) : 0;
  const current = s?.blocks[shown];
  const waiting = current !== undefined && current.kind !== "text" && !current.response;
  const isLast = s ? shown >= s.blocks.length - 1 : false;

  useEffect(() => setFinished(false), [sectionId]);

  useEffect(() => {
    if (shown > 0) latest.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [shown]);

  const advance = async () => {
    if (!s || waiting) return;
    if (isLast) {
      await data.completeSection(s.id);
      setFinished(true);
    } else {
      await data.revealBlock(s.id, shown + 1);
    }
  };

  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !waiting && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        void advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s?.id, shown, waiting, finished]);

  if (section.error || s === null) {
    return (
      <main className="mx-auto max-w-(--l-read) px-4 py-12">
        <Banner tone="danger" title="This section could not be opened">
          <Link href={back} className="underline underline-offset-4">
            Back to the lesson
          </Link>
        </Banner>
      </main>
    );
  }
  if (!s) {
    return (
      <main className="mx-auto flex max-w-(--l-read) flex-col gap-4 px-4 py-12" aria-busy="true">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-24 w-full" />
      </main>
    );
  }

  if (finished) {
    const questions = s.blocks.filter((b) => b.kind !== "text");
    const correct = questions.filter((b) => b.response?.correct).length;
    return (
      <main className="mx-auto flex min-h-dvh max-w-(--l-read) flex-col items-center justify-center gap-5 px-4 py-12 text-center">
        <svg viewBox="0 0 64 64" fill="none" className="size-20 text-success" aria-hidden>
          <circle cx="32" cy="32" r="28" pathLength="1" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="anim-draw" />
          <path
            d="M21 33l8 8 15-17"
            pathLength="1"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="anim-draw" style={{ animationDelay: "320ms" }}
          />
        </svg>
        <div className="anim-rise" style={{ animationDelay: "200ms" }}>
          <p className="eyebrow">Section {s.seq} finished</p>
          <h1 className="mt-2 text-display break-words">{s.title}</h1>
          {questions.length > 0 ? (
            <p className="mt-3 text-read text-muted">
              You answered <span className="font-bold text-text">{correct}</span> of {questions.length} correctly.
            </p>
          ) : null}
        </div>
        <div className="anim-rise flex flex-wrap justify-center gap-3" style={{ animationDelay: "320ms" }}>
          {s.nextSectionId ? (
            <ButtonLink href={`/app/n/${id}/learn/${s.nextSectionId}`} variant="primary" size="lg">
              Next section <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          ) : null}
          <ButtonLink href={back} size="lg" variant={s.nextSectionId ? "secondary" : "primary"}>
            {s.nextSectionId ? "Back to the lesson" : "Finish"}
          </ButtonLink>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-(--l-header) max-w-(--l-read) items-center gap-2 px-2 sm:px-4">
          <Link
            href={back}
            aria-label="Close and return to the lesson"
            title="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-[var(--m-fast)] hover:bg-sunken hover:text-text"
          >
            <X className="size-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{s.title}</p>
            <div className="mt-1.5">
              <Progress value={shown + 1} max={s.blocks.length} label="Section progress" />
            </div>
          </div>
          <span className="shrink-0 px-2 font-mono text-xs text-muted">
            {shown + 1}/{s.blocks.length}
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-(--l-read) flex-col gap-10 px-4 pt-10 pb-40">
        {s.blocks.slice(0, shown + 1).map((b, i) => (
          <div key={b.id} ref={i === shown ? latest : undefined} className="anim-rise scroll-mt-20">
            {b.kind === "text" ? (
              <Markdown>{b.body}</Markdown>
            ) : (
              <div className="rounded-lg border border-border bg-surface p-5 shadow-card sm:p-6">
                <Question
                  prompt={b.body.replace("____", "\\_\\_\\_\\_")}
                  options={b.options}
                  variant={b.kind}
                  response={b.response}
                  active={i === shown}
                  onAnswer={(chosen) => data.answerBlock(b.id, chosen)}
                />
              </div>
            )}
          </div>
        ))}
      </main>

      {/* The way forward is always in the same place, however long the block above is. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-(--l-read) items-center justify-between gap-3 px-4">
          <span className="text-sm text-muted">
            {waiting ? "Answer the question to carry on." : isLast ? "That was the last step." : "Ready for the next step?"}
          </span>
          <Button variant="primary" size="lg" disabled={waiting} onClick={advance}>
            {isLast ? "Finish section" : "Continue"} <Kbd>Enter</Kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}

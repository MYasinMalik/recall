"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Banner, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data } from "@/lib/data";
import { useData } from "@/lib/use-data";

export function useLessonId() {
  return useParams<{ id: string }>().id;
}

export function LessonFrame({ children }: { children: ReactNode }) {
  const id = useLessonId();
  const pathname = usePathname();
  const lesson = useData(() => data.getLesson(id), [id]);
  const base = `/app/n/${id}`;

  if (lesson.value === null) {
    return (
      <div className="mx-auto max-w-(--l-read) px-4 py-12">
        <Banner tone="danger" title="This lesson does not exist">
          It may have been deleted.{" "}
          <Link href="/app" className="underline underline-offset-4">
            Back to the library
          </Link>
        </Banner>
      </div>
    );
  }

  const l = lesson.value;
  const tabs = [
    { href: base, label: "Lesson", pending: l ? l.sectionCount === 0 : false },
    { href: `${base}/notes`, label: "Notes", pending: false },
    { href: `${base}/cards`, label: "Cards", pending: l ? l.cardCount === 0 : false },
    { href: `${base}/quiz`, label: "Quiz", pending: l ? l.questionCount === 0 : false },
    { href: `${base}/source`, label: "Source", pending: false },
  ];

  return (
    <div className="mx-auto max-w-(--l-workspace) px-4 pt-6 md:px-8 md:pt-8">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow">{l ? l.sourceName : "Lesson"}</p>
          {l?.status === "generating" ? <Badge tone="accent">Writing</Badge> : null}
          {l?.status === "failed" ? <Badge tone="danger">Stopped</Badge> : null}
        </div>
        {l ? (
          <h1 className="mt-1 text-xl break-words">{l.title}</h1>
        ) : (
          <Skeleton className="mt-2 h-8 w-3/5" />
        )}
      </header>
      <nav aria-label="Lesson views" className="mt-4 flex gap-6 overflow-x-auto border-b border-border">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 text-sm",
                "transition-colors duration-[var(--m-fast)]",
                active
                  ? "border-accent font-semibold text-text"
                  : "border-transparent text-muted hover:text-text",
              )}
            >
              {t.label}
              {t.pending ? (
                <span className="size-1.5 rounded-pill bg-border-input">
                  <span className="sr-only">(not made yet)</span>
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="py-8">{children}</div>
    </div>
  );
}

/** Shown on Cards, Quiz and Lesson while notes are still being written. */
export function NotReadyNotice({ id }: { id: string }) {
  return (
    <Banner
      tone="info"
      title="The notes are still being written"
      action={
        <ButtonLink href={`/app/n/${id}/notes`} size="sm">
          Open notes
        </ButtonLink>
      }
    >
      This view opens up once they are finished.
    </Banner>
  );
}

"use client";

import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { NotReadyNotice, useLessonId } from "@/components/lesson-frame";
import { ButtonLink } from "@/components/ui/button";
import { Banner, EmptyState, Progress, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data, type SectionKind } from "@/lib/data";
import { useData } from "@/lib/use-data";

const kindLabel: Record<SectionKind, string> = {
  intro: "Warm-up",
  content: "Section",
  checkpoint: "Checkpoint",
  final: "Final check",
};

export default function LessonOverviewPage() {
  const id = useLessonId();
  const lesson = useData(() => data.getLesson(id), [id]);
  const sections = useData(() => data.listSections(id), [id]);

  if (sections.error) return <Banner tone="danger" title="The lesson could not be loaded">{sections.error}</Banner>;
  if (!sections.value || !lesson.value) {
    return (
      <div className="flex max-w-(--l-read) flex-col gap-4" aria-busy="true">
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (lesson.value.status === "generating") return <NotReadyNotice id={id} />;
  if (sections.value.length === 0) {
    return (
      <div className="max-w-(--l-read)">
        <EmptyState
          title="No guided lesson for this one"
          action={<ButtonLink href={`/app/n/${id}/notes`}>Read the notes</ButtonLink>}
        >
          This lesson only has notes. A guided lesson with questions is made when a lesson is created from a
          source.
        </EmptyState>
      </div>
    );
  }

  const list = sections.value;
  const done = list.filter((s) => s.done).length;
  const next = list.find((s) => !s.done);

  return (
    <div className="max-w-(--l-read)">
      <p className="text-read text-muted">{lesson.value.summary}</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {next ? (
          <ButtonLink href={`/app/n/${id}/learn/${next.id}`} variant="primary" size="lg">
            {done === 0 ? "Start the lesson" : "Continue"}
          </ButtonLink>
        ) : (
          <Banner tone="success" title="Lesson complete">
            Every section is finished. Reopen any of them below.
          </Banner>
        )}
        {next ? (
          <p className="text-sm text-muted">
            Up next: <span className="text-text">{next.title}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex items-center justify-between text-sm text-muted">
        <span>
          {done} of {list.length} sections done
        </span>
      </div>
      <div className="mt-2">
        <Progress value={done} max={list.length} label="Lesson progress" />
      </div>

      <ol className="mt-6">
        {list.map((s) => {
          const body = (
            <>
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-pill border font-mono text-xs",
                  s.done
                    ? "border-success bg-success-soft text-success"
                    : s.locked
                      ? "border-border text-muted"
                      : "border-accent text-accent-text",
                )}
              >
                {s.done ? <Check className="size-4" /> : s.locked ? <Lock className="size-3.5" /> : s.seq}
              </span>
              <span className="min-w-0 flex-1">
                <span className="eyebrow block">{kindLabel[s.kind]}</span>
                <span className="block font-serif text-lg font-semibold break-words">{s.title}</span>
              </span>
              <span className="shrink-0 text-right font-mono text-xs text-muted">
                {s.done && s.answered > 0 ? `${s.correct}/${s.answered} correct` : `${s.blockCount} steps`}
              </span>
            </>
          );
          return (
            <li key={s.id} className="border-b border-border">
              {s.locked ? (
                <div className="flex items-center gap-4 py-4 opacity-70" aria-disabled="true">
                  {body}
                  <span className="sr-only">Locked until the previous section is finished</span>
                </div>
              ) : (
                <Link
                  href={`/app/n/${id}/learn/${s.id}`}
                  className="flex items-center gap-4 py-4 transition-colors duration-[var(--m-fast)] hover:bg-sunken"
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

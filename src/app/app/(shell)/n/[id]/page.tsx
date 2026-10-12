"use client";

import { ArrowRight, Check, GraduationCap, Lock } from "lucide-react";
import Link from "next/link";
import { NotReadyNotice, useLessonId } from "@/components/lesson-frame";
import { Button, ButtonLink } from "@/components/ui/button";
import { Banner, EmptyState, ProgressRing, Skeleton } from "@/components/ui/surface";
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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (lesson.value.status === "generating") return <NotReadyNotice id={id} />;
  if (sections.value.length === 0 && lesson.value.lessonPending) {
    return (
      <div className="max-w-(--l-read)">
        <Banner
          tone="info"
          title="The guided lesson is being written"
          action={
            <ButtonLink href={`/app/n/${id}/notes`} size="sm">
              Read the notes
            </ButtonLink>
          }
        >
          It appears here in a moment. The notes are ready now.
        </Banner>
      </div>
    );
  }
  if (sections.value.length === 0) {
    return (
      <div className="max-w-(--l-read)">
        <EmptyState
          title="The guided lesson was not finished"
          icon={<GraduationCap className="size-6" aria-hidden />}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => data.writeGuidedLesson(id)}>
                Write the guided lesson
              </Button>
              <ButtonLink href={`/app/n/${id}/notes`}>Read the notes</ButtonLink>
            </div>
          }
        >
          The notes are ready, but writing the step-by-step lesson with questions stopped part way. It takes a
          couple of minutes to write again.
        </EmptyState>
      </div>
    );
  }

  const list = sections.value;
  const done = list.filter((s) => s.done).length;
  const next = list.find((s) => !s.done);

  return (
    <div className="max-w-(--l-read)">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
        <ProgressRing value={done} max={list.length} size={60} stroke={6} label="Lesson progress">
          {Math.round((done / list.length) * 100)}%
        </ProgressRing>
        <div className="min-w-40 flex-1">
          <p className="text-sm text-muted">
            {done} of {list.length} sections done
          </p>
          <p className="text-base font-bold break-words">{next ? `Up next: ${next.title}` : "Lesson complete"}</p>
        </div>
        {next ? (
          <ButtonLink href={`/app/n/${id}/learn/${next.id}`} variant="primary" size="lg">
            {done === 0 ? "Start the lesson" : "Continue"} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        ) : (
          <ButtonLink href={`/app/n/${id}/quiz`} size="lg">
            Take the quiz
          </ButtonLink>
        )}
      </div>

      <p className="mt-6 text-read text-muted">{lesson.value.summary}</p>

      <ol className="stagger mt-6">
        {list.map((s, i) => {
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="eyebrow block">{kindLabel[s.kind]}</span>
                <span className="block text-base font-bold break-words">{s.title}</span>
              </span>
              <span className="shrink-0 text-right text-xs font-medium text-muted">
                {s.done && s.answered > 0 ? `${s.correct}/${s.answered} correct` : `${s.blockCount} steps`}
              </span>
            </>
          );
          return (
            <li key={s.id} className="flex gap-4">
              {/* Timeline: a numbered dot with a line running down to the next one. */}
              <span aria-hidden className="flex flex-col items-center pt-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-pill border-2 text-xs font-bold",
                    s.done
                      ? "border-success bg-success text-surface"
                      : s.locked
                        ? "border-border bg-sunken text-muted"
                        : "border-accent bg-accent-soft text-accent-text",
                  )}
                >
                  {s.done ? <Check className="size-4" /> : s.locked ? <Lock className="size-3.5" /> : s.seq}
                </span>
                {i < list.length - 1 ? (
                  <span className={cn("mt-1 w-0.5 flex-1 rounded-pill", s.done ? "bg-success" : "bg-border")} />
                ) : null}
              </span>
              <div className="min-w-0 flex-1 pb-3">
                {s.locked ? (
                  <div className="flex min-h-15 items-center gap-4 rounded-md px-3 py-2 opacity-60" aria-disabled="true">
                    {body}
                    <span className="sr-only">Locked until the previous section is finished</span>
                  </div>
                ) : (
                  <Link
                    href={`/app/n/${id}/learn/${s.id}`}
                    className={cn(
                      "flex min-h-15 items-center gap-4 rounded-md border border-transparent px-3 py-2",
                      "transition duration-[var(--m-fast)] ease-out hover:border-border hover:bg-surface hover:shadow-card",
                      s === next && "border-accent/40 bg-surface shadow-card",
                    )}
                  >
                    {body}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

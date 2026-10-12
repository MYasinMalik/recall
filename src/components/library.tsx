"use client";

import { ArrowRight, BookOpen, FileText, Link2, Lightbulb, Plus, Search, Trash2, Type } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink, IconButton, Kbd } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Banner, EmptyState, ProgressRing, Skeleton } from "@/components/ui/surface";
import { data, type Lesson, type SourceKind } from "@/lib/data";
import { useData } from "@/lib/use-data";

const kindIcon: Record<SourceKind, typeof FileText> = {
  file: FileText,
  text: Type,
  link: Link2,
  topic: Lightbulb,
};

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

const lessonHref = (l: Lesson) => `/app/n/${l.id}${l.status === "ready" ? "" : "/notes"}`;

function LessonCard({ lesson }: { lesson: Lesson }) {
  const Icon = kindIcon[lesson.sourceKind];
  const started = lesson.sectionCount > 0;
  return (
    <li
      className={
        "group relative flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card " +
        "transition duration-[var(--m-base)] ease-out hover:-translate-y-0.5 hover:border-border-input hover:shadow-lift " +
        "focus-within:border-accent"
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-text">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-6 font-bold break-words">
            {/* The link stretches over the whole card. */}
            <Link href={lessonHref(lesson)} className="outline-none after:absolute after:inset-0 after:rounded-lg">
              {lesson.title}
            </Link>
          </h2>
          <p className="truncate text-xs text-muted">{lesson.sourceName}</p>
        </div>
        <div className="relative z-10 -mt-2 -mr-2">
          <Dialog
            trigger={
              <IconButton
                label={`Delete ${lesson.title}`}
                className="opacity-60 group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
              >
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            }
            title="Delete this lesson?"
            description="Its notes, cards, quiz and source are removed from this computer. This cannot be undone."
            footer={
              <Button variant="danger" onClick={() => data.deleteLesson(lesson.id)}>
                Delete lesson
              </Button>
            }
          />
        </div>
      </div>

      <p className="line-clamp-2 min-h-10 text-sm text-muted">{lesson.summary}</p>

      <div className="mt-auto flex min-h-9 items-center gap-2 border-t border-border pt-3">
        {lesson.status === "generating" ? <Badge tone="accent">Writing…</Badge> : null}
        {lesson.status === "failed" ? <Badge tone="danger">Stopped</Badge> : null}
        {started ? (
          <span className="flex items-center gap-2 text-xs font-medium text-muted">
            <ProgressRing value={lesson.sectionsDone} max={lesson.sectionCount} size={20} stroke={3} label="Lesson progress" />
            {lesson.sectionsDone}/{lesson.sectionCount} sections
          </span>
        ) : null}
        {lesson.cardCount > 0 ? <span className="text-xs font-medium text-muted">· {lesson.cardCount} cards</span> : null}
        <span className="ml-auto text-xs text-muted">{dateFormat.format(lesson.updatedAt)}</span>
      </div>
    </li>
  );
}

/** The lesson most worth reopening: the latest one with sections still to do. */
function ContinueCard({ lesson }: { lesson: Lesson }) {
  return (
    <Link
      href={`/app/n/${lesson.id}`}
      className={
        "group mt-6 flex items-center gap-4 rounded-lg border border-accent/30 bg-accent-soft p-5 " +
        "transition duration-[var(--m-base)] ease-out hover:-translate-y-0.5 hover:shadow-lift"
      }
    >
      <ProgressRing value={lesson.sectionsDone} max={lesson.sectionCount} size={52} stroke={5} label="Lesson progress">
        {Math.round((lesson.sectionsDone / lesson.sectionCount) * 100)}%
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-accent-text">Pick up where you left off</p>
        <p className="mt-0.5 truncate text-lg">{lesson.title}</p>
        <p className="text-sm text-accent-text">
          {lesson.sectionsDone} of {lesson.sectionCount} sections done
        </p>
      </div>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-accent text-on-accent transition-transform duration-[var(--m-base)] ease-spring group-hover:translate-x-1">
        <ArrowRight className="size-5" aria-hidden />
      </span>
    </Link>
  );
}

export function LibraryView({ folderId }: { folderId?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const lessons = useData(() => data.listLessons({ folderId, query }), [folderId, query]);
  const folders = useData(() => data.listFolders(), []);
  const folder = folderId ? folders.value?.find((f) => f.id === folderId) : undefined;
  const missingFolder = folderId && folders.value && !folder;
  const resume =
    !folderId && !query
      ? lessons.value?.find((l) => l.status === "ready" && l.sectionCount > 0 && l.sectionsDone < l.sectionCount)
      : undefined;

  return (
    <div className="anim-rise mx-auto max-w-(--l-workspace) px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{folderId ? "Folder" : "Library"}</p>
          <h1 className="mt-1 text-xl break-words">{folderId ? (folder?.name ?? "…") : "All lessons"}</h1>
        </div>
        <div className="flex gap-2">
          {folder ? (
            <Dialog
              trigger={<Button variant="ghost">Delete folder</Button>}
              title="Delete this folder?"
              description="The lessons inside are kept and move back to All lessons."
              footer={
                <Button
                  variant="danger"
                  onClick={async () => {
                    await data.deleteFolder(folder.id);
                    router.push("/app");
                  }}
                >
                  Delete folder
                </Button>
              }
            />
          ) : null}
          <ButtonLink href="/app/new" variant="primary" icon={<Plus className="size-4" aria-hidden />}>
            New lesson{" "}
            <span className="hidden sm:inline">
              <Kbd>N</Kbd>
            </span>
          </ButtonLink>
        </div>
      </div>

      {missingFolder ? (
        <div className="mt-8">
          <Banner tone="danger" title="This folder no longer exists">
            <Link href="/app" className="underline underline-offset-4">
              Back to all lessons
            </Link>
          </Banner>
        </div>
      ) : (
        <>
          {resume ? <ContinueCard lesson={resume} /> : null}

          <label
            className={
              "mt-6 flex h-11 max-w-md items-center gap-2.5 rounded-md border border-border-input bg-surface px-3 " +
              "transition-[border-color,box-shadow] duration-[var(--m-fast)] " +
              "focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--c-accent-soft)]"
            }
          >
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="sr-only">Filter lessons</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title or note text"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            />
          </label>

          {lessons.error ? (
            <div className="mt-6">
              <Banner tone="danger" title="The library could not be loaded">
                {lessons.error}
              </Banner>
            </div>
          ) : lessons.value === undefined ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
                  <Skeleton className="size-10" />
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : lessons.value.length === 0 ? (
            <div className="mt-6">
              {query ? (
                <EmptyState title="Nothing matches that" icon={<Search className="size-6" aria-hidden />}>
                  No lesson title or note contains “{query}”. Try a shorter word.
                </EmptyState>
              ) : (
                <EmptyState
                  title={folderId ? "This folder is empty" : "No lessons yet"}
                  icon={<BookOpen className="size-6" aria-hidden />}
                  action={
                    <ButtonLink href="/app/new" variant="primary" icon={<Plus className="size-4" aria-hidden />}>
                      New lesson
                    </ButtonLink>
                  }
                >
                  Add a PDF, paste some text, or type a topic. Notes start appearing within a few seconds.
                </EmptyState>
              )}
            </div>
          ) : (
            <ul className="stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lessons.value.map((l) => (
                <LessonCard key={l.id} lesson={l} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

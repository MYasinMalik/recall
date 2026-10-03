"use client";

import { FileText, Link2, Lightbulb, Plus, Search, Trash2, Type } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Banner, EmptyState, Progress, Skeleton } from "@/components/ui/surface";
import { data, type Lesson, type SourceKind } from "@/lib/data";
import { useData } from "@/lib/use-data";

const kindIcon: Record<SourceKind, typeof FileText> = {
  file: FileText,
  text: Type,
  link: Link2,
  topic: Lightbulb,
};

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

function LessonRow({ lesson }: { lesson: Lesson }) {
  const Icon = kindIcon[lesson.sourceKind];
  return (
    <li className="group flex items-start gap-3 border-b border-border py-4">
      <Icon className="mt-1 size-5 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <Link
          href={`/app/n/${lesson.id}${lesson.status === "ready" ? "" : "/notes"}`}
          className="font-serif text-lg font-semibold break-words underline-offset-4 hover:underline"
        >
          {lesson.title}
        </Link>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{lesson.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {lesson.status === "generating" ? <Badge tone="accent">Writing</Badge> : null}
          {lesson.status === "failed" ? <Badge tone="danger">Stopped</Badge> : null}
          {lesson.sectionCount > 0 ? (
            <Badge>
              {lesson.sectionsDone} of {lesson.sectionCount} sections
            </Badge>
          ) : null}
          {lesson.cardCount > 0 ? <Badge>{lesson.cardCount} cards</Badge> : null}
          <span className="font-mono text-xs text-muted">{dateFormat.format(lesson.updatedAt)}</span>
        </div>
        {lesson.sectionCount > 0 && lesson.sectionsDone > 0 ? (
          <div className="mt-3 max-w-60">
            <Progress value={lesson.sectionsDone} max={lesson.sectionCount} label="Lesson progress" />
          </div>
        ) : null}
      </div>
      <Dialog
        trigger={
          <Button variant="ghost" size="sm" aria-label={`Delete ${lesson.title}`}>
            <Trash2 className="size-4 text-muted" aria-hidden />
          </Button>
        }
        title="Delete this lesson?"
        description="Its notes, cards, quiz and source are removed from this computer. This cannot be undone."
        footer={
          <Button variant="danger" onClick={() => data.deleteLesson(lesson.id)}>
            Delete lesson
          </Button>
        }
      />
    </li>
  );
}

export function LibraryView({ folderId }: { folderId?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const lessons = useData(() => data.listLessons({ folderId, query }), [folderId, query]);
  const folders = useData(() => data.listFolders(), []);
  const folder = folderId ? folders.value?.find((f) => f.id === folderId) : undefined;
  const missingFolder = folderId && folders.value && !folder;

  return (
    <div className="mx-auto max-w-(--l-read) px-4 py-8 md:py-12">
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
            New lesson
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
          <label className="mt-6 flex h-10 items-center gap-2 rounded-md border border-border-input bg-surface px-3 focus-within:border-accent">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="sr-only">Search lessons</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles and notes"
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
            <div className="mt-6 flex flex-col gap-6" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-3/5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : lessons.value.length === 0 ? (
            <div className="mt-6">
              {query ? (
                <EmptyState title="Nothing matches that search">
                  No lesson title or note contains “{query}”. Try a shorter word.
                </EmptyState>
              ) : (
                <EmptyState
                  title={folderId ? "This folder is empty" : "No lessons yet"}
                  action={
                    <ButtonLink href="/app/new" variant="primary">
                      New lesson
                    </ButtonLink>
                  }
                >
                  Add a PDF, paste some text, or type a topic. Notes start appearing within a few seconds.
                </EmptyState>
              )}
            </div>
          ) : (
            <ul className="mt-2">
              {lessons.value.map((l) => (
                <LessonRow key={l.id} lesson={l} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

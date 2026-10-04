"use client";

import { MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { useLessonId } from "@/components/lesson-frame";
import { Markdown } from "@/components/markdown";
import { Button, IconButton } from "@/components/ui/button";
import { Banner, Progress, Skeleton, StreamCaret } from "@/components/ui/surface";
import { data } from "@/lib/data";
import { useData } from "@/lib/use-data";

export default function NotesPage() {
  const id = useLessonId();
  const lesson = useData(() => data.getLesson(id), [id]);
  const note = useData(() => data.getNote(id), [id]);
  const [chat, setChat] = useState(false);

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

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <article className="min-w-0 flex-1 lg:max-w-(--l-read)" aria-busy={n.generating}>
        {n.generating ? (
          <div className="mb-6 flex flex-col gap-2" role="status">
            <div className="flex justify-between text-sm text-muted">
              <span>{n.label || "Starting"}</span>
              <span className="font-mono">{n.progress}%</span>
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

      {chat ? (
        <aside className="relative w-full shrink-0 rounded-lg border border-border bg-surface lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:w-90">
          <IconButton label="Close chat" className="absolute top-0.5 right-1" onClick={() => setChat(false)}>
            <X className="size-5" aria-hidden />
          </IconButton>
          <ChatPanel lessonId={id} scope="notes" />
        </aside>
      ) : (
        <div className="lg:sticky lg:top-6">
          <Button
            onClick={() => setChat(true)}
            disabled={n.generating}
            icon={<MessageSquare className="size-4" aria-hidden />}
          >
            Ask the tutor
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { ChatPanel } from "@/components/chat-panel";
import { useLessonId } from "@/components/lesson-frame";
import { Banner, Skeleton } from "@/components/ui/surface";
import { data } from "@/lib/data";
import { useData } from "@/lib/use-data";

export default function SourcePage() {
  const id = useLessonId();
  const lesson = useData(() => data.getLesson(id), [id]);
  const source = useData(() => data.getSourceText(id), [id]);

  if (source.error) return <Banner tone="danger" title="The source could not be loaded">{source.error}</Banner>;
  if (source.value === undefined || !lesson.value) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <section aria-label="Source text" className="min-w-0 flex-1">
        <p className="eyebrow">Text read from {lesson.value.sourceName}</p>
        {source.value.trim() ? (
          <pre className="mt-3 max-h-[70dvh] overflow-auto rounded-lg border border-border bg-surface p-6 font-sans text-base leading-6 whitespace-pre-wrap">
            {source.value}
          </pre>
        ) : (
          <div className="mt-3">
            <Banner tone="warning" title="No text could be read from this source">
              If it is a scanned document, paste the text into a new lesson instead.
            </Banner>
          </div>
        )}
      </section>
      <aside className="w-full shrink-0 rounded-lg border border-border bg-surface lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:w-90">
        <ChatPanel lessonId={id} scope="source" />
      </aside>
    </div>
  );
}

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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <section aria-label="Source text" className="min-w-0 flex-1">
        <p className="eyebrow">Text read from {lesson.value.sourceName}</p>
        {source.value.trim() ? (
          <pre className="mt-3 max-h-[calc(100dvh-14rem)] min-h-64 overflow-auto rounded-lg border border-border bg-surface p-5 font-sans text-base leading-7 whitespace-pre-wrap sm:p-6">
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
      <aside className="h-[60dvh] w-full shrink-0 rounded-lg border border-border bg-surface lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:w-90">
        <ChatPanel lessonId={id} scope="source" />
      </aside>
    </div>
  );
}

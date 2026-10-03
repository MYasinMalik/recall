"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { ChatMessage, Composer } from "@/components/ui/study";
import { Banner } from "@/components/ui/surface";
import { data, type ChatScope } from "@/lib/data";
import { useData } from "@/lib/use-data";

const starters: Record<ChatScope, string[]> = {
  notes: ["Explain the hardest idea here more simply", "Give me an example that is not in the notes"],
  source: ["What are the three main points of this source?", "Where does the source define its key terms?"],
};

export function ChatPanel({ lessonId, scope }: { lessonId: string; scope: ChatScope }) {
  const messages = useData(() => data.listMessages(lessonId, scope), [lessonId, scope]);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const busy = messages.value?.some((m) => m.streaming) ?? false;
  const last = messages.value?.at(-1)?.content.length ?? 0;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.value?.length, last]);

  const send = async (text: string) => {
    setError(null);
    try {
      await data.sendMessage(lessonId, scope, text);
    } catch {
      setError("The reply could not be written. Send your question again.");
    }
  };

  return (
    <section aria-label="Tutor chat" className="flex h-full min-h-0 flex-col">
      <p className="eyebrow border-b border-border px-4 py-3">
        {scope === "source" ? "Ask about the source" : "Ask about these notes"}
      </p>
      <div className="flex min-h-40 flex-1 flex-col gap-5 overflow-y-auto p-4">
        {messages.value?.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              Answers are based on this lesson only. Try one of these, or ask your own question.
            </p>
            {starters[scope].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-md border border-border-input bg-surface px-3 py-2 text-left text-sm transition-colors duration-[var(--m-fast)] hover:bg-sunken"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        {messages.value?.map((m) => (
          <ChatMessage key={m.id} role={m.role} streaming={m.streaming}>
            {m.role === "assistant" ? <Markdown className="prose-compact">{m.content}</Markdown> : m.content}
          </ChatMessage>
        ))}
        {error ? <Banner tone="danger" title={error} /> : null}
        <div ref={end} />
      </div>
      <div className="border-t border-border p-3">
        <Composer disabled={busy} onSend={send} placeholder="Ask a question" />
      </div>
    </section>
  );
}

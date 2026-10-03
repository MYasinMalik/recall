"use client";

import { useEffect, useState } from "react";
import { Markdown } from "@/components/markdown";
import { Button, Kbd } from "@/components/ui/button";
import { ChoiceOption, type ChoiceState } from "@/components/ui/study";
import { Banner } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import type { AnswerResult } from "@/lib/data";

/**
 * One question: options, a Check button, then the result and explanation.
 * Number keys 1-4 pick an option and Enter checks, when `active` is set.
 */
export function Question({
  prompt,
  options,
  variant = "mcq",
  response,
  active = true,
  onAnswer,
}: {
  prompt: string;
  options: string[];
  variant?: "mcq" | "fill";
  response?: AnswerResult;
  active?: boolean;
  onAnswer: (chosen: number) => Promise<unknown>;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answered = response !== undefined;

  const check = async () => {
    if (picked === null || busy || answered) return;
    setBusy(true);
    setError(null);
    try {
      await onAnswer(picked);
    } catch {
      setError("Your answer could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!active || answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) setPicked(n - 1);
      if (e.key === "Enter" && picked !== null) {
        e.preventDefault();
        void check();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, answered, picked, options.length]);

  const stateFor = (i: number): ChoiceState => {
    if (!response) return picked === i ? "selected" : "idle";
    if (i === response.answerIndex) return "correct";
    if (i === response.chosen) return "wrong";
    return "dimmed";
  };

  return (
    <div className="flex flex-col gap-4">
      <Markdown className="prose-compact font-medium">{prompt}</Markdown>
      <div
        role="radiogroup"
        aria-label="Answer options"
        className={cn(variant === "fill" ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2")}
      >
        {options.map((option, i) => (
          <ChoiceOption
            key={i}
            letter={String(i + 1)}
            state={stateFor(i)}
            disabled={answered || busy}
            onSelect={() => setPicked(i)}
          >
            <Markdown className="prose-compact">{option}</Markdown>
          </ChoiceOption>
        ))}
      </div>
      {error ? (
        <Banner tone="danger" title={error} />
      ) : response ? (
        <Banner
          tone={response.correct ? "success" : "danger"}
          title={response.correct ? "Correct" : "Not quite"}
        >
          <Markdown className="prose-compact">{response.explanation}</Markdown>
        </Banner>
      ) : (
        <div className="flex items-center gap-3">
          <Button variant="primary" disabled={picked === null} loading={busy} onClick={check}>
            Check <Kbd>Enter</Kbd>
          </Button>
          <span className="text-sm text-muted">Press 1–{options.length} to choose.</span>
        </div>
      )}
    </div>
  );
}

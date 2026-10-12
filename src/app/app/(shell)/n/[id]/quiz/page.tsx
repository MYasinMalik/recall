"use client";

import { ChevronLeft, ChevronRight, Lightbulb, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { NotReadyNotice, useLessonId } from "@/components/lesson-frame";
import { Question } from "@/components/question";
import { Button, Kbd } from "@/components/ui/button";
import { Badge, Banner, Card, EmptyState, ProgressRing, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data } from "@/lib/data";
import { useData } from "@/lib/use-data";

export default function QuizPage() {
  const id = useLessonId();
  const lesson = useData(() => data.getLesson(id), [id]);
  const questions = useData(() => data.listQuestions(id), [id]);
  const [index, setIndex] = useState(0);
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = questions.value ?? [];
  const q = list[Math.min(index, list.length - 1)];
  const go = (i: number) => {
    if (i < 0 || i >= list.length) return;
    setIndex(i);
    setHint(false);
  };

  // Arrow keys move between questions; Enter moves on once a question is answered; H shows the hint.
  useEffect(() => {
    if (!q) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowRight" || (e.key === "Enter" && q.response && !(e.target instanceof HTMLButtonElement))) {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key.toLowerCase() === "h" && !q.response) {
        setHint(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id, q?.response, index, list.length]);

  if (questions.error) return <Banner tone="danger" title="The quiz could not be loaded">{questions.error}</Banner>;
  if (!questions.value || !lesson.value) return <Skeleton className="h-64 w-full max-w-(--l-read)" />;
  if (lesson.value.status === "generating") return <NotReadyNotice id={id} />;

  if (list.length === 0) {
    return (
      <div className="flex max-w-(--l-read) flex-col gap-4">
        <EmptyState
          title="Test yourself on this lesson"
          icon={<ListChecks className="size-6" aria-hidden />}
          action={
            <Button
              variant="primary"
              size="lg"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await data.generateQuiz(id);
                } catch (e) {
                  setError(e instanceof Error && e.message ? e.message : "The quiz could not be made. Try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Writing questions" : "Make a quiz"}
            </Button>
          }
        >
          Questions are grouped by topic, each with a hint and an explanation of the answer.
        </EmptyState>
        {error ? <Banner tone="danger" title={error} /> : null}
      </div>
    );
  }

  const answered = list.filter((x) => x.response);
  const correct = answered.filter((x) => x.response?.correct).length;
  const finished = answered.length === list.length;

  return (
    <div className="flex max-w-(--l-read) flex-col gap-5">
      {finished ? (
        <div className="anim-pop flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
          <ProgressRing value={correct} max={list.length} size={60} stroke={6} label="Score">
            {Math.round((correct / list.length) * 100)}%
          </ProgressRing>
          <div className="min-w-40 flex-1">
            <p className="text-lg">
              You scored {correct} out of {list.length}
            </p>
            <p className="text-sm text-muted">Step through the questions to reread the explanations.</p>
          </div>
          <Button
            onClick={async () => {
              await data.resetQuiz(id);
              go(0);
            }}
          >
            Start over
          </Button>
        </div>
      ) : null}

      {/* One dot per question: jump anywhere, see what is right, wrong or still open. */}
      <nav aria-label="Questions" className="flex flex-wrap items-center gap-1.5">
        {list.map((x, i) => (
          <button
            key={x.id}
            type="button"
            aria-label={`Question ${i + 1}${x.response ? (x.response.correct ? ", correct" : ", incorrect") : ", not answered"}`}
            aria-current={i === index ? "step" : undefined}
            onClick={() => go(i)}
            className={cn(
              "flex size-8 items-center justify-center rounded-pill text-xs font-bold",
              "transition duration-[var(--m-fast)] ease-out hover:scale-110",
              x.response
                ? x.response.correct
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger"
                : "bg-sunken text-muted",
              i === index && "shadow-[0_0_0_2px_var(--c-accent)]",
            )}
          >
            {i + 1}
          </button>
        ))}
        <span className="ml-auto text-sm font-medium text-muted">
          {correct}/{answered.length} correct
        </span>
      </nav>

      <Card key={q.id} className="anim-rise flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">
            Question {index + 1} of {list.length}
          </p>
          <Badge tone="accent">{q.topic}</Badge>
        </div>
        <Question
          prompt={q.prompt}
          options={q.options}
          response={q.response}
          onAnswer={(chosen) => data.answerQuestion(q.id, chosen)}
        />
        {!q.response ? (
          hint ? (
            <Banner tone="info" title="Hint">
              {q.hint}
            </Banner>
          ) : (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHint(true)}
                icon={<Lightbulb className="size-4" aria-hidden />}
              >
                Show a hint <Kbd>H</Kbd>
              </Button>
            </div>
          )
        ) : null}
      </Card>

      <div className="flex justify-between gap-3">
        <Button disabled={index === 0} onClick={() => go(index - 1)} icon={<ChevronLeft className="size-4" aria-hidden />}>
          Previous
        </Button>
        <Button
          variant={q.response && index < list.length - 1 ? "primary" : "secondary"}
          disabled={index >= list.length - 1}
          onClick={() => go(index + 1)}
        >
          Next <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

"use client";

import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { useState } from "react";
import { NotReadyNotice, useLessonId } from "@/components/lesson-frame";
import { Question } from "@/components/question";
import { Button } from "@/components/ui/button";
import { Badge, Banner, Card, EmptyState, Progress, Skeleton } from "@/components/ui/surface";
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

  if (questions.error) return <Banner tone="danger" title="The quiz could not be loaded">{questions.error}</Banner>;
  if (!questions.value || !lesson.value) return <Skeleton className="h-64 w-full max-w-(--l-read)" />;
  if (lesson.value.status === "generating") return <NotReadyNotice id={id} />;

  const list = questions.value;

  if (list.length === 0) {
    return (
      <div className="flex max-w-(--l-read) flex-col gap-4">
        <EmptyState
          title="Test yourself on this lesson"
          action={
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await data.generateQuiz(id);
                } catch {
                  setError("The quiz could not be made. Try again.");
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

  const answered = list.filter((q) => q.response);
  const correct = answered.filter((q) => q.response?.correct).length;
  const finished = answered.length === list.length;
  const q = list[Math.min(index, list.length - 1)];
  const go = (i: number) => {
    setIndex(i);
    setHint(false);
  };

  return (
    <div className="flex max-w-(--l-read) flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm text-muted">
          <span>
            {answered.length} of {list.length} answered
          </span>
          <span className="font-mono">{correct} correct</span>
        </div>
        <Progress value={answered.length} max={list.length} label="Quiz progress" />
      </div>

      {finished ? (
        <Banner
          tone={correct === list.length ? "success" : "info"}
          title={`You scored ${correct} out of ${list.length}`}
          action={
            <Button
              size="sm"
              onClick={async () => {
                await data.resetQuiz(id);
                go(0);
              }}
            >
              Start over
            </Button>
          }
        >
          Step through the questions to reread the explanations.
        </Banner>
      ) : null}

      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">
            Question {index + 1} of {list.length}
          </p>
          <Badge tone="accent">{q.topic}</Badge>
        </div>
        <Question
          key={q.id}
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
                Show a hint
              </Button>
            </div>
          )
        ) : null}
      </Card>

      <div className="flex justify-between">
        <Button disabled={index === 0} onClick={() => go(index - 1)} icon={<ChevronLeft className="size-4" aria-hidden />}>
          Previous
        </Button>
        <Button disabled={index >= list.length - 1} onClick={() => go(index + 1)}>
          Next <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

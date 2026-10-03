"use client";

import { useEffect, useMemo, useState } from "react";
import { NotReadyNotice, useLessonId } from "@/components/lesson-frame";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Flashcard, GradeButtons } from "@/components/ui/study";
import { Badge, Banner, Progress, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data, type Flashcard as Card } from "@/lib/data";
import { useData } from "@/lib/use-data";

const sizes = [
  { count: 10, label: "Quick pass" },
  { count: 20, label: "Standard" },
  { count: 30, label: "Thorough" },
  { count: 50, label: "Everything" },
];

function Setup({ lessonId, replace }: { lessonId: string; replace?: boolean }) {
  const [count, setCount] = useState(20);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex max-w-(--l-read) flex-col gap-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await data.generateCards(lessonId, count, instructions);
        } catch {
          setError("The cards could not be made. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <h2 className="text-lg">{replace ? "Make a new deck" : "Make flashcards from this lesson"}</h2>
        <p className="mt-1 text-sm text-muted">
          {replace ? "This replaces the current deck and its progress." : "Choose how many, then start reviewing."}
        </p>
      </div>
      <div role="radiogroup" aria-label="Number of cards" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sizes.map((s) => (
          <button
            key={s.count}
            type="button"
            role="radio"
            aria-checked={count === s.count}
            onClick={() => setCount(s.count)}
            className={cn(
              "flex flex-col items-start rounded-md border px-4 py-3 text-left",
              "transition-colors duration-[var(--m-fast)]",
              count === s.count
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-border-input bg-surface hover:bg-sunken",
            )}
          >
            <span className="font-serif text-xl font-semibold">{s.count}</span>
            <span className="text-sm">{s.label}</span>
          </button>
        ))}
      </div>
      <Textarea
        label="Focus (optional)"
        rows={2}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="For example: definitions only"
      />
      {error ? <Banner tone="danger" title={error} /> : null}
      <div>
        <Button type="submit" variant="primary" size="lg" loading={busy}>
          {busy ? "Making cards" : `Make ${count} cards`}
        </Button>
      </div>
    </form>
  );
}

function Study({ cards }: { cards: Card[] }) {
  const queue = useMemo(() => cards.filter((c) => c.state !== "known"), [cards]);
  const [index, setIndex] = useState(0);
  const card = queue[Math.min(index, queue.length - 1)];

  const grade = async (knew: boolean) => {
    if (!card) return;
    await data.reviewCard(card.id, knew);
    // A known card leaves the queue, so the same index already points at the next one.
    if (!knew) setIndex((i) => (i + 1) % Math.max(queue.length, 1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === " " && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>("[data-flashcard]")?.click();
      }
      if (e.key === "1") void grade(false);
      if (e.key === "2") void grade(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  if (!card) {
    return (
      <Banner tone="success" title="Every card is marked as known">
        Nothing left to review in this deck. Make a new deck below to keep going.
      </Banner>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-130 flex-col gap-4">
      <p className="text-center font-mono text-xs text-muted">{queue.length} left to learn</p>
      <Flashcard key={card.id} front={card.front} back={card.back} />
      <GradeButtons onGrade={grade} />
    </div>
  );
}

export default function CardsPage() {
  const id = useLessonId();
  const lesson = useData(() => data.getLesson(id), [id]);
  const cards = useData(() => data.listCards(id), [id]);
  const [remake, setRemake] = useState(false);

  useEffect(() => setRemake(false), [cards.value?.[0]?.id]);

  if (cards.error) return <Banner tone="danger" title="The cards could not be loaded">{cards.error}</Banner>;
  if (!cards.value || !lesson.value) return <Skeleton className="h-56 w-full max-w-130" />;
  if (lesson.value.status === "generating") return <NotReadyNotice id={id} />;
  if (cards.value.length === 0) return <Setup lessonId={id} />;

  const list = cards.value;
  const count = (state: Card["state"]) => list.filter((c) => c.state === state).length;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{count("new")} new</Badge>
          <Badge tone="warning">{count("learning")} learning</Badge>
          <Badge tone="success">{count("known")} known</Badge>
        </div>
        <Progress value={count("known")} max={list.length} label="Cards known" />
      </div>

      <Study cards={list} />

      <section aria-label="All cards" className="max-w-(--l-read)">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg">All {list.length} cards</h2>
          <Button variant="ghost" size="sm" onClick={() => setRemake((r) => !r)}>
            {remake ? "Keep this deck" : "Make a new deck"}
          </Button>
        </div>
        {remake ? (
          <div className="mt-4 rounded-lg border border-border bg-surface p-6">
            <Setup lessonId={id} replace />
          </div>
        ) : null}
        <ul className="mt-2">
          {list.map((c) => (
            <li key={c.id} className="grid gap-1 border-b border-border py-3 sm:grid-cols-[1fr_2fr] sm:gap-6">
              <span className="font-serif font-semibold break-words">{c.front}</span>
              <span className="text-muted">{c.back}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

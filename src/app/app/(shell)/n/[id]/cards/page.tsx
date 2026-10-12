"use client";

import { PartyPopper } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NotReadyNotice, useLessonId } from "@/components/lesson-frame";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Flashcard, GradeButtons } from "@/components/ui/study";
import { Banner, Skeleton } from "@/components/ui/surface";
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
        } catch (e) {
          setError(e instanceof Error && e.message ? e.message : "The cards could not be made. Try again.");
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
              "transition duration-[var(--m-fast)] ease-out active:scale-[0.98]",
              count === s.count
                ? "border-accent bg-accent-soft text-accent-text shadow-[0_0_0_1px_var(--c-accent)]"
                : "border-border-input bg-surface hover:border-accent",
            )}
          >
            <span className="text-xl">{s.count}</span>
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
      if (e.ctrlKey || e.metaKey || e.altKey) return;
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
      <div className="anim-pop mx-auto flex w-full max-w-130 flex-col items-center gap-3 rounded-lg border border-success/40 bg-success-soft px-6 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-pill bg-success text-surface">
          <PartyPopper className="size-6" aria-hidden />
        </span>
        <h2 className="text-lg">Every card is marked as known</h2>
        <p className="text-sm">Nothing left to review in this deck. Make a new deck below to keep going.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-130 flex-col gap-4">
      <div key={card.id} className="anim-pop">
        <Flashcard front={card.front} back={card.back} />
      </div>
      <GradeButtons onGrade={grade} />
      <p className="text-center text-sm text-muted">{queue.length} left to learn</p>
    </div>
  );
}

/** One bar split by how well each card is known. */
function DeckBar({ cards }: { cards: Card[] }) {
  const count = (state: Card["state"]) => cards.filter((c) => c.state === state).length;
  const parts = [
    { label: "known", n: count("known"), bar: "bg-success", dot: "bg-success" },
    { label: "learning", n: count("learning"), bar: "bg-warning", dot: "bg-warning" },
    { label: "new", n: count("new"), bar: "bg-border-input", dot: "bg-border-input" },
  ];
  return (
    <div className="mx-auto flex w-full max-w-130 flex-col gap-2">
      <div
        role="img"
        aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}
        className="flex h-2 gap-0.5 overflow-hidden rounded-pill bg-sunken"
      >
        {parts.map((p) =>
          p.n > 0 ? (
            <span
              key={p.label}
              className={cn("rounded-pill transition-[flex-grow] duration-[var(--m-slow)] ease-out", p.bar)}
              style={{ flexGrow: p.n }}
            />
          ) : null,
        )}
      </div>
      <div className="flex justify-between text-xs font-medium text-muted">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2 rounded-pill", p.dot)} />
            {p.n} {p.label}
          </span>
        ))}
      </div>
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
  if (!cards.value || !lesson.value) return <Skeleton className="mx-auto h-64 w-full max-w-130" />;
  if (lesson.value.status === "generating") return <NotReadyNotice id={id} />;
  if (cards.value.length === 0) return <Setup lessonId={id} />;

  const list = cards.value;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <DeckBar cards={list} />
        <Study cards={list} />
      </div>

      <section aria-label="All cards" className="mx-auto w-full max-w-(--l-read)">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg">All {list.length} cards</h2>
          <Button variant="ghost" size="sm" onClick={() => setRemake((r) => !r)}>
            {remake ? "Keep this deck" : "Make a new deck"}
          </Button>
        </div>
        {remake ? (
          <div className="anim-rise mt-4 rounded-lg border border-border bg-surface p-6">
            <Setup lessonId={id} replace />
          </div>
        ) : null}
        <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
          {list.map((c) => (
            <li
              key={c.id}
              className="grid gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_2fr] sm:gap-6"
            >
              <span className="flex items-start gap-2 font-semibold break-words">
                <span
                  aria-hidden
                  className={cn(
                    "mt-2 size-2 shrink-0 rounded-pill",
                    c.state === "known" ? "bg-success" : c.state === "learning" ? "bg-warning" : "bg-border-input",
                  )}
                />
                {c.front}
              </span>
              <span className="text-muted">{c.back}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

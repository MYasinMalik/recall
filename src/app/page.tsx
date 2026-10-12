import { ArrowRight, BookOpen, Check, Layers, ListChecks, MessageSquare } from "lucide-react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { currentUser } from "@/server/auth";

const features = [
  {
    icon: BookOpen,
    title: "Notes you can read straight away",
    body: "Drop in a lecture PDF, paste text, or type a topic. Notes appear as they are written, with math, tables and code set properly.",
  },
  {
    icon: ListChecks,
    title: "A lesson that checks you",
    body: "The same material as short sections with questions in between, so you find the gaps before the exam does.",
  },
  {
    icon: Layers,
    title: "Cards and quizzes on demand",
    body: "Make a deck of ten or fifty. Mark each card as known or still learning and the deck shrinks as you go.",
  },
  {
    icon: MessageSquare,
    title: "A tutor that stays on topic",
    body: "Ask about the notes or the original source. Answers are based on that lesson only.",
  },
];

const steps = [
  { title: "Add your material", body: "A PDF, pasted text, or just a topic." },
  { title: "Read the notes", body: "They start appearing within seconds." },
  { title: "Practise until it sticks", body: "Guided lesson, flashcards and a quiz." },
];

/** A small picture of the product, drawn with the same pieces the app uses. Decorative. */
function Preview() {
  return (
    <div aria-hidden className="relative mx-auto h-90 w-full max-w-110 select-none">
      <div className="absolute top-0 left-0 w-[78%] rounded-lg border border-border bg-surface p-5 shadow-lift">
        <p className="eyebrow">Notes</p>
        <p className="mt-2 text-lg">Hash tables</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          A <span className="bg-mark font-semibold text-text">hash function</span> turns a key into an array
          index, so lookups take constant time on average.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <span className="h-2 w-full rounded-pill bg-sunken" />
          <span className="h-2 w-4/5 rounded-pill bg-sunken" />
        </div>
      </div>
      <div className="anim-float absolute top-36 right-0 w-[62%] rounded-lg border border-accent bg-surface p-5 shadow-pop">
        <p className="eyebrow text-accent-text">Flashcard</p>
        <p className="mt-6 mb-6 text-center text-base font-bold">What happens when two keys collide?</p>
      </div>
      <div className="anim-float absolute bottom-0 left-4 flex w-[64%] items-center gap-3 rounded-md border border-success bg-success-soft px-4 py-3 shadow-lift" style={{ animationDelay: "-3s" }}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-success text-surface">
          <Check className="size-4" />
        </span>
        <span className="text-sm font-semibold">They share a bucket</span>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  if (await currentUser()) redirect("/app");
  return (
    <main className="mx-auto max-w-(--l-workspace) px-4 md:px-8">
      <header className="flex h-16 items-center justify-between">
        <Logo />
        <ButtonLink href="/signin" variant="ghost" size="sm">
          Sign in
        </ButtonLink>
      </header>

      <section className="grid items-center gap-12 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="stagger">
          <p className="inline-flex h-7 items-center rounded-pill bg-accent-soft px-3 text-xs font-semibold text-accent-text">
            Open source · runs on your computer · free
          </p>
          <h1 className="mt-5 text-display text-balance md:text-[3.5rem] md:leading-[1.05]">
            Turn a lecture into something you can study from.
          </h1>
          <p className="mt-5 max-w-[46ch] text-read text-muted">
            Recall writes notes, a guided lesson, flashcards and quizzes from your own material, using the
            ChatGPT plan you already have.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signin" variant="primary" size="lg">
              Get started <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
        <div className="anim-rise" style={{ animationDelay: "160ms" }}>
          <Preview />
        </div>
      </section>

      <section aria-label="How it works" className="grid gap-4 border-t border-border py-10 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-accent text-sm font-bold text-on-accent">
              {i + 1}
            </span>
            <div>
              <h2 className="text-base font-bold">{s.title}</h2>
              <p className="text-sm text-muted">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section aria-label="What it does" className="grid gap-4 pb-16 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-lg border border-border bg-surface p-6 shadow-card transition duration-[var(--m-base)] ease-out hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent-text">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg">{title}</h2>
            <p className="mt-1 text-muted">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-sm text-muted">
        A personal, non-commercial project. Not affiliated with OpenAI or any study app.
      </footer>
    </main>
  );
}

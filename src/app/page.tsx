import { BookOpen, Layers, ListChecks, MessageSquare } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

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

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-(--l-workspace) px-4 md:px-8">
      <header className="flex h-(--l-header) items-center justify-between">
        <span className="font-serif text-lg font-semibold">Recall</span>
        <ButtonLink href="/signin" variant="ghost" size="sm">
          Sign in
        </ButtonLink>
      </header>

      <section className="max-w-(--l-read) py-16 md:py-24">
        <p className="eyebrow">Open source · runs on your computer · free</p>
        <h1 className="mt-3 text-display">Turn a lecture into something you can study from.</h1>
        <p className="mt-4 text-read text-muted">
          Recall writes notes, a guided lesson, flashcards and quizzes from your own material, using the
          ChatGPT plan you already have.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/signin" variant="primary" size="lg">
            Get started
          </ButtonLink>
        </div>
      </section>

      <section aria-label="What it does" className="grid gap-x-12 border-t border-border py-12 md:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 py-6">
            <Icon className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
            <div>
              <h2 className="text-lg">{title}</h2>
              <p className="mt-1 text-muted">{body}</p>
            </div>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-sm text-muted">
        A personal, non-commercial project. Not affiliated with OpenAI or any study app.
      </footer>
    </main>
  );
}

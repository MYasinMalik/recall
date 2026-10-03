import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button, IconButton, Kbd } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Dialog, Tabs } from "@/components/ui/overlay";
import { ChatMessage, Composer, Dropzone, Flashcard, GradeButtons } from "@/components/ui/study";
import { Badge, Banner, Card, EmptyState, Progress, Skeleton } from "@/components/ui/surface";
import { QuestionDemo, ThemeToggle, ToastDemo } from "./demos";

export const metadata = { title: "Design system · Recall" };

const swatches = [
  "bg", "surface", "sunken", "border", "border-input", "text", "text-muted", "accent",
  "accent-soft", "mark", "success", "success-soft", "warning", "warning-soft", "danger", "danger-soft",
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border py-10">
      <p className="eyebrow">{title}</p>
      <div className="mt-4 flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export default function DesignPage() {
  return (
    <main className="mx-auto max-w-[900px] px-4 pb-24">
      <header className="flex flex-wrap items-end justify-between gap-4 py-10">
        <div>
          <p className="eyebrow">Recall</p>
          <h1 className="mt-1 text-display">Design system</h1>
          <p className="mt-2 max-w-[56ch] text-muted">
            Paper and ink. Serif headings, hairline borders, one green accent. Every primitive the
            screens are built from, in every state.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Colour roles">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map((name) => (
            <div key={name} className="overflow-hidden rounded-md border border-border">
              <div className="h-12" style={{ background: `var(--c-${name})` }} />
              <p className="bg-surface px-2 py-1 font-mono text-xs text-muted">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-3">
          <p className="font-serif text-display">Display 40 · Lesson titles</p>
          <p className="font-serif text-xl">Heading 28 · Section titles</p>
          <p className="font-serif text-lg">Subheading 20 · Card titles</p>
          <p className="max-w-[60ch] text-read">
            Reading 18. A function assigns every input exactly one output. Lesson text is set at
            this size on a 680px column so a paragraph reads like a page, not a dashboard.
          </p>
          <p className="text-base">Body 16 · Interface text and answers.</p>
          <p className="text-sm text-muted">Small 14 · Hints and secondary detail.</p>
          <p className="eyebrow">Eyebrow 11 · Labels and section markers</p>
        </div>
      </Section>

      <Section title="Buttons">
        <Row>
          <Button variant="primary">Generate lesson</Button>
          <Button>Export</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden />}>
            Delete
          </Button>
        </Row>
        <Row>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">
            Continue <Kbd>Enter</Kbd>
          </Button>
        </Row>
        <Row>
          <Button variant="primary" loading>Generating</Button>
          <Button disabled>Disabled</Button>
          <IconButton label="New folder">
            <Plus className="size-5" aria-hidden />
          </IconButton>
        </Row>
      </Section>

      <Section title="Fields">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Lesson title" defaultValue="Functions: relations to bijections" />
          <Input label="Link" placeholder="https://" hint="A video or article link." />
          <Input label="Folder name" defaultValue="" error="Give the folder a name." />
          <Input label="Model" defaultValue="Chosen from your plan" disabled />
        </div>
        <Textarea
          label="Focus (optional)"
          placeholder="What should the lesson concentrate on?"
          hint="Leave blank to cover the whole source."
        />
        <Dropzone />
      </Section>

      <Section title="Badges, progress, loading">
        <Row>
          <Badge>12 new</Badge>
          <Badge tone="warning">5 learning</Badge>
          <Badge tone="success">3 known</Badge>
          <Badge tone="accent">Injections</Badge>
          <Badge tone="danger">Failed</Badge>
        </Row>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm text-muted">
            <span>Section 3 of 11</span>
            <span className="font-mono">27%</span>
          </div>
          <Progress value={27} label="Lesson progress" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </Section>

      <Section title="Banners">
        <Banner tone="info" title="Notes are being written">
          You can start reading. Sections appear as they are ready.
        </Banner>
        <Banner tone="success" title="Section complete">
          4 of 5 answered correctly.
        </Banner>
        <Banner
          tone="warning"
          title="Your ChatGPT plan limit was reached"
          action={<Button size="sm">Retry</Button>}
        >
          Generation is paused. What was written so far is saved.
        </Banner>
        <Banner tone="danger" title="This PDF has no readable text">
          It looks scanned. Paste the text instead.
        </Banner>
      </Section>

      <Section title="Lesson tabs">
        <Tabs
          tabs={[
            { value: "lesson", label: "Lesson", content: <p className="text-muted">Guided sections.</p> },
            { value: "notes", label: "Notes", content: <p className="text-muted">Editable notes.</p> },
            { value: "cards", label: "Cards", pending: true, content: <p className="text-muted">Not generated yet.</p> },
            { value: "quiz", label: "Quiz", pending: true, content: <p className="text-muted">Not generated yet.</p> },
            { value: "source", label: "Source", content: <p className="text-muted">The original file.</p> },
          ]}
        />
      </Section>

      <Section title="Question">
        <Card className="p-6">
          <QuestionDemo />
        </Card>
      </Section>

      <Section title="Flashcard">
        <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
          <Flashcard
            front="Injection"
            back="A function where different inputs always give different outputs."
          />
          <GradeButtons />
        </div>
      </Section>

      <Section title="Chat">
        <Card className="flex flex-col gap-5 p-6">
          <ChatMessage role="user">Why can two inputs share an output?</ChatMessage>
          <ChatMessage role="assistant" streaming>
            A function only promises one output per input. Nothing stops two inputs landing on the
            same output; squaring sends both 2 and −2 to 4
          </ChatMessage>
          <Composer />
        </Card>
      </Section>

      <Section title="Dialog, toast, empty state">
        <Row>
          <Dialog
            trigger={<Button variant="danger">Delete lesson</Button>}
            title="Delete this lesson?"
            description="Its notes, cards, quiz and source file are removed from this computer. This cannot be undone."
            footer={
              <>
                <Button variant="ghost">Keep it</Button>
                <Button variant="danger">Delete</Button>
              </>
            }
          />
          <ToastDemo />
        </Row>
        <EmptyState
          title="No lessons yet"
          action={<Button variant="primary">New lesson</Button>}
        >
          Add a PDF, paste some text, or type a topic. Notes start appearing within a few seconds.
        </EmptyState>
      </Section>
    </main>
  );
}

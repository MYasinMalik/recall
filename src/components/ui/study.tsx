"use client";

import { ArrowUp, Check, FileUp, RotateCcw, X } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button, IconButton, Kbd } from "./button";
import { StreamCaret } from "./surface";

/* ---------------------------------------------------------------- answer option */

export type ChoiceState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

const choiceStyles: Record<ChoiceState, string> = {
  idle: "border-border-input bg-surface hover:border-text",
  selected: "border-accent bg-accent-soft",
  correct: "border-success bg-success-soft",
  wrong: "border-danger bg-danger-soft",
  dimmed: "border-border bg-surface opacity-60",
};

/** One option in a quiz or lesson question. The letter doubles as its keyboard shortcut. */
export function ChoiceOption({
  letter,
  state = "idle",
  disabled,
  onSelect,
  children,
}: {
  letter: string;
  state?: ChoiceState;
  disabled?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={state === "selected" || state === "correct" || state === "wrong"}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-base",
        "transition-colors duration-[var(--m-fast)] disabled:cursor-default",
        choiceStyles[state],
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm border font-mono text-xs",
          state === "correct" && "border-success text-success",
          state === "wrong" && "border-danger text-danger",
          state === "selected" && "border-accent text-accent-text",
          (state === "idle" || state === "dimmed") && "border-border-input text-muted",
        )}
      >
        {state === "correct" ? <Check className="size-3.5" /> : state === "wrong" ? <X className="size-3.5" /> : letter}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {state === "correct" ? <span className="sr-only">Correct answer</span> : null}
      {state === "wrong" ? <span className="sr-only">Your answer, incorrect</span> : null}
    </button>
  );
}

/* ---------------------------------------------------------------- flashcard */

/** An index card. Click or press Space to turn it over. */
export function Flashcard({ front, back }: { front: ReactNode; back: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      data-flashcard
      aria-pressed={flipped}
      aria-label={flipped ? "Showing answer. Turn card over" : "Showing prompt. Turn card over"}
      onClick={() => setFlipped((f) => !f)}
      className={cn(
        "relative flex min-h-56 w-full flex-col rounded-lg border border-border bg-surface text-left shadow-card",
        "transition-colors duration-[var(--m-fast)] hover:border-border-input",
      )}
    >
      <span className="flex items-center justify-between border-b border-border px-5 py-2">
        <span className="eyebrow">{flipped ? "Answer" : "Prompt"}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <RotateCcw className="size-3.5" aria-hidden /> Turn over <Kbd>Space</Kbd>
        </span>
      </span>
      <span
        className={cn(
          "flex flex-1 items-center px-5 py-6",
          flipped ? "text-read" : "font-serif text-xl",
        )}
      >
        {flipped ? back : front}
      </span>
    </button>
  );
}

export function GradeButtons({ onGrade }: { onGrade?: (knew: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="danger" size="lg" onClick={() => onGrade?.(false)} icon={<X className="size-4" aria-hidden />}>
        Still learning <Kbd>1</Kbd>
      </Button>
      <Button
        variant="secondary"
        size="lg"
        className="border-success text-success hover:bg-success-soft"
        onClick={() => onGrade?.(true)}
        icon={<Check className="size-4" aria-hidden />}
      >
        Got it <Kbd>2</Kbd>
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------- chat */

export function ChatMessage({
  role,
  streaming,
  children,
}: {
  role: "user" | "assistant";
  streaming?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", role === "user" && "items-end")}>
      <span className="eyebrow">{role === "user" ? "You" : "Tutor"}</span>
      <div
        className={cn(
          "max-w-[62ch] text-base leading-6",
          role === "user"
            ? "rounded-md bg-sunken px-3 py-2"
            : "border-l-2 border-accent pl-3",
        )}
        aria-live={streaming ? "polite" : undefined}
      >
        {children}
        {streaming ? <StreamCaret /> : null}
      </div>
    </div>
  );
}

export function Composer({
  placeholder = "Ask about this lesson",
  disabled,
  onSend,
}: {
  placeholder?: string;
  disabled?: boolean;
  onSend?: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const id = useId();
  const send = () => {
    const value = text.trim();
    if (!value) return;
    onSend?.(value);
    setText("");
  };
  return (
    <form
      className="flex items-end gap-2 rounded-md border border-border-input bg-surface p-2 focus-within:border-accent"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Message
      </label>
      <textarea
        id={id}
        rows={1}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        className="max-h-40 min-h-8 flex-1 resize-none bg-transparent px-2 py-1 text-base outline-none placeholder:text-muted"
      />
      <IconButton
        type="submit"
        label="Send"
        disabled={disabled || !text.trim()}
        className="size-8 bg-accent text-on-accent hover:bg-accent hover:text-on-accent hover:brightness-110"
      >
        <ArrowUp className="size-4" aria-hidden />
      </IconButton>
    </form>
  );
}

/* ---------------------------------------------------------------- dropzone */

export function Dropzone({
  accept = ".pdf",
  hint = "PDF up to 50 MB",
  error,
  onFile,
}: {
  accept?: string;
  hint?: string;
  error?: string;
  onFile?: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile?.(file);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center",
          "transition-colors duration-[var(--m-fast)]",
          over ? "border-accent bg-accent-soft" : "border-border-input bg-surface hover:bg-sunken",
          error && "border-danger",
        )}
      >
        <FileUp className="size-6 text-muted" aria-hidden />
        <span className="text-base font-medium">Drop a file here, or choose one</span>
        <span className="text-sm text-muted">{hint}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile?.(file);
        }}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

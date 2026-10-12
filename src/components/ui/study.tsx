"use client";

import { ArrowUp, Check, FileUp, RotateCcw, X } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button, IconButton, Kbd } from "./button";
import { StreamCaret } from "./surface";

/* ---------------------------------------------------------------- answer option */

export type ChoiceState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

const choiceStyles: Record<ChoiceState, string> = {
  idle: "border-border-input bg-surface hover:border-accent hover:bg-accent-soft/40",
  selected: "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--c-accent)]",
  correct: "anim-bump border-success bg-success-soft shadow-[0_0_0_1px_var(--c-success)]",
  wrong: "anim-shake border-danger bg-danger-soft shadow-[0_0_0_1px_var(--c-danger)]",
  dimmed: "border-border bg-surface opacity-55",
};

/** One option in a quiz or lesson question. The number doubles as its keyboard shortcut. */
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
        "flex min-h-13 w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-base",
        "transition duration-[var(--m-fast)] ease-out enabled:active:scale-[0.99] disabled:cursor-default",
        choiceStyles[state],
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-medium",
          "transition-colors duration-[var(--m-fast)]",
          state === "correct" && "bg-success text-surface",
          state === "wrong" && "bg-danger text-surface",
          state === "selected" && "bg-accent text-on-accent",
          (state === "idle" || state === "dimmed") && "bg-sunken text-muted",
        )}
      >
        {state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : letter}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {state === "correct" ? <span className="sr-only">Correct answer</span> : null}
      {state === "wrong" ? <span className="sr-only">Your answer, incorrect</span> : null}
    </button>
  );
}

/* ---------------------------------------------------------------- flashcard */

function CardFace({ label, hidden, back, children }: { label: string; hidden: boolean; back?: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden={hidden}
      className={cn(
        "col-start-1 row-start-1 flex min-h-64 flex-col rounded-lg border bg-surface shadow-lift [backface-visibility:hidden]",
        back ? "border-accent [transform:rotateY(180deg)]" : "border-border",
      )}
    >
      <span className="flex items-center justify-between px-5 pt-4">
        <span className={cn("eyebrow", back && "text-accent-text")}>{label}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <RotateCcw className="size-3.5" aria-hidden /> Flip <Kbd>Space</Kbd>
        </span>
      </span>
      <span
        className={cn(
          "flex flex-1 items-center justify-center px-6 py-8 text-center",
          back ? "text-read" : "text-xl font-bold tracking-tight",
        )}
      >
        {children}
      </span>
    </span>
  );
}

/** An index card that turns over in place. Click or press Space. */
export function Flashcard({ front, back }: { front: ReactNode; back: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      data-flashcard
      aria-pressed={flipped}
      aria-label={flipped ? "Showing answer. Turn card over" : "Showing prompt. Turn card over"}
      onClick={() => setFlipped((f) => !f)}
      className="block w-full rounded-lg text-left [perspective:1400px]"
    >
      <span
        className={cn(
          "grid transition-transform duration-[520ms] ease-spring [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        <CardFace label="Prompt" hidden={flipped}>
          {front}
        </CardFace>
        <CardFace label="Answer" hidden={!flipped} back>
          {back}
        </CardFace>
      </span>
    </button>
  );
}

export function GradeButtons({ onGrade }: { onGrade?: (knew: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        size="lg"
        className="border-danger/50 text-danger hover:bg-danger-soft"
        onClick={() => onGrade?.(false)}
        icon={<X className="size-4" aria-hidden />}
      >
        Still learning <Kbd>1</Kbd>
      </Button>
      <Button
        size="lg"
        className="border-success/50 text-success hover:bg-success-soft"
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
    <div className={cn("anim-rise flex flex-col gap-1", role === "user" && "items-end")}>
      <span className="sr-only">{role === "user" ? "You" : "Tutor"}</span>
      <div
        className={cn(
          "max-w-[62ch] text-base leading-6",
          role === "user"
            ? "rounded-lg rounded-br-sm bg-accent px-3.5 py-2 text-on-accent"
            : "rounded-lg rounded-bl-sm bg-sunken px-3.5 py-2.5",
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
      className={cn(
        "flex items-end gap-2 rounded-md border border-border-input bg-surface p-1.5",
        "transition-[border-color,box-shadow] duration-[var(--m-fast)]",
        "focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--c-accent-soft)]",
      )}
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
        className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted"
      />
      <IconButton
        type="submit"
        label="Send"
        disabled={disabled || !text.trim()}
        className="size-9 bg-accent text-on-accent hover:bg-accent hover:text-on-accent hover:brightness-110"
      >
        <ArrowUp className="size-4" aria-hidden />
      </IconButton>
    </form>
  );
}

/* ---------------------------------------------------------------- dropzone */

export function Dropzone({
  accept = ".pdf,.pptx",
  hint = "PDF or PowerPoint (.pptx), up to 50 MB",
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
          e.stopPropagation();
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile?.(file);
        }}
        className={cn(
          "group flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center",
          "transition duration-[var(--m-base)] ease-out",
          over
            ? "scale-[1.01] border-accent bg-accent-soft"
            : "border-border-input bg-surface hover:border-accent hover:bg-accent-soft/40",
          error && "border-danger",
        )}
      >
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-pill bg-accent-soft text-accent-text",
            "transition-transform duration-[var(--m-base)] ease-spring group-hover:-translate-y-1",
            over && "-translate-y-1",
          )}
        >
          <FileUp className="size-6" aria-hidden />
        </span>
        <span className="text-base font-semibold">{over ? "Drop it here" : "Drop a file here, or choose one"}</span>
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

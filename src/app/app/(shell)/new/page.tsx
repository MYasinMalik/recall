"use client";

import { ChevronDown, FileText, Lightbulb, Type, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, IconButton, Kbd } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Dropzone } from "@/components/ui/study";
import { Banner } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data, type SourceKind } from "@/lib/data";
import { useData } from "@/lib/use-data";

const kinds: { kind: SourceKind; label: string; detail: string; icon: typeof FileText }[] = [
  { kind: "file", label: "PDF", detail: "Slides or a handout", icon: FileText },
  { kind: "text", label: "Text", detail: "Paste your notes", icon: Type },
  { kind: "topic", label: "Topic", detail: "Start from a title", icon: Lightbulb },
];

const MAX_BYTES = 50 * 1024 * 1024;

export default function NewLessonPage() {
  const router = useRouter();
  const folders = useData(() => data.listFolders(), []);
  const [kind, setKind] = useState<SourceKind>("file");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [focus, setFocus] = useState("");
  const [folderId, setFolderId] = useState("");
  const [options, setOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = kind === "file" ? (file?.name ?? "") : kind === "text" ? text : topic;
  const ready = value.trim().length > 0;

  const pickFile = (f: File) => {
    setKind("file");
    if (!/\.pdf$/i.test(f.name)) {
      setFile(null);
      setFileError("Only PDF files are supported for now.");
    } else if (f.size > MAX_BYTES) {
      setFile(null);
      setFileError("That file is over 50 MB. Split it or paste the text instead.");
    } else {
      setFile(f);
      setFileError(undefined);
    }
  };

  const create = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const lesson = await data.createLesson({ kind, value, folderId: folderId || null, focus, file: file ?? undefined });
      router.push(`/app/n/${lesson.id}/notes`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The lesson could not be created. Try again.");
      setBusy(false);
    }
  };

  // Ctrl Enter creates the lesson from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void create();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className="anim-rise mx-auto max-w-(--l-read) px-4 py-8 md:py-10"
      // A PDF dropped anywhere on the page is picked up, whichever source type is showing.
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const dropped = e.dataTransfer.files[0];
        if (dropped) pickFile(dropped);
      }}
    >
      <p className="eyebrow">New lesson</p>
      <h1 className="mt-1 text-xl">What are you studying?</h1>

      <form
        className="mt-6 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <div role="radiogroup" aria-label="Source type" className="grid grid-cols-3 gap-2">
          {kinds.map(({ kind: k, label, detail, icon: Icon }) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-md border p-3 text-left",
                "transition duration-[var(--m-fast)] ease-out active:scale-[0.98]",
                kind === k
                  ? "border-accent bg-accent-soft text-accent-text shadow-[0_0_0_1px_var(--c-accent)]"
                  : "border-border-input bg-surface hover:border-accent",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-sm font-bold">{label}</span>
              <span className={cn("hidden text-xs sm:block", kind !== k && "text-muted")}>{detail}</span>
            </button>
          ))}
        </div>

        <div key={kind} className="anim-fade">
          {kind === "file" ? (
            file ? (
              <div className="anim-pop flex items-center gap-3 rounded-md border border-accent bg-accent-soft px-4 py-3">
                <FileText className="size-5 shrink-0 text-accent-text" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{file.name}</p>
                  <p className="text-xs text-accent-text">{(file.size / 1024 / 1024).toFixed(1)} MB · ready</p>
                </div>
                <IconButton label="Remove file" onClick={() => setFile(null)}>
                  <X className="size-5" aria-hidden />
                </IconButton>
              </div>
            ) : (
              <Dropzone onFile={pickFile} error={fileError} />
            )
          ) : null}
          {kind === "text" ? (
            <Textarea
              label="Text"
              rows={10}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste lecture notes, a transcript, or an article."
              hint={`${text.trim() ? text.trim().split(/\s+/).length : 0} words`}
            />
          ) : null}
          {kind === "topic" ? (
            <Input
              label="Topic"
              autoFocus
              value={topic}
              maxLength={200}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="How vaccines train the immune system"
              hint="A few words are enough. The lesson is written from scratch."
            />
          ) : null}
        </div>

        <div>
          <button
            type="button"
            aria-expanded={options}
            onClick={() => setOptions((o) => !o)}
            className="-ml-2 flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-muted transition-colors duration-[var(--m-fast)] hover:bg-sunken hover:text-text"
          >
            <ChevronDown
              className={cn("size-4 transition-transform duration-[var(--m-base)] ease-out", options && "rotate-180")}
              aria-hidden
            />
            Focus and folder
            {focus.trim() || folderId ? <span className="size-1.5 rounded-pill bg-accent" aria-label="set" /> : null}
          </button>
          {options ? (
            <div className="anim-rise mt-3 flex flex-col gap-4">
              <Textarea
                label="Focus (optional)"
                rows={2}
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="For example: only chapters 2 and 3, exam-style questions"
              />
              <Select label="Folder" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                <option value="">No folder</option>
                {folders.value?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        {error ? <Banner tone="danger" title={error} /> : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="lg" disabled={!ready} loading={busy}>
            {busy ? "Reading your source" : "Create lesson"}
          </Button>
          <span className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
          </span>
        </div>
      </form>
    </div>
  );
}

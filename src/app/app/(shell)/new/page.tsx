"use client";

import { FileText, Lightbulb, Link2, Type, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Dropzone } from "@/components/ui/study";
import { Banner } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data, type SourceKind } from "@/lib/data";
import { useData } from "@/lib/use-data";

const kinds: { kind: SourceKind; label: string; icon: typeof FileText }[] = [
  { kind: "file", label: "File", icon: FileText },
  { kind: "text", label: "Text", icon: Type },
  { kind: "link", label: "Link", icon: Link2 },
  { kind: "topic", label: "Topic", icon: Lightbulb },
];

const MAX_BYTES = 50 * 1024 * 1024;

export default function NewLessonPage() {
  const router = useRouter();
  const folders = useData(() => data.listFolders(), []);
  const [kind, setKind] = useState<SourceKind>("file");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [topic, setTopic] = useState("");
  const [focus, setFocus] = useState("");
  const [folderId, setFolderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = kind === "file" ? (file?.name ?? "") : kind === "text" ? text : kind === "link" ? link : topic;
  const linkInvalid = kind === "link" && link.length > 0 && !/^https?:\/\/\S+\.\S+/.test(link);
  const ready = value.trim().length > 0 && !linkInvalid;

  const pickFile = (f: File) => {
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

  return (
    <div className="mx-auto max-w-(--l-read) px-4 py-8 md:py-12">
      <p className="eyebrow">New lesson</p>
      <h1 className="mt-1 text-xl">What are you studying?</h1>

      <form
        className="mt-6 flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <div role="radiogroup" aria-label="Source type" className="grid grid-cols-4 gap-2">
          {kinds.map(({ kind: k, label, icon: Icon }) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 rounded-md border text-sm",
                "transition-colors duration-[var(--m-fast)]",
                kind === k
                  ? "border-accent bg-accent-soft font-medium text-accent-text"
                  : "border-border-input bg-surface hover:bg-sunken",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {kind === "file" ? (
          file ? (
            <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
              <FileText className="size-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{file.name}</p>
                <p className="font-mono text-xs text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste lecture notes, a transcript, or an article."
            hint={`${text.trim() ? text.trim().split(/\s+/).length : 0} words`}
          />
        ) : null}
        {kind === "link" ? (
          <Input
            label="Link"
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://"
            error={linkInvalid ? "Enter a full address starting with https://" : undefined}
            hint="A video with captions or an article. If it cannot be read, paste the text instead."
          />
        ) : null}
        {kind === "topic" ? (
          <Input
            label="Topic"
            value={topic}
            maxLength={200}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="How vaccines train the immune system"
            hint="A few words are enough. The lesson is written from scratch."
          />
        ) : null}

        <Textarea
          label="Focus (optional)"
          rows={2}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="For example: only chapters 2 and 3, exam-style questions"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="folder" className="text-sm font-medium">
            Folder
          </label>
          <select
            id="folder"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="h-10 rounded-md border border-border-input bg-surface px-3 text-base"
          >
            <option value="">No folder</option>
            {folders.value?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {error ? <Banner tone="danger" title={error} /> : null}

        <div>
          <Button type="submit" variant="primary" size="lg" disabled={!ready} loading={busy}>
            Create lesson
          </Button>
        </div>
      </form>
    </div>
  );
}

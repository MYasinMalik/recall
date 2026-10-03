"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/surface";
import { setUsingSamples } from "@/lib/data";

export function SignInPanel({ error }: { error?: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-(--l-read) flex-col justify-center gap-6 px-4 py-12">
      <Link href="/" className="font-serif text-lg font-semibold">
        Recall
      </Link>
      <h1 className="text-display">Sign in to write your own lessons</h1>
      <p className="text-read text-muted">
        Recall runs on your computer and uses your ChatGPT plan to write notes, lessons, cards and
        quizzes. Nothing is billed by this app, and your files stay on this machine.
      </p>
      {error ? <Banner tone="danger" title={error} /> : null}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            setUsingSamples(false);
            window.location.assign("/auth/start");
          }}
        >
          Sign in with ChatGPT
        </Button>
        <Button
          size="lg"
          onClick={() => {
            setUsingSamples(true);
            window.location.assign("/app");
          }}
        >
          Use the sample lessons
        </Button>
      </div>
      <ul className="list-disc pl-6 text-sm text-muted">
        <li>Needs a ChatGPT Plus or Pro plan.</li>
        <li>Usage counts against your plan, the same as using ChatGPT itself.</li>
        <li>What you study is sent to OpenAI to write your lessons, and to nobody else.</li>
        <li>You can disconnect at any time from Settings.</li>
      </ul>
    </main>
  );
}

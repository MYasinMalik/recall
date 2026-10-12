"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/surface";
import { setUsingSamples } from "@/lib/data";

const facts = [
  "Needs a ChatGPT Plus or Pro plan.",
  "Usage counts against your plan, the same as using ChatGPT itself.",
  "What you study is sent to OpenAI to write your lessons, and to nobody else.",
  "You can disconnect at any time from Settings.",
];

export function SignInPanel({ error }: { error?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="anim-pop flex w-full max-w-md flex-col gap-6 rounded-lg border border-border bg-surface p-6 shadow-lift sm:p-8">
        <Link href="/" className="self-start rounded-md">
          <Logo />
        </Link>
        <div>
          <h1 className="text-xl">Sign in to write your own lessons</h1>
          <p className="mt-2 text-muted">
            Recall runs on your computer and uses your ChatGPT plan. Nothing is billed by this app, and your
            files stay on this machine.
          </p>
        </div>
        {error ? <Banner tone="danger" title={error} /> : null}
        <div className="flex flex-col gap-2">
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
        <ul className="flex flex-col gap-2 border-t border-border pt-5 text-sm text-muted">
          {facts.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

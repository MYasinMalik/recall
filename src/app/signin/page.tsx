import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Banner } from "@/components/ui/surface";

export const metadata = { title: "Sign in · Recall" };

export default function SignInPage() {
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
      <Banner tone="info" title="Sign-in is not connected in this build">
        The sample lessons work without it. Sign in with ChatGPT arrives with the backend.
      </Banner>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/app" variant="primary" size="lg">
          Open the sample library
        </ButtonLink>
      </div>
      <ul className="list-disc pl-6 text-sm text-muted">
        <li>Needs a ChatGPT Plus or Pro plan.</li>
        <li>Usage counts against your plan, the same as using ChatGPT itself.</li>
        <li>You can disconnect at any time from Settings.</li>
      </ul>
    </main>
  );
}

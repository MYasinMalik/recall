import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { SignInPanel } from "./panel";

export const metadata = { title: "Sign in · Recall" };

const messages: Record<string, string> = {
  access_denied: "Sign-in was cancelled. Nothing was connected.",
  state_mismatch: "That sign-in attempt expired. Start again.",
  nonce_mismatch: "That sign-in attempt could not be verified. Start again.",
  failed: "Sign-in did not complete. Try again.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  // Already signed in on this computer: go straight to the library.
  if (!error && (await currentUser())) redirect("/app");
  return <SignInPanel error={error ? (messages[error] ?? messages.failed) : undefined} />;
}

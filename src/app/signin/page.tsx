import { redirect } from "next/navigation";
import { currentUser, hasPlanUsage } from "@/server/auth";
import { SignInPanel } from "./panel";

export const metadata = { title: "Sign in · Recall" };

const messages: Record<string, string> = {
  access_denied: "Sign-in was cancelled. Nothing was connected.",
  state_mismatch: "That sign-in attempt expired. Start again.",
  nonce_mismatch: "That sign-in attempt could not be verified. Start again.",
  failed: "Sign-in did not complete. Try again.",
  reconnect: "Your ChatGPT connection has expired. Sign in again to reconnect; your lessons are still here.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = error ? null : await currentUser();
  // Signed in and still connected to ChatGPT: go straight to the library.
  if (user && hasPlanUsage(user.id)) redirect("/app");
  // Signed in but the ChatGPT connection is gone: stay here so it can be reconnected.
  const code = error ?? (user ? "reconnect" : undefined);
  return <SignInPanel error={code ? (messages[code] ?? messages.failed) : undefined} />;
}

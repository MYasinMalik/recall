import { cookies } from "next/headers";
import { SESSION_COOKIE, signOut } from "@/server/auth";
import { json, rejectForeignRequest } from "@/server/guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = rejectForeignRequest(request, true);
  if (blocked) return blocked;
  await signOut(false);
  (await cookies()).delete(SESSION_COOKIE);
  return json({ result: null });
}

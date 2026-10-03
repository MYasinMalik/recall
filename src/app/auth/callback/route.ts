import { cookies } from "next/headers";
import { AuthError, finishSignIn, SESSION_COOKIE, sessionCookieOptions } from "@/server/auth";
import { ORIGIN } from "@/server/env";
import { rejectForeignRequest } from "@/server/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = rejectForeignRequest(request, false);
  if (blocked) return blocked;
  try {
    const token = await finishSignIn(new URL(request.url).searchParams);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
    return Response.redirect(`${ORIGIN}/app`, 302);
  } catch (error) {
    const code = error instanceof AuthError ? error.code : "failed";
    console.error("sign-in failed:", code);
    return Response.redirect(`${ORIGIN}/signin?error=${encodeURIComponent(code)}`, 302);
  }
}

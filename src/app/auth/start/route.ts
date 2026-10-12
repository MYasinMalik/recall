import { beginSignIn } from "@/server/auth";
import { rejectForeignRequest } from "@/server/guard";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const blocked = rejectForeignRequest(request, false);
  if (blocked) return blocked;
  // ?switch=1 connects a different ChatGPT account from the one this install was first registered with.
  return Response.redirect(beginSignIn(new URL(request.url).searchParams.has("switch")), 302);
}

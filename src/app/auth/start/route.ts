import { beginSignIn } from "@/server/auth";
import { rejectForeignRequest } from "@/server/guard";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const blocked = rejectForeignRequest(request, false);
  if (blocked) return blocked;
  return Response.redirect(beginSignIn(), 302);
}

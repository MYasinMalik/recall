import { PORT } from "./env";

const HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

/**
 * The app only answers requests addressed to this machine and, for writes, sent by its own pages.
 * This stops other websites and DNS-rebinding pages from driving a local install.
 */
export function rejectForeignRequest(request: Request, write: boolean): Response | null {
  if (!HOSTS.has(request.headers.get("host") ?? "")) return new Response("Forbidden", { status: 403 });
  if (write) {
    const origin = request.headers.get("origin");
    let host = "";
    try {
      host = origin ? new URL(origin).host : "";
    } catch {
      host = "";
    }
    if (!HOSTS.has(host)) return new Response("Forbidden", { status: 403 });
  }
  return null;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

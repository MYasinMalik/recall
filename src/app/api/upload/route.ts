import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { currentUser } from "@/server/auth";
import { uid } from "@/server/db";
import { ensureDataDir, UPLOAD_DIR } from "@/server/env";
import { ExtractError, extractPdf, MAX_BYTES } from "@/server/extract";
import { startLessonGeneration } from "@/server/generate";
import { json, rejectForeignRequest } from "@/server/guard";
import * as repo from "@/server/repo";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Creates a lesson from an uploaded PDF. The file is stored under a generated name in the data directory. */
export async function POST(request: Request) {
  const blocked = rejectForeignRequest(request, true);
  if (blocked) return blocked;
  const user = await currentUser();
  if (!user) return json({ error: "Sign in to continue", code: "signed_out" }, 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "No file was sent" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "That file is over 50 MB." }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Trust the content, not the name: a PDF starts with %PDF-.
  if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== "%PDF-") {
    return json({ error: "Only PDF files are supported for now." }, 415);
  }

  try {
    // pdf.js takes ownership of the buffer it is given, so it gets a copy.
    const { pageCount, chunks } = await extractPdf(bytes.slice());
    ensureDataDir();
    const stored = `${uid()}.pdf`;
    writeFileSync(join(UPLOAD_DIR, stored), bytes, { mode: 0o600 });

    const folder = form?.get("folderId");
    const focus = form?.get("focus");
    const name = file.name.replace(/[\\/]/g, "").replace(/[^\x20-\x7e -￿]/g, "").slice(0, 200) || "document.pdf";
    const lessonId = repo.insertLesson(user.id, {
      kind: "file",
      title: name.replace(/\.pdf$/i, ""),
      folderId: typeof folder === "string" && UUID.test(folder) ? folder : null,
      focus: typeof focus === "string" ? focus : "",
      filename: name,
      filePath: stored,
      byteSize: file.size,
      pageCount,
      chunks,
    });
    startLessonGeneration(user.id, lessonId);
    return json({ result: repo.getLesson(user.id, lessonId) });
  } catch (error) {
    if (error instanceof ExtractError) return json({ error: error.message }, 422);
    console.error("upload failed:", error instanceof Error ? error.name : "error");
    return json({ error: "The file could not be processed." }, 500);
  }
}

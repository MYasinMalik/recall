// Reads text out of an uploaded PDF, page by page, and groups pages into chunks.
export const MAX_PAGES = 300;
export const MAX_BYTES = 50 * 1024 * 1024;

export interface Chunk {
  text: string;
  pageFrom?: number;
  pageTo?: number;
}

export class ExtractError extends Error {}

export async function extractPdf(data: Uint8Array): Promise<{ pageCount: number; chunks: Chunk[] }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  let doc;
  try {
    doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    throw new ExtractError(
      name === "PasswordException" ? "This PDF is password protected. Remove the password and try again." : "This file could not be read as a PDF.",
    );
  }
  if (doc.numPages > MAX_PAGES) throw new ExtractError(`This PDF has ${doc.numPages} pages. The limit is ${MAX_PAGES}.`);

  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
      .join("")
      .replace(/[ \t]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .trim();
    pages.push(text);
  }
  const pageCount = doc.numPages;
  await doc.loadingTask.destroy();

  const total = pages.reduce((sum, p) => sum + p.length, 0);
  if (total < 40 * Math.min(pageCount, 5)) {
    throw new ExtractError("No readable text was found in this PDF. It looks scanned; paste the text instead.");
  }
  return { pageCount: pages.length, chunks: chunkPages(pages) };
}

function chunkPages(pages: string[], target = 6000): Chunk[] {
  const chunks: Chunk[] = [];
  let text = "";
  let from = 1;
  pages.forEach((page, i) => {
    const n = i + 1;
    const piece = `[Page ${n}]\n${page}`;
    if (text && text.length + piece.length > target) {
      chunks.push({ text, pageFrom: from, pageTo: n - 1 });
      text = "";
      from = n;
    }
    text += (text ? "\n\n" : "") + piece;
  });
  if (text) chunks.push({ text, pageFrom: from, pageTo: pages.length });
  return chunks;
}

export function chunkText(text: string, target = 6000): Chunk[] {
  const chunks: Chunk[] = [];
  let current = "";
  for (const para of text.split(/\n{2,}/)) {
    if (current && current.length + para.length > target) {
      chunks.push({ text: current });
      current = "";
    }
    current += (current ? "\n\n" : "") + para;
    while (current.length > target * 2) {
      chunks.push({ text: current.slice(0, target) });
      current = current.slice(target);
    }
  }
  if (current.trim()) chunks.push({ text: current });
  return chunks;
}

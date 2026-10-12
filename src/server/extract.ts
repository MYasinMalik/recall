// Reads text out of an uploaded PDF or PowerPoint file, page by page, and groups pages into chunks.
import { inflateRawSync } from "node:zlib";

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

/* ---------------------------------------------------------------- PowerPoint */

const MAX_ENTRY_BYTES = 20 * 1024 * 1024;

/** A .pptx is a zip of XML files. This reads the zip's index and inflates only the entries asked for. */
function openZip(data: Uint8Array) {
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new ExtractError("This file could not be read as a PowerPoint file.");
  const entries = new Map<string, { method: number; size: number; offset: number }>();
  let at = buf.readUInt32LE(end + 16);
  for (let i = buf.readUInt16LE(end + 10); i > 0 && at + 46 <= buf.length && buf.readUInt32LE(at) === 0x02014b50; i--) {
    const nameLength = buf.readUInt16LE(at + 28);
    entries.set(buf.toString("utf8", at + 46, at + 46 + nameLength), {
      method: buf.readUInt16LE(at + 10),
      size: buf.readUInt32LE(at + 20),
      offset: buf.readUInt32LE(at + 42),
    });
    at += 46 + nameLength + buf.readUInt16LE(at + 30) + buf.readUInt16LE(at + 32);
  }
  return {
    has: (name: string) => entries.has(name),
    readBytes(name: string): Buffer | null {
      const entry = entries.get(name);
      if (!entry || entry.offset + 30 > buf.length) return null;
      const start = entry.offset + 30 + buf.readUInt16LE(entry.offset + 26) + buf.readUInt16LE(entry.offset + 28);
      const raw = buf.subarray(start, start + entry.size);
      if (entry.method === 0) return raw;
      if (entry.method !== 8) return null;
      // The cap stops a small file from unpacking into something enormous.
      return inflateRawSync(raw, { maxOutputLength: MAX_ENTRY_BYTES });
    },
    read(name: string): string | null {
      return this.readBytes(name)?.toString("utf8") ?? null;
    },
  };
}

export function isPptx(data: Uint8Array): boolean {
  if (data[0] !== 0x50 || data[1] !== 0x4b) return false;
  try {
    return openZip(data).has("ppt/presentation.xml");
  } catch {
    return false;
  }
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(x?)([0-9a-fA-F]+);/g, (_, hex: string, n: string) => String.fromCodePoint(parseInt(n, hex ? 16 : 10)))
    .replace(/&amp;/g, "&");

/** The text of one slide or notes page: one line per paragraph, runs joined. */
function slideText(xml: string): string {
  const lines: string[] = [];
  for (const para of xml.match(/<a:p[ >][\s\S]*?<\/a:p>/g) ?? []) {
    // A line break inside a paragraph is its own tag, not text.
    const withBreaks = para.replace(/<a:br\b[^>]*>/g, "<a:t>\n</a:t>");
    const text = [...withBreaks.matchAll(/<a:t(?: [^>]*)?>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1])).join("").trim();
    if (text) lines.push(text);
  }
  return lines.join("\n");
}

const relTargets = (xml: string | null) =>
  new Map(
    [...(xml ?? "").matchAll(/<Relationship\b[^>]*>/g)].map((m) => [
      /\bId="([^"]+)"/.exec(m[0])?.[1] ?? "",
      /\bTarget="([^"]+)"/.exec(m[0])?.[1] ?? "",
    ]),
  );

export interface Picture {
  /** Slide number, starting at 1. */
  slide: number;
  path: string;
  bytes: Buffer;
}

export interface DeckSlide {
  text: string;
  pictures: Picture[];
}

/** Marks the part of a slide's text that came from reading its pictures. */
export const PICTURES_LABEL = "Shown in pictures on this slide:";

const PICTURE_TYPES = /\.(png|jpe?g|gif|webp)$/i;
const MIN_PICTURE_BYTES = 5 * 1024;

/** Every slide in the order it is shown: its text, its speaker notes and the pictures placed on it. */
export function readDeck(data: Uint8Array): DeckSlide[] {
  let zip: ReturnType<typeof openZip>;
  let paths: string[];
  try {
    zip = openZip(data);
    // Slides are stored in the order they were created; the presentation file lists the order they are shown in.
    const targets = relTargets(zip.read("ppt/_rels/presentation.xml.rels"));
    paths = [...(zip.read("ppt/presentation.xml") ?? "").matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)]
      .map((m) => targets.get(m[1]) ?? "")
      .filter((t) => t.startsWith("slides/"))
      .map((t) => `ppt/${t}`);
  } catch (error) {
    if (error instanceof ExtractError) throw error;
    throw new ExtractError("This file could not be read as a PowerPoint file.");
  }
  if (paths.length === 0) throw new ExtractError("No slides were found in this PowerPoint file.");
  if (paths.length > MAX_PAGES) throw new ExtractError(`This file has ${paths.length} slides. The limit is ${MAX_PAGES}.`);

  const uses = new Map<string, number>();
  const slides = paths.map((path, i) => {
    let text = "";
    const pictures: Picture[] = [];
    try {
      const xml = zip.read(path) ?? "";
      text = slideText(xml);
      const file = path.slice(path.lastIndexOf("/") + 1);
      const rels = relTargets(zip.read(`ppt/slides/_rels/${file}.rels`));
      // Speaker notes often carry the explanation the slide only hints at.
      const notesTarget = [...rels.values()].find((t) => t.includes("notesSlides/"));
      const notes = notesTarget
        ? slideText(zip.read(`ppt/notesSlides/${notesTarget.slice(notesTarget.lastIndexOf("/") + 1)}`) ?? "")
            .split("\n")
            .filter((line) => !/^\d+$/.test(line))
            .join("\n")
        : "";
      if (notes) text += `${text ? "\n" : ""}Speaker notes: ${notes}`;

      for (const m of xml.matchAll(/<a:blip\b[^>]*\br:embed="([^"]+)"/g)) {
        const target = rels.get(m[1]) ?? "";
        const media = `ppt/media/${target.slice(target.lastIndexOf("/") + 1)}`;
        if (!target.includes("media/") || !PICTURE_TYPES.test(media) || pictures.some((p) => p.path === media)) continue;
        const bytes = zip.readBytes(media);
        if (!bytes || bytes.length < MIN_PICTURE_BYTES) continue;
        pictures.push({ slide: i + 1, path: media, bytes });
        uses.set(media, (uses.get(media) ?? 0) + 1);
      }
    } catch {
      // One unreadable slide should not sink the whole deck.
    }
    return { text, pictures };
  });
  // The same picture on several slides is a logo or part of the template, not content.
  for (const slide of slides) slide.pictures = slide.pictures.filter((p) => (uses.get(p.path) ?? 0) < 3);
  return slides;
}

/** Slide text grouped into chunks, with what the pictures show folded in where it is known. */
export function deckChunks(slides: DeckSlide[], described = new Map<number, string>()): Chunk[] {
  const pages = slides.map((slide, i) => {
    const shown = described.get(i + 1);
    return shown ? `${slide.text}${slide.text ? "\n" : ""}${PICTURES_LABEL} ${shown}` : slide.text;
  });
  return chunkPages(pages, "Slide");
}

export function extractPptx(data: Uint8Array): { pageCount: number; chunks: Chunk[] } {
  const slides = readDeck(data);
  const total = slides.reduce((sum, slide) => sum + slide.text.length, 0);
  // A deck of pictures is fine: they are read before the notes are written.
  if (total < 40 * Math.min(slides.length, 5) && !slides.some((slide) => slide.pictures.length > 0)) {
    throw new ExtractError("Nothing readable was found in these slides. Paste the text instead.");
  }
  return { pageCount: slides.length, chunks: deckChunks(slides) };
}

function chunkPages(pages: string[], label = "Page", target = 6000): Chunk[] {
  const chunks: Chunk[] = [];
  let text = "";
  let from = 1;
  pages.forEach((page, i) => {
    const n = i + 1;
    const piece = `[${label} ${n}]\n${page}`;
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

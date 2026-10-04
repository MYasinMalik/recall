// Data access. Every function takes the signed-in user's id and filters on it, so one user can
// never read or change another's rows. Route handlers do not touch the database directly.
import { rmSync } from "node:fs";
import { join } from "node:path";
import type {
  AnswerResult,
  Block,
  CardState,
  ChatMessage,
  ChatScope,
  Flashcard,
  Folder,
  Lesson,
  Note,
  QuizQuestion,
  SectionDetail,
  SectionSummary,
  SourceKind,
} from "@/lib/data/types";
import { all, get, now, run, transaction, uid } from "./db";
import { UPLOAD_DIR } from "./env";

export class NotFound extends Error {}

/** The most source text sent to the model in one request, in characters. */
export const SOURCE_LIMIT = 120_000;

const kindToDb: Record<SourceKind, string> = { file: "pdf", text: "text", link: "web", topic: "topic" };
const kindFromDb: Record<string, SourceKind> = { pdf: "file", text: "text", web: "link", youtube: "link", topic: "topic" };

/* ------------------------------------------------------------------ folders */

export function listFolders(userId: string): Folder[] {
  return all<Folder>("select id, name from folders where user_id = ? order by name collate nocase", userId);
}

export function createFolder(userId: string, name: string): Folder {
  const folder = { id: uid(), name: name.trim() };
  const t = now();
  run("insert into folders (id, user_id, name, created_at, updated_at) values (?, ?, ?, ?, ?)", folder.id, userId, folder.name, t, t);
  return folder;
}

export function deleteFolder(userId: string, id: string) {
  run("delete from folders where id = ? and user_id = ?", id, userId);
}

function ownsFolder(userId: string, id: string | null): string | null {
  if (!id) return null;
  return get("select id from folders where id = ? and user_id = ?", id, userId) ? id : null;
}

/* ------------------------------------------------------------------ lessons */

const LESSON_SELECT = `
  select l.id, l.title, coalesce(l.summary, '') as summary, l.status, l.folder_id as folderId, l.updated_at as updatedAt,
    s.kind as dbKind, coalesce(s.filename, s.url, '') as sourceName,
    (select count(*) from flashcards c where c.lesson_id = l.id) as cardCount,
    (select count(*) from quiz_questions q where q.lesson_id = l.id) as questionCount,
    (select count(*) from lesson_sections x where x.lesson_id = l.id) as sectionCount,
    (select count(*) from lesson_sections x join section_progress p on p.section_id = x.id
       where x.lesson_id = l.id and p.completed_at is not null) as sectionsDone,
    exists(select 1 from jobs j where j.lesson_id = l.id and j.kind = 'section' and j.status in ('queued','running')) as lessonPending
  from lessons l left join sources s on s.lesson_id = l.id`;

type LessonRow = Omit<Lesson, "sourceKind" | "lessonPending" | "status"> & {
  dbKind: string | null;
  lessonPending: number;
  status: string;
};

function toLesson(r: LessonRow): Lesson {
  const sourceKind = kindFromDb[r.dbKind ?? "text"] ?? "text";
  const { dbKind: _dbKind, ...rest } = r;
  return {
    ...rest,
    status: r.status === "ready" || r.status === "failed" ? r.status : "generating",
    sourceKind,
    sourceName: r.sourceName || (sourceKind === "topic" ? "Topic" : sourceKind === "text" ? "Pasted text" : "Source"),
    lessonPending: r.lessonPending === 1,
  };
}

export function listLessons(userId: string, filter?: { folderId?: string; query?: string }): Lesson[] {
  const where = ["l.user_id = ?"];
  const params: string[] = [userId];
  if (filter?.folderId) {
    where.push("l.folder_id = ?");
    params.push(filter.folderId);
  }
  const q = filter?.query?.trim();
  if (q) {
    where.push("(l.title like ? escape '\\' or exists(select 1 from notes n where n.lesson_id = l.id and n.content_md like ? escape '\\'))");
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    params.push(like, like);
  }
  return all<LessonRow>(`${LESSON_SELECT} where ${where.join(" and ")} order by l.updated_at desc`, ...params).map(toLesson);
}

export function getLesson(userId: string, id: string): Lesson | null {
  const row = get<LessonRow>(`${LESSON_SELECT} where l.id = ? and l.user_id = ?`, id, userId);
  return row ? toLesson(row) : null;
}

function requireLesson(userId: string, id: string) {
  if (!get("select id from lessons where id = ? and user_id = ?", id, userId)) throw new NotFound("Lesson not found");
}

export function insertLesson(
  userId: string,
  input: { kind: SourceKind; title: string; folderId: string | null; focus: string; filename?: string; url?: string; filePath?: string; byteSize?: number; pageCount?: number; chunks: { text: string; pageFrom?: number; pageTo?: number }[] },
): string {
  const lessonId = uid();
  const sourceId = uid();
  const t = now();
  transaction(() => {
    run(
      "insert into lessons (id, user_id, folder_id, title, status, focus, created_at, updated_at) values (?, ?, ?, ?, 'generating', ?, ?, ?)",
      lessonId, userId, ownsFolder(userId, input.folderId), input.title.slice(0, 200) || "Untitled lesson", input.focus.slice(0, 2000) || null, t, t,
    );
    run(
      "insert into sources (id, lesson_id, user_id, kind, filename, url, file_path, byte_size, page_count, status, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?)",
      sourceId, lessonId, userId, kindToDb[input.kind], input.filename ?? null, input.url ?? null, input.filePath ?? null, input.byteSize ?? null, input.pageCount ?? null, t, t,
    );
    input.chunks.forEach((c, i) =>
      run(
        "insert into source_chunks (id, source_id, seq, page_from, page_to, text, token_estimate) values (?, ?, ?, ?, ?, ?, ?)",
        uid(), sourceId, i, c.pageFrom ?? null, c.pageTo ?? null, c.text, Math.ceil(c.text.length / 4),
      ),
    );
    run("insert into notes (lesson_id, user_id, content_json, content_md, updated_at) values (?, ?, '', '', ?)", lessonId, userId, t);
  });
  return lessonId;
}

export function deleteLesson(userId: string, id: string) {
  const files = all<{ file_path: string | null }>("select file_path from sources where lesson_id = ? and user_id = ?", id, userId);
  run("delete from lessons where id = ? and user_id = ?", id, userId);
  for (const f of files) if (f.file_path) rmSync(join(UPLOAD_DIR, f.file_path), { force: true });
}

export function deleteEverything(userId: string) {
  for (const l of all<{ id: string }>("select id from lessons where user_id = ?", userId)) deleteLesson(userId, l.id);
  run("delete from folders where user_id = ?", userId);
}

/* ------------------------------------------------------------------ notes and source */

export function getNote(userId: string, lessonId: string): Note {
  requireLesson(userId, lessonId);
  const note = get<{ content_md: string }>("select content_md from notes where lesson_id = ? and user_id = ?", lessonId, userId);
  const lesson = get<{ status: string }>("select status from lessons where id = ?", lessonId);
  const job = get<{ status: string; progress: number; step_label: string | null; error_code: string | null }>(
    "select status, progress, step_label, error_code from jobs where lesson_id = ? and kind = 'notes' order by created_at desc limit 1",
    lessonId,
  );
  const generating = lesson?.status === "generating";
  const sourceLength =
    get<{ n: number | null }>(
      "select sum(length(c.text)) as n from source_chunks c join sources s on s.id = c.source_id where s.lesson_id = ?",
      lessonId,
    )?.n ?? 0;
  return {
    truncated: sourceLength > SOURCE_LIMIT,
    markdown: note?.content_md ?? "",
    generating,
    progress: generating ? (job?.progress ?? 0) : lesson?.status === "ready" ? 100 : 0,
    label: generating ? (job?.step_label ?? "") : "",
    error: lesson?.status === "failed" ? (job?.step_label ?? undefined) : undefined,
  };
}

export function getSourceText(userId: string, lessonId: string, maxChars = Infinity): string {
  requireLesson(userId, lessonId);
  const chunks = all<{ text: string }>(
    "select c.text from source_chunks c join sources s on s.id = c.source_id where s.lesson_id = ? and s.user_id = ? order by c.seq",
    lessonId, userId,
  );
  let out = "";
  for (const c of chunks) {
    if (out.length + c.text.length > maxChars) {
      out += c.text.slice(0, Math.max(0, maxChars - out.length));
      break;
    }
    out += (out ? "\n\n" : "") + c.text;
  }
  return out;
}

/* ------------------------------------------------------------------ guided lesson */

export function listSections(userId: string, lessonId: string): SectionSummary[] {
  requireLesson(userId, lessonId);
  const rows = all<{ id: string; seq: number; kind: SectionSummary["kind"]; title: string; blockCount: number; done: number; answered: number; correct: number }>(
    `select x.id, x.seq, x.kind, x.title,
       (select count(*) from section_blocks b where b.section_id = x.id) as blockCount,
       coalesce((select p.completed_at is not null from section_progress p where p.section_id = x.id), 0) as done,
       (select count(*) from block_responses r join section_blocks b on b.id = r.block_id where b.section_id = x.id and r.is_correct is not null) as answered,
       (select count(*) from block_responses r join section_blocks b on b.id = r.block_id where b.section_id = x.id and r.is_correct = 1) as correct
     from lesson_sections x where x.lesson_id = ? order by x.seq`,
    lessonId,
  );
  return rows.map((r, i) => ({ ...r, seq: i + 1, done: r.done === 1, locked: i > 0 && rows[i - 1].done !== 1 }));
}

function ownedSection(userId: string, sectionId: string) {
  return get<{ id: string; lessonId: string; seq: number; title: string }>(
    "select x.id, x.lesson_id as lessonId, x.seq, x.title from lesson_sections x join lessons l on l.id = x.lesson_id where x.id = ? and l.user_id = ?",
    sectionId, userId,
  );
}

function toResult(answerIndex: number, explanation: string | null, chosen: number): AnswerResult {
  return { chosen, correct: chosen === answerIndex, answerIndex, explanation: explanation ?? "" };
}

export function getSection(userId: string, sectionId: string): SectionDetail | null {
  const section = ownedSection(userId, sectionId);
  if (!section) return null;
  const rows = all<{ id: string; kind: string; body_md: string | null; options: string | null; answer_index: number | null; explanation: string | null; chosen: number | null }>(
    `select b.id, b.kind, b.body_md, b.options, b.answer_index, b.explanation, r.chosen_index as chosen
     from section_blocks b left join block_responses r on r.block_id = b.id where b.section_id = ? order by b.seq`,
    sectionId,
  );
  // The answer and explanation leave the server only once the block has been answered.
  const blocks: Block[] = rows.map((b) =>
    b.kind === "text"
      ? { id: b.id, kind: "text", body: b.body_md ?? "" }
      : {
          id: b.id,
          kind: b.kind === "fill_blank" ? "fill" : "mcq",
          body: b.body_md ?? "",
          options: JSON.parse(b.options ?? "[]") as string[],
          response: b.chosen === null ? undefined : toResult(b.answer_index ?? 0, b.explanation, b.chosen),
        },
  );
  const progress = get<{ furthest_seq: number; completed_at: number | null }>("select furthest_seq, completed_at from section_progress where section_id = ?", sectionId);
  const ordered = all<{ id: string }>("select id from lesson_sections where lesson_id = ? order by seq", section.lessonId);
  const index = ordered.findIndex((s) => s.id === sectionId);
  return {
    id: section.id,
    lessonId: section.lessonId,
    seq: index + 1,
    title: section.title,
    blocks,
    furthest: progress?.furthest_seq ?? 0,
    done: !!progress?.completed_at,
    nextSectionId: ordered[index + 1]?.id ?? null,
  };
}

function upsertProgress(userId: string, sectionId: string, furthest: number, complete: boolean) {
  const t = now();
  run(
    `insert into section_progress (section_id, user_id, furthest_seq, completed_at, updated_at) values (?, ?, ?, ?, ?)
     on conflict(section_id) do update set furthest_seq = max(furthest_seq, excluded.furthest_seq),
       completed_at = coalesce(completed_at, excluded.completed_at), updated_at = excluded.updated_at`,
    sectionId, userId, furthest, complete ? t : null, t,
  );
}

export function revealBlock(userId: string, sectionId: string, index: number) {
  if (!ownedSection(userId, sectionId)) throw new NotFound("Section not found");
  upsertProgress(userId, sectionId, index, false);
}

export function completeSection(userId: string, sectionId: string) {
  const section = ownedSection(userId, sectionId);
  if (!section) throw new NotFound("Section not found");
  upsertProgress(userId, sectionId, 0, true);
  run("update lessons set updated_at = ? where id = ?", now(), section.lessonId);
}

export function answerBlock(userId: string, blockId: string, chosen: number): AnswerResult {
  const block = get<{ answer_index: number | null; explanation: string | null; options: string | null }>(
    `select b.answer_index, b.explanation, b.options from section_blocks b
     join lesson_sections x on x.id = b.section_id join lessons l on l.id = x.lesson_id
     where b.id = ? and l.user_id = ? and b.kind != 'text'`,
    blockId, userId,
  );
  if (!block) throw new NotFound("Question not found");
  const count = (JSON.parse(block.options ?? "[]") as string[]).length;
  if (chosen < 0 || chosen >= count) throw new NotFound("That option does not exist");
  // The first answer stands; a second submission returns the stored result.
  run(
    "insert into block_responses (block_id, user_id, chosen_index, is_correct, answered_at) values (?, ?, ?, ?, ?) on conflict(block_id) do nothing",
    blockId, userId, chosen, chosen === block.answer_index ? 1 : 0, now(),
  );
  const stored = get<{ chosen_index: number }>("select chosen_index from block_responses where block_id = ?", blockId);
  return toResult(block.answer_index ?? 0, block.explanation, stored?.chosen_index ?? chosen);
}

/* ------------------------------------------------------------------ flashcards */

const cardState = (box: number): CardState => (box === 0 ? "new" : box >= 3 ? "known" : "learning");

export function listCards(userId: string, lessonId: string): Flashcard[] {
  requireLesson(userId, lessonId);
  return all<{ id: string; front: string; back: string; box: number }>(
    "select id, front, back, box from flashcards where lesson_id = ? and user_id = ? order by created_at, rowid", lessonId, userId,
  ).map((c) => ({ id: c.id, front: c.front, back: c.back, state: cardState(c.box) }));
}

export function replaceCards(userId: string, lessonId: string, cards: { front: string; back: string }[]) {
  requireLesson(userId, lessonId);
  const t = now();
  transaction(() => {
    run("delete from flashcards where lesson_id = ? and user_id = ?", lessonId, userId);
    for (const c of cards)
      run("insert into flashcards (id, lesson_id, user_id, front, back, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)", uid(), lessonId, userId, c.front, c.back, t, t);
  });
}

export function reviewCard(userId: string, cardId: string, knew: boolean) {
  const card = get<{ box: number }>("select box from flashcards where id = ? and user_id = ?", cardId, userId);
  if (!card) throw new NotFound("Card not found");
  const after = knew ? Math.min(5, Math.max(card.box, 1) + 2) : 1;
  const t = now();
  transaction(() => {
    run(
      "update flashcards set box = ?, reps = reps + 1, lapses = lapses + ?, updated_at = ? where id = ?",
      after, knew ? 0 : 1, t, cardId,
    );
    run("insert into flashcard_reviews (id, card_id, knew, box_before, box_after, reviewed_at) values (?, ?, ?, ?, ?, ?)", uid(), cardId, knew ? 1 : 0, card.box, after, t);
  });
}

/* ------------------------------------------------------------------ quiz */

export function listQuestions(userId: string, lessonId: string): QuizQuestion[] {
  requireLesson(userId, lessonId);
  return all<{ id: string; topic: string; prompt_md: string; options: string; answer_index: number; hint: string | null; explanation: string; chosen: number | null }>(
    `select q.id, t.name as topic, q.prompt_md, q.options, q.answer_index, q.hint, q.explanation, a.chosen_index as chosen
     from quiz_questions q join quiz_topics t on t.id = q.topic_id left join quiz_answers a on a.question_id = q.id
     where q.lesson_id = ? order by q.seq`,
    lessonId,
  ).map((q) => ({
    id: q.id,
    topic: q.topic,
    prompt: q.prompt_md,
    options: JSON.parse(q.options) as string[],
    hint: q.hint ?? "",
    response: q.chosen === null ? undefined : toResult(q.answer_index, q.explanation, q.chosen),
  }));
}

export function replaceQuiz(
  userId: string,
  lessonId: string,
  questions: { topic: string; prompt: string; options: string[]; answerIndex: number; hint: string; explanation: string }[],
) {
  requireLesson(userId, lessonId);
  transaction(() => {
    run("delete from quiz_topics where lesson_id = ?", lessonId);
    const topics = new Map<string, string>();
    questions.forEach((q, i) => {
      let topicId = topics.get(q.topic);
      if (!topicId) {
        topicId = uid();
        topics.set(q.topic, topicId);
        run("insert into quiz_topics (id, lesson_id, name, seq) values (?, ?, ?, ?)", topicId, lessonId, q.topic, topics.size);
      }
      run(
        "insert into quiz_questions (id, lesson_id, topic_id, seq, prompt_md, options, answer_index, hint, explanation) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        uid(), lessonId, topicId, i, q.prompt, JSON.stringify(q.options), q.answerIndex, q.hint, q.explanation,
      );
    });
  });
}

export function answerQuestion(userId: string, questionId: string, chosen: number): AnswerResult {
  const q = get<{ answer_index: number; explanation: string }>(
    "select q.answer_index, q.explanation from quiz_questions q join lessons l on l.id = q.lesson_id where q.id = ? and l.user_id = ?",
    questionId, userId,
  );
  if (!q) throw new NotFound("Question not found");
  run(
    "insert into quiz_answers (question_id, user_id, chosen_index, is_correct, answered_at) values (?, ?, ?, ?, ?) on conflict(question_id) do nothing",
    questionId, userId, chosen, chosen === q.answer_index ? 1 : 0, now(),
  );
  const stored = get<{ chosen_index: number }>("select chosen_index from quiz_answers where question_id = ?", questionId);
  return toResult(q.answer_index, q.explanation, stored?.chosen_index ?? chosen);
}

export function resetQuiz(userId: string, lessonId: string) {
  requireLesson(userId, lessonId);
  run("delete from quiz_answers where question_id in (select id from quiz_questions where lesson_id = ?)", lessonId);
}

/* ------------------------------------------------------------------ chat */

export function threadId(userId: string, lessonId: string, scope: ChatScope): string {
  requireLesson(userId, lessonId);
  const existing = get<{ id: string }>("select id from chat_threads where lesson_id = ? and user_id = ? and scope = ? and section_id is null", lessonId, userId, scope);
  if (existing) return existing.id;
  const id = uid();
  run("insert into chat_threads (id, lesson_id, user_id, scope, created_at) values (?, ?, ?, ?, ?)", id, lessonId, userId, scope, now());
  return id;
}

export function listMessages(userId: string, lessonId: string, scope: ChatScope): ChatMessage[] {
  const thread = get<{ id: string }>("select id from chat_threads where lesson_id = ? and user_id = ? and scope = ? and section_id is null", lessonId, userId, scope);
  if (!thread) {
    requireLesson(userId, lessonId);
    return [];
  }
  return all<{ id: string; role: "user" | "assistant"; content_md: string; status: string }>(
    "select id, role, content_md, status from chat_messages where thread_id = ? order by created_at, rowid", thread.id,
  ).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.status === "failed" && !m.content_md ? "This reply could not be written." : m.content_md,
    streaming: m.status === "streaming",
  }));
}

export function addMessage(thread: string, role: "user" | "assistant", content: string, status: "complete" | "streaming"): string {
  const id = uid();
  run("insert into chat_messages (id, thread_id, role, content_md, status, created_at) values (?, ?, ?, ?, ?, ?)", id, thread, role, content, status, now());
  return id;
}

export function updateMessage(id: string, content: string, status: "streaming" | "complete" | "failed") {
  run("update chat_messages set content_md = ?, status = ? where id = ?", content, status, id);
}

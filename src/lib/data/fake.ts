// Browser-only stand-in for the real data layer. State lives in memory and localStorage.
// Generation is simulated from seed content; nothing here calls a model.
import {
  seedCards,
  seedNotes,
  seedQuestions,
  seedReplies,
  seedSections,
  seedSourceText,
  shortNotes,
  type SeedBlock,
} from "./seed";
import type {
  AnswerResult,
  Block,
  CardState,
  ChatMessage,
  ChatScope,
  DataLayer,
  Flashcard,
  Folder,
  Lesson,
  LessonStatus,
  Note,
  QuizQuestion,
  SectionKind,
  SourceKind,
} from "./types";

const KEY = "recall.fake.v1";

interface StoredBlock extends SeedBlock {
  id: string;
  chosen?: number;
}
interface StoredSection {
  id: string;
  kind: SectionKind;
  title: string;
  blocks: StoredBlock[];
  furthest: number;
  done: boolean;
}
interface StoredCard {
  id: string;
  front: string;
  back: string;
  box: number;
}
interface StoredQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  hint: string;
  explanation: string;
  chosen?: number;
}
interface StoredLesson {
  id: string;
  title: string;
  summary: string;
  status: LessonStatus;
  folderId: string | null;
  sourceKind: SourceKind;
  sourceName: string;
  updatedAt: number;
  notes: string;
  fullNotes: string;
  sourceText: string;
  sections: StoredSection[];
  cards: StoredCard[];
  questions: StoredQuestion[];
  chats: Record<ChatScope, ChatMessage[]>;
}
interface State {
  folders: Folder[];
  lessons: StoredLesson[];
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildSections(): StoredSection[] {
  return seedSections.map((s) => ({
    id: uid(),
    kind: s.kind,
    title: s.title,
    blocks: s.blocks.map((b) => ({ ...b, id: uid() })),
    furthest: 0,
    done: false,
  }));
}

function seedState(): State {
  const folder: Folder = { id: uid(), name: "Discrete maths" };
  const base = { chats: { notes: [], source: [] } as Record<ChatScope, ChatMessage[]> };
  return {
    folders: [folder],
    lessons: [
      {
        ...base,
        id: uid(),
        title: "Functions, injections and bijections",
        summary: "What makes a rule a function, and what injections and bijections say about size.",
        status: "ready",
        folderId: folder.id,
        sourceKind: "file",
        sourceName: "lecture-8.pdf",
        updatedAt: Date.now() - 3600_000,
        notes: seedNotes,
        fullNotes: seedNotes,
        sourceText: seedSourceText,
        sections: buildSections(),
        cards: seedCards.slice(0, 10).map((c) => ({ ...c, id: uid(), box: 0 })),
        questions: [],
      },
      {
        ...base,
        id: uid(),
        title: "Reading a proof by induction",
        summary: "The base case, the inductive step, and one worked example.",
        status: "ready",
        folderId: null,
        sourceKind: "topic",
        sourceName: "Topic",
        updatedAt: Date.now() - 86400_000 * 2,
        notes: shortNotes,
        fullNotes: shortNotes,
        sourceText: "Topic: proof by induction",
        sections: [],
        cards: [],
        questions: [],
      },
    ],
  };
}

let state: State | null = null;
const listeners = new Set<() => void>();
const jobs = new Map<string, { progress: number; label: string }>();

function load(): State {
  if (state) return state;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) {
      state = JSON.parse(raw) as State;
      // A reload interrupts simulated jobs, the same way a restart would interrupt real ones.
      for (const l of state.lessons) if (l.status === "generating") l.status = "failed";
      return state;
    }
  } catch {
    // Unreadable storage falls through to fresh seed data.
  }
  state = seedState();
  return state;
}

function commit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or blocked; the in-memory copy still works for this visit.
  }
  listeners.forEach((l) => l());
}

const cardState = (box: number): CardState => (box === 0 ? "new" : box >= 3 ? "known" : "learning");

function publicLesson(l: StoredLesson): Lesson {
  return {
    id: l.id,
    title: l.title,
    summary: l.summary,
    status: l.status,
    folderId: l.folderId,
    sourceKind: l.sourceKind,
    sourceName: l.sourceName,
    updatedAt: l.updatedAt,
    cardCount: l.cards.length,
    questionCount: l.questions.length,
    sectionCount: l.sections.length,
    sectionsDone: l.sections.filter((s) => s.done).length,
  };
}

function findLesson(id: string): StoredLesson {
  const lesson = load().lessons.find((l) => l.id === id);
  if (!lesson) throw new Error("Lesson not found");
  return lesson;
}

function findSection(sectionId: string) {
  for (const lesson of load().lessons) {
    const index = lesson.sections.findIndex((s) => s.id === sectionId);
    if (index >= 0) return { lesson, section: lesson.sections[index], index };
  }
  return null;
}

function result(answerIndex: number, explanation: string, chosen: number): AnswerResult {
  return { chosen, correct: chosen === answerIndex, answerIndex, explanation };
}

function startGeneration(lesson: StoredLesson) {
  if (jobs.has(lesson.id)) return;
  lesson.status = "generating";
  lesson.notes = "";
  jobs.set(lesson.id, { progress: 5, label: "Reading the source" });
  commit();
  const words = lesson.fullNotes.split(/(?<=\s)/);
  let i = 0;
  const timer = setInterval(() => {
    const current = load().lessons.find((l) => l.id === lesson.id);
    if (!current) {
      clearInterval(timer);
      jobs.delete(lesson.id);
      return;
    }
    i = Math.min(words.length, i + 6);
    current.notes = words.slice(0, i).join("");
    const progress = 10 + Math.round((i / words.length) * 85);
    jobs.set(lesson.id, { progress, label: "Writing notes" });
    if (i >= words.length) {
      clearInterval(timer);
      jobs.delete(lesson.id);
      current.status = "ready";
      current.sections = buildSections();
      current.updatedAt = Date.now();
    }
    commit();
  }, 90);
}

export const fakeData: DataLayer = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async me() {
    return { name: "Sample account", email: "you@example.com", planUsage: false, signedIn: false, model: null };
  },
  async listModels() {
    return [{ slug: "sample", name: "Sample model (AI not connected)" }];
  },
  async setModel() {},
  async signOut() {},

  async listFolders() {
    return [...load().folders];
  },
  async createFolder(name) {
    const folder = { id: uid(), name: name.trim() };
    load().folders.push(folder);
    commit();
    return folder;
  },
  async deleteFolder(id) {
    const s = load();
    s.folders = s.folders.filter((f) => f.id !== id);
    for (const l of s.lessons) if (l.folderId === id) l.folderId = null;
    commit();
  },

  async listLessons(filter) {
    await wait(120);
    const q = filter?.query?.trim().toLowerCase();
    return load()
      .lessons.filter((l) => (filter?.folderId ? l.folderId === filter.folderId : true))
      .filter((l) => (q ? (l.title + " " + l.notes).toLowerCase().includes(q) : true))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(publicLesson);
  },
  async getLesson(id) {
    await wait(80);
    const lesson = load().lessons.find((l) => l.id === id);
    return lesson ? publicLesson(lesson) : null;
  },
  async createLesson(input) {
    const value = input.value.trim();
    const title =
      input.kind === "file"
        ? value.replace(/\.[a-z0-9]+$/i, "")
        : input.kind === "link"
          ? value.replace(/^https?:\/\//, "").slice(0, 60)
          : value.split("\n")[0].slice(0, 60);
    const lesson: StoredLesson = {
      id: uid(),
      title: title || "Untitled lesson",
      summary: "Sample notes. The AI layer is not connected yet.",
      status: "generating",
      folderId: input.folderId,
      sourceKind: input.kind,
      sourceName: input.kind === "file" || input.kind === "link" ? value : input.kind === "topic" ? "Topic" : "Pasted text",
      updatedAt: Date.now(),
      notes: "",
      fullNotes: seedNotes,
      sourceText: input.kind === "text" ? value : seedSourceText,
      sections: [],
      cards: [],
      questions: [],
      chats: { notes: [], source: [] },
    };
    load().lessons.push(lesson);
    startGeneration(lesson);
    return publicLesson(lesson);
  },
  async deleteLesson(id) {
    const s = load();
    s.lessons = s.lessons.filter((l) => l.id !== id);
    commit();
  },
  async writeGuidedLesson() {
    // Sample lessons already have theirs.
  },
  async retryGeneration(id) {
    startGeneration(findLesson(id));
  },

  async getNote(lessonId): Promise<Note> {
    const lesson = findLesson(lessonId);
    const job = jobs.get(lessonId);
    return {
      markdown: lesson.notes,
      generating: lesson.status === "generating",
      progress: job?.progress ?? (lesson.status === "ready" ? 100 : 0),
      label: job?.label ?? "",
    };
  },
  async getSourceText(lessonId) {
    return findLesson(lessonId).sourceText;
  },

  async listSections(lessonId) {
    const sections = findLesson(lessonId).sections;
    return sections.map((s, i) => {
      const questions = s.blocks.filter((b) => b.kind !== "text");
      const answered = questions.filter((b) => b.chosen !== undefined);
      return {
        id: s.id,
        seq: i + 1,
        kind: s.kind,
        title: s.title,
        blockCount: s.blocks.length,
        done: s.done,
        locked: i > 0 && !sections[i - 1].done,
        answered: answered.length,
        correct: answered.filter((b) => b.chosen === b.answerIndex).length,
      };
    });
  },
  async getSection(sectionId) {
    await wait(80);
    const found = findSection(sectionId);
    if (!found) return null;
    const { lesson, section, index } = found;
    const blocks: Block[] = section.blocks.map((b) =>
      b.kind === "text"
        ? { id: b.id, kind: "text", body: b.body }
        : {
            id: b.id,
            kind: b.kind,
            body: b.body,
            options: b.options ?? [],
            response:
              b.chosen === undefined ? undefined : result(b.answerIndex ?? 0, b.explanation ?? "", b.chosen),
          },
    );
    return {
      id: section.id,
      lessonId: lesson.id,
      seq: index + 1,
      title: section.title,
      blocks,
      furthest: section.furthest,
      done: section.done,
      nextSectionId: lesson.sections[index + 1]?.id ?? null,
    };
  },
  async revealBlock(sectionId, index) {
    const found = findSection(sectionId);
    if (!found) return;
    found.section.furthest = Math.max(found.section.furthest, index);
    commit();
  },
  async answerBlock(blockId, chosen) {
    for (const lesson of load().lessons)
      for (const section of lesson.sections) {
        const block = section.blocks.find((b) => b.id === blockId);
        if (block) {
          if (block.chosen === undefined) block.chosen = chosen;
          commit();
          return result(block.answerIndex ?? 0, block.explanation ?? "", block.chosen);
        }
      }
    throw new Error("Question not found");
  },
  async completeSection(sectionId) {
    const found = findSection(sectionId);
    if (!found) return;
    found.section.done = true;
    found.lesson.updatedAt = Date.now();
    commit();
  },

  async listCards(lessonId): Promise<Flashcard[]> {
    return findLesson(lessonId).cards.map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      state: cardState(c.box),
    }));
  },
  async generateCards(lessonId, count) {
    await wait(900);
    const lesson = findLesson(lessonId);
    lesson.cards = Array.from({ length: count }, (_, i) => ({
      ...seedCards[i % seedCards.length],
      id: uid(),
      box: 0,
    }));
    commit();
  },
  async reviewCard(cardId, knew) {
    for (const lesson of load().lessons) {
      const card = lesson.cards.find((c) => c.id === cardId);
      if (card) {
        card.box = knew ? Math.min(5, Math.max(card.box, 1) + 2) : 1;
        commit();
        return;
      }
    }
  },

  async listQuestions(lessonId): Promise<QuizQuestion[]> {
    return findLesson(lessonId).questions.map((q) => ({
      id: q.id,
      topic: q.topic,
      prompt: q.prompt,
      options: q.options,
      hint: q.hint,
      response: q.chosen === undefined ? undefined : result(q.answerIndex, q.explanation, q.chosen),
    }));
  },
  async generateQuiz(lessonId) {
    await wait(900);
    findLesson(lessonId).questions = seedQuestions.map((q) => ({ ...q, id: uid() }));
    commit();
  },
  async answerQuestion(questionId, chosen) {
    for (const lesson of load().lessons) {
      const q = lesson.questions.find((x) => x.id === questionId);
      if (q) {
        if (q.chosen === undefined) q.chosen = chosen;
        commit();
        return result(q.answerIndex, q.explanation, q.chosen);
      }
    }
    throw new Error("Question not found");
  },
  async resetQuiz(lessonId) {
    for (const q of findLesson(lessonId).questions) delete q.chosen;
    commit();
  },

  async listMessages(lessonId, scope) {
    return [...findLesson(lessonId).chats[scope]];
  },
  async sendMessage(lessonId, scope, text) {
    const thread = findLesson(lessonId).chats[scope];
    thread.push({ id: uid(), role: "user", content: text });
    const reply: ChatMessage = { id: uid(), role: "assistant", content: "", streaming: true };
    thread.push(reply);
    commit();
    const full = seedReplies[(thread.length / 2 - 1) % seedReplies.length];
    for (const word of full.split(/(?<=\s)/)) {
      await wait(35);
      reply.content += word;
      commit();
    }
    reply.streaming = false;
    commit();
  },

  async resetAll() {
    jobs.clear();
    state = seedState();
    commit();
  },
};

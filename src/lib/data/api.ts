// The real data layer: calls this install's own server. Same interface as the sample layer.
import type { DataLayer, Lesson } from "./types";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as { result?: T; error?: string; code?: string } | null;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/signin")) {
      window.location.assign("/signin");
    }
    throw new ApiError(body?.error ?? "The request failed", res.status, body?.code);
  }
  return body?.result as T;
}

async function call<T>(method: string, ...args: unknown[]): Promise<T> {
  const res = await fetch("/api/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, args }),
  });
  return parse<T>(res);
}

/** Runs a change, then tells every screen to reload. */
async function change<T>(method: string, ...args: unknown[]): Promise<T> {
  try {
    return await call<T>(method, ...args);
  } finally {
    emit();
  }
}

// While something is being written on the server, screens are refreshed about once a second.
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollUntil = 0;
function keepPolling(ms = 4000) {
  pollUntil = Math.max(pollUntil, Date.now() + ms);
  if (pollTimer) return;
  const tick = () => {
    pollTimer = null;
    if (Date.now() > pollUntil) return;
    emit();
    pollTimer = setTimeout(tick, 1000);
  };
  pollTimer = setTimeout(tick, 1000);
}

const watch = (lesson: Lesson | null) => {
  if (lesson && (lesson.status === "generating" || lesson.lessonPending)) keepPolling();
  return lesson;
};

/** Refreshes screens while a long request (a chat reply, a deck being written) is in flight. */
async function during<T>(work: Promise<T>): Promise<T> {
  const timer = setInterval(() => emit(), 700);
  try {
    return await work;
  } finally {
    clearInterval(timer);
    emit();
  }
}

export const apiData: DataLayer = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  me: () => call("me"),
  listModels: () => call("listModels"),
  setModel: (slug) => change("setModel", slug),
  async signOut() {
    await call("signOut");
    await fetch("/auth/signout", { method: "POST" });
  },

  listFolders: () => call("listFolders"),
  createFolder: (name) => change("createFolder", name),
  deleteFolder: (id) => change("deleteFolder", id),

  async listLessons(filter) {
    const lessons = await call<Lesson[]>("listLessons", filter ?? null);
    lessons.forEach(watch);
    return lessons;
  },
  getLesson: async (id) => watch(await call<Lesson | null>("getLesson", id)),
  async createLesson(input) {
    let lesson: Lesson;
    if (input.kind === "file") {
      if (!input.file) throw new ApiError("Choose a file first", 400);
      const form = new FormData();
      form.set("file", input.file);
      form.set("folderId", input.folderId ?? "");
      form.set("focus", input.focus);
      lesson = await parse<Lesson>(await fetch("/api/upload", { method: "POST", body: form }));
    } else if (input.kind === "link") {
      throw new ApiError("Links cannot be read yet. Paste the text instead.", 400);
    } else {
      lesson = await call<Lesson>("createLesson", {
        kind: input.kind,
        value: input.value,
        folderId: input.folderId,
        focus: input.focus,
      });
    }
    keepPolling();
    emit();
    return lesson;
  },
  deleteLesson: (id) => change("deleteLesson", id),
  async writeGuidedLesson(id) {
    await change("writeGuidedLesson", id);
    keepPolling();
  },
  async retryGeneration(id) {
    await change("retryGeneration", id);
    keepPolling();
  },

  getNote: (lessonId) => call("getNote", lessonId),
  getSourceText: (lessonId) => call("getSourceText", lessonId),

  listSections: (lessonId) => call("listSections", lessonId),
  getSection: (sectionId) => call("getSection", sectionId),
  revealBlock: (sectionId, index) => change("revealBlock", sectionId, index),
  answerBlock: (blockId, chosen) => change("answerBlock", blockId, chosen),
  completeSection: (sectionId) => change("completeSection", sectionId),

  listCards: (lessonId) => call("listCards", lessonId),
  generateCards: (lessonId, count, instructions) => during(call("generateCards", lessonId, count, instructions)),
  reviewCard: (cardId, knew) => change("reviewCard", cardId, knew),

  listQuestions: (lessonId) => call("listQuestions", lessonId),
  generateQuiz: (lessonId) => during(call("generateQuiz", lessonId)),
  answerQuestion: (questionId, chosen) => change("answerQuestion", questionId, chosen),
  resetQuiz: (lessonId) => change("resetQuiz", lessonId),

  listMessages: (lessonId, scope) => call("listMessages", lessonId, scope),
  sendMessage: (lessonId, scope, text) => during(call("sendMessage", lessonId, scope, text)),

  resetAll: () => change("resetAll"),
};

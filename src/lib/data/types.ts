export type LessonStatus = "generating" | "ready" | "failed";
export type SourceKind = "file" | "text" | "link" | "topic";
export type SectionKind = "intro" | "content" | "checkpoint" | "final";
export type CardState = "new" | "learning" | "known";
export type ChatScope = "notes" | "source";

export interface User {
  name: string;
  email: string;
  /** True when the account has granted ChatGPT plan usage, so lessons can be written. */
  planUsage: boolean;
  /** False for the built-in sample account. */
  signedIn: boolean;
  model: string | null;
}

export interface Model {
  slug: string;
  name: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  status: LessonStatus;
  folderId: string | null;
  sourceKind: SourceKind;
  sourceName: string;
  updatedAt: number;
  cardCount: number;
  questionCount: number;
  sectionsDone: number;
  sectionCount: number;
  /** The guided lesson is still being written. */
  lessonPending?: boolean;
}

export interface SectionSummary {
  id: string;
  seq: number;
  kind: SectionKind;
  title: string;
  blockCount: number;
  done: boolean;
  locked: boolean;
  correct: number;
  answered: number;
}

export interface AnswerResult {
  chosen: number;
  correct: boolean;
  answerIndex: number;
  explanation: string;
}

export type Block =
  | { id: string; kind: "text"; body: string }
  | { id: string; kind: "mcq" | "fill"; body: string; options: string[]; response?: AnswerResult };

export interface SectionDetail {
  id: string;
  lessonId: string;
  seq: number;
  title: string;
  blocks: Block[];
  /** Index of the furthest block the reader has revealed. */
  furthest: number;
  done: boolean;
  nextSectionId: string | null;
}

export interface Note {
  markdown: string;
  generating: boolean;
  progress: number;
  label: string;
  /** Why writing stopped, when it did. */
  error?: string;
  /** The source was longer than one request can take, so only the first part was used. */
  truncated?: boolean;
  /** Something in the source could not be read, such as pictures on slides. */
  warning?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  state: CardState;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  hint: string;
  response?: AnswerResult;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export interface NewLessonInput {
  kind: SourceKind;
  /** File name, pasted text, link or topic, depending on kind. */
  value: string;
  folderId: string | null;
  focus: string;
  /** The file itself, when kind is "file". */
  file?: File;
}

/**
 * Everything the screens need. The fake implementation runs in the browser on seed data;
 * the real one calls the API routes in architecture.md with the same signatures.
 */
export interface DataLayer {
  subscribe(listener: () => void): () => void;

  me(): Promise<User>;
  listModels(): Promise<Model[]>;
  setModel(slug: string): Promise<void>;
  signOut(): Promise<void>;

  listFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;

  listLessons(filter?: { folderId?: string; query?: string }): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | null>;
  createLesson(input: NewLessonInput): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;
  retryGeneration(id: string): Promise<void>;
  /** Writes the guided lesson from notes that already exist. */
  writeGuidedLesson(id: string): Promise<void>;

  getNote(lessonId: string): Promise<Note>;
  getSourceText(lessonId: string): Promise<string>;

  listSections(lessonId: string): Promise<SectionSummary[]>;
  getSection(sectionId: string): Promise<SectionDetail | null>;
  revealBlock(sectionId: string, index: number): Promise<void>;
  answerBlock(blockId: string, chosen: number): Promise<AnswerResult>;
  completeSection(sectionId: string): Promise<void>;

  listCards(lessonId: string): Promise<Flashcard[]>;
  generateCards(lessonId: string, count: number, instructions: string): Promise<void>;
  reviewCard(cardId: string, knew: boolean): Promise<void>;

  listQuestions(lessonId: string): Promise<QuizQuestion[]>;
  generateQuiz(lessonId: string): Promise<void>;
  answerQuestion(questionId: string, chosen: number): Promise<AnswerResult>;
  resetQuiz(lessonId: string): Promise<void>;

  listMessages(lessonId: string, scope: ChatScope): Promise<ChatMessage[]>;
  sendMessage(lessonId: string, scope: ChatScope, text: string): Promise<void>;

  resetAll(): Promise<void>;
}

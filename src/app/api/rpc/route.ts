import { z } from "zod";
import { AiError, describeAiError, listModels } from "@/server/ai";
import { AuthError, currentUser, hasPlanUsage, signOut } from "@/server/auth";
import { get, now, run } from "@/server/db";
import { chunkText } from "@/server/extract";
import * as generate from "@/server/generate";
import { json, rejectForeignRequest } from "@/server/guard";
import * as repo from "@/server/repo";

export const dynamic = "force-dynamic";

const id = z.string().uuid();
const scope = z.enum(["notes", "source"]);
const index = z.number().int().min(0).max(50);

type Handler = (userId: string, args: never[]) => unknown;

function method<T extends z.ZodTuple>(schema: T, handler: (userId: string, args: z.infer<T>) => unknown) {
  return { schema: schema as z.ZodTuple, handler: handler as unknown as Handler };
}

const methods: Record<string, { schema: z.ZodTuple; handler: Handler }> = {
  listModels: method(z.tuple([]), (u) => listModels(u)),
  setModel: method(z.tuple([z.string().min(1).max(100)]), (u, [slug]) => {
    run(
      "insert into settings (user_id, model_slug, updated_at) values (?, ?, ?) on conflict(user_id) do update set model_slug = excluded.model_slug, updated_at = excluded.updated_at",
      u,
      slug,
      now(),
    );
  }),

  listFolders: method(z.tuple([]), (u) => repo.listFolders(u)),
  createFolder: method(z.tuple([z.string().trim().min(1).max(120)]), (u, [name]) => repo.createFolder(u, name)),
  deleteFolder: method(z.tuple([id]), (u, [folderId]) => repo.deleteFolder(u, folderId)),

  listLessons: method(
    z.tuple([z.object({ folderId: id.optional(), query: z.string().max(200).optional() }).nullish()]),
    (u, [filter]) => repo.listLessons(u, filter ?? undefined),
  ),
  getLesson: method(z.tuple([id]), (u, [lessonId]) => repo.getLesson(u, lessonId)),
  createLesson: method(
    z.tuple([
      z.object({
        kind: z.enum(["text", "topic"]),
        value: z.string().trim().min(1).max(400_000),
        folderId: id.nullable(),
        focus: z.string().max(2000),
      }),
    ]),
    (u, [input]) => {
      const lessonId = repo.insertLesson(u, {
        kind: input.kind,
        title: input.value.split("\n")[0].slice(0, 80),
        folderId: input.folderId,
        focus: input.focus,
        chunks: input.kind === "text" ? chunkText(input.value) : [{ text: `Topic: ${input.value}` }],
      });
      generate.startLessonGeneration(u, lessonId);
      return repo.getLesson(u, lessonId);
    },
  ),
  deleteLesson: method(z.tuple([id]), (u, [lessonId]) => repo.deleteLesson(u, lessonId)),
  retryGeneration: method(z.tuple([id]), (u, [lessonId]) => {
    if (!repo.getLesson(u, lessonId)) throw new repo.NotFound("Lesson not found");
    generate.startLessonGeneration(u, lessonId);
  }),

  getNote: method(z.tuple([id]), (u, [lessonId]) => repo.getNote(u, lessonId)),
  getSourceText: method(z.tuple([id]), (u, [lessonId]) => repo.getSourceText(u, lessonId, 400_000)),

  listSections: method(z.tuple([id]), (u, [lessonId]) => repo.listSections(u, lessonId)),
  getSection: method(z.tuple([id]), (u, [sectionId]) => repo.getSection(u, sectionId)),
  revealBlock: method(z.tuple([id, index]), (u, [sectionId, i]) => repo.revealBlock(u, sectionId, i)),
  answerBlock: method(z.tuple([id, index]), (u, [blockId, chosen]) => repo.answerBlock(u, blockId, chosen)),
  completeSection: method(z.tuple([id]), (u, [sectionId]) => repo.completeSection(u, sectionId)),

  listCards: method(z.tuple([id]), (u, [lessonId]) => repo.listCards(u, lessonId)),
  generateCards: method(
    z.tuple([id, z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]), z.string().max(500)]),
    (u, [lessonId, count, focus]) => generate.generateCards(u, lessonId, count, focus),
  ),
  reviewCard: method(z.tuple([id, z.boolean()]), (u, [cardId, knew]) => repo.reviewCard(u, cardId, knew)),

  listQuestions: method(z.tuple([id]), (u, [lessonId]) => repo.listQuestions(u, lessonId)),
  generateQuiz: method(z.tuple([id]), (u, [lessonId]) => generate.generateQuiz(u, lessonId)),
  answerQuestion: method(z.tuple([id, z.number().int().min(0).max(3)]), (u, [questionId, chosen]) =>
    repo.answerQuestion(u, questionId, chosen),
  ),
  resetQuiz: method(z.tuple([id]), (u, [lessonId]) => repo.resetQuiz(u, lessonId)),

  listMessages: method(z.tuple([id, scope]), (u, [lessonId, s]) => repo.listMessages(u, lessonId, s)),
  sendMessage: method(z.tuple([id, scope, z.string().trim().min(1).max(4000)]), (u, [lessonId, s, text]) =>
    generate.sendMessage(u, lessonId, s, text),
  ),

  resetAll: method(z.tuple([]), (u) => repo.deleteEverything(u)),
};

export async function POST(request: Request) {
  const blocked = rejectForeignRequest(request, true);
  if (blocked) return blocked;

  const body = z
    .object({ method: z.string(), args: z.array(z.unknown()).max(4) })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ error: "Bad request" }, 400);

  const user = await currentUser();
  if (!user) return json({ error: "Sign in to continue", code: "signed_out" }, 401);

  try {
    if (body.data.method === "me") {
      const model =
        get<{ model_slug: string | null }>("select model_slug from settings where user_id = ?", user.id)?.model_slug ??
        null;
      return json({
        result: {
          name: user.name ?? "ChatGPT account",
          email: user.email ?? "",
          planUsage: hasPlanUsage(user.id),
          signedIn: true,
          model,
        },
      });
    }
    if (body.data.method === "signOut") {
      await signOut(true);
      return json({ result: null });
    }
    const entry = methods[body.data.method];
    if (!entry) return json({ error: "Unknown method" }, 404);
    const args = entry.schema.safeParse(body.data.args);
    if (!args.success) return json({ error: "That request was not valid" }, 400);
    const result = await entry.handler(user.id, args.data as never[]);
    return json({ result: result ?? null });
  } catch (error) {
    if (error instanceof repo.NotFound) return json({ error: error.message }, 404);
    if (error instanceof AuthError || error instanceof AiError) {
      const described = describeAiError(error);
      return json({ error: described.message, code: described.code }, described.code === "signed_out" ? 401 : 502);
    }
    // Generation helpers already turn model failures into readable messages.
    const message = error instanceof Error && error.message.length < 300 ? error.message : "Something went wrong";
    console.error("rpc failed:", body.data.method, error instanceof Error ? error.name : "error");
    return json({ error: message }, 500);
  }
}

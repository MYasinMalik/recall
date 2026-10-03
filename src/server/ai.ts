// The only module that calls the model. Uses the Responses API with the signed-in user's ChatGPT plan token.
// The plan-usage preview requires store: false and stream: true and rejects sampling and length fields,
// so requests carry only model, instructions and input.
import type { z } from "zod";
import { accessToken, AuthError } from "./auth";
import { get } from "./db";

// RECALL_API_BASE points the app at a stand-in server in tests. Leave it unset in normal use.
const API = process.env.RECALL_API_BASE ?? "https://api.openai.com/v1";

export class AiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Plain-language messages for the errors a reader can act on. */
export function describeAiError(error: unknown): { code: string; message: string } {
  if (error instanceof AuthError) return { code: error.code, message: error.message };
  if (error instanceof AiError) {
    const messages: Record<string, string> = {
      subscription_sharing_usage_limit_exceeded:
        "Your ChatGPT plan limit was reached. Try again after it resets; what was written so far is saved.",
      subscription_sharing_user_not_eligible:
        "This ChatGPT account cannot be used here. Plan usage needs a Plus or Pro plan.",
      subscription_sharing_usage_unavailable: "ChatGPT plan usage is temporarily unavailable. Try again shortly.",
      subscription_sharing_user_unavailable: "ChatGPT plan usage is temporarily unavailable. Try again shortly.",
      subscription_sharing_invalid_user: "Your ChatGPT sign-in is no longer valid. Sign in again.",
      no_models: "No models are available on this ChatGPT account.",
      bad_output: "The model's answer could not be read. Try again.",
    };
    return { code: error.code, message: messages[error.code] ?? error.message };
  }
  return { code: "unknown", message: "Something went wrong while writing. Try again." };
}

interface ModelInfo {
  slug: string;
  display_name?: string;
  visibility?: string;
}

const globals = globalThis as unknown as { __recallModels?: Map<string, { at: number; models: ModelInfo[] }> };
const modelCache: Map<string, { at: number; models: ModelInfo[] }> = (globals.__recallModels ??= new Map());

async function authedFetch(userId: string, path: string, init?: RequestInit): Promise<Response> {
  const send = async (token: string) =>
    fetch(`${API}${path}`, {
      ...init,
      headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` },
    });
  let res = await send(await accessToken(userId));
  if (res.status === 401) res = await send(await accessToken(userId, true));
  return res;
}

async function failure(res: Response): Promise<AiError> {
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  const code = body?.error?.code ?? `http_${res.status}`;
  return new AiError(code, body?.error?.message ?? `The request failed (${res.status})`);
}

export async function listModels(userId: string): Promise<{ slug: string; name: string }[]> {
  const cached = modelCache.get(userId);
  if (!cached || Date.now() - cached.at > 10 * 60 * 1000) {
    const res = await authedFetch(userId, "/models");
    if (!res.ok) throw await failure(res);
    const json = (await res.json()) as { models?: ModelInfo[]; data?: { id: string }[] };
    const models = json.models ?? (json.data ?? []).map((m) => ({ slug: m.id, visibility: "list" }));
    modelCache.set(userId, { at: Date.now(), models });
  }
  return modelCache
    .get(userId)!
    .models.filter((m) => m.visibility === undefined || m.visibility === "list")
    .map((m) => ({ slug: m.slug, name: m.display_name ?? m.slug }));
}

async function chosenModel(userId: string): Promise<string> {
  const models = await listModels(userId);
  if (models.length === 0) throw new AiError("no_models", "No models are available");
  const saved = get<{ model_slug: string | null }>("select model_slug from settings where user_id = ?", userId)?.model_slug;
  return models.some((m) => m.slug === saved) ? (saved as string) : models[0].slug;
}

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** Streams one response. Resolves with the full text only after the stream reports completion. */
export async function streamText(opts: {
  userId: string;
  instructions: string;
  input: Turn[];
  onDelta?: (textSoFar: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const res = await authedFetch(opts.userId, "/responses", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    signal: opts.signal,
    body: JSON.stringify({
      model: await chosenModel(opts.userId),
      instructions: opts.instructions,
      input: opts.input,
      store: false,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) throw await failure(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let completed = false;

  const handle = (raw: string) => {
    const data = raw
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;
    let event: { type?: string; delta?: string; response?: { error?: { code?: string; message?: string } } };
    try {
      event = JSON.parse(data);
    } catch {
      return;
    }
    if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
      text += event.delta;
      opts.onDelta?.(text);
    } else if (event.type === "response.completed") {
      completed = true;
    } else if (event.type === "response.failed" || event.type === "error") {
      const err = event.response?.error ?? (event as { error?: { code?: string; message?: string } }).error;
      throw new AiError(err?.code ?? "response_failed", err?.message ?? "The model stopped before finishing");
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      handle(buffer.slice(0, cut));
      buffer = buffer.slice(cut + 2);
    }
  }
  if (buffer.trim()) handle(buffer);
  if (!completed) throw new AiError("incomplete", "The model's answer was cut off");
  return text;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object found");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Asks for a JSON object and validates it. Model output is untrusted, so anything that does not
 * match the schema is sent back once with the validation errors, then rejected.
 */
export async function generateJson<T>(opts: {
  userId: string;
  instructions: string;
  prompt: string;
  schema: z.ZodType<T>;
  shape: string;
  signal?: AbortSignal;
}): Promise<T> {
  const instructions = `${opts.instructions}\n\nReply with one JSON object and nothing else. It must match this shape exactly:\n${opts.shape}`;
  const input: Turn[] = [{ role: "user", content: opts.prompt }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await streamText({ userId: opts.userId, instructions, input, signal: opts.signal });
    let problem: string;
    try {
      const parsed = opts.schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      problem = parsed.error.issues
        .slice(0, 8)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch (error) {
      problem = error instanceof Error ? error.message : "invalid JSON";
    }
    input.push({ role: "assistant", content: text });
    input.push({ role: "user", content: `That did not match the required shape (${problem}). Send the corrected JSON object only.` });
  }
  throw new AiError("bad_output", "The model's answer did not match the expected format");
}

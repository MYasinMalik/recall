# Architecture: Recall

A free, open-source, local-first study app. This document is the plan the code is built against. Date: 2026-10-03.

## What is built so far

This document is the plan. As of 2026-10-03 the `local` mode is implemented, with these differences from the plan below:

- **Database access** uses Node's built-in `node:sqlite` with plain SQL in `src/server/repo.ts`, not Drizzle or `better-sqlite3`. It needs no native build step. Migrations are SQL files in `migrations/`.
- **API** is one validated RPC endpoint, `POST /api/rpc`, plus `POST /api/upload` and the three `/auth` routes, instead of the REST table below. Each method maps one-to-one to a function on the `DataLayer` interface and has its own Zod argument schema.
- **Progress** reaches the browser by polling about once a second while something is being written, not by server-sent events.
- **Structured output** is requested as JSON in the reply text and validated, with one repair attempt. Function tools are not used.
- **The guided lesson** is written in one request after the notes finish, not section by section.
- **Search** is a LIKE query; there is no full-text index.
- **Not built:** `owner` and `demo` modes, link and video sources, note editing and versions, export, the PDF viewer.

## Shape of the system

One codebase, three run modes, chosen by `RECALL_MODE`:

| mode | where it runs | who signs in | AI | data |
| --- | --- | --- | --- | --- |
| `local` (default) | the user's own computer, `http://127.0.0.1:4517` | Sign in with ChatGPT in the browser | the user's ChatGPT plan | SQLite file in the user's data dir |
| `owner` | your private server | you, with an owner passphrase; ChatGPT credentials imported over SSH | your ChatGPT plan | SQLite file on a persistent volume |
| `demo` | free public host | nobody | off; every AI route returns a "run it locally" message | bundled read-only SQLite file of sample lessons; progress kept in the browser only |

Why this shape: OpenAI allows ChatGPT plan usage for open-source and locally run apps, requires a `127.0.0.1` callback, and documents a self-hosted path where sign-in happens locally and credentials are copied to the server. `demo` gives a public link without needing hosted approval. If the hosted waitlist ever approves the project, a fourth multi-user mode would need Postgres and per-user isolation; nothing below blocks that, but it is not designed here.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web app | Next.js (App Router) + TypeScript, Node 22 | one process serves UI, API routes and the OAuth callback; the default the skill recommends and the most recognisable on a CV |
| styling | Tailwind, tokens from `docs/design/tokens.json` | one source for colour, type and spacing |
| mobile | none | responsive web only (native apps are out of scope) |
| database | SQLite via `better-sqlite3`, WAL mode | local-first, zero setup, one file to back up; swaps the skill's Postgres default because there is no shared server |
| ORM | Drizzle | typed queries and migrations for SQLite, and a path to Postgres later |
| auth | Sign in with ChatGPT, implemented directly (Authorization Code + PKCE, `jose` for ID token checks) | the OpenAI devkit is under a noncommercial licence and is not on npm, so it is a reference, not a dependency; the flow is about 200 lines |
| AI | OpenAI Responses API with the user's plan access token, plain `fetch` + SSE parsing | the plan-usage preview only allows `stream: true`, `store: false` and a reduced field set, so a thin wrapper is safer than an SDK that sets defaults |
| payments | none | free by design |
| email | none | no accounts beyond ChatGPT identity |
| jobs | in-process queue backed by a `jobs` table; progress to the browser over SSE | generation outlives a closed tab without needing Redis or a worker service |
| files | local disk under the data dir | uploads never leave the machine except as text sent to the model |
| PDF | `pdfjs-dist` for text extraction and the Source viewer | one library for both; no Files API on plan usage |
| editor | Tiptap (ProseMirror) with table, math (KaTeX) and code extensions | covers headings, lists, tables, equations and code; document JSON is the stored format |
| validation | Zod on every route input and every model output | model output is untrusted input |
| tests | Vitest for the data and AI layers, Playwright for the core loop | the AI layer is tested against recorded streams, so tests cost no plan usage |
| hosting | `demo` on Vercel free tier; `owner` on any small VM with a persistent disk (provider not yet chosen or price-checked) | demo is read-only so serverless is fine; owner mode needs a writable disk |
| distribution | `npm start` plus a Dockerfile | one command to run locally; the same image runs owner mode |

One database. No microservices. No vector store: sources are small enough to select chunks by page and heading.

## Schema

Tables: 22 (plus one FTS5 search index). See `docs/schema.sql`.

Access rules: data-layer checks. Every query function takes the session's `user_id` and filters on it; route handlers never touch the database directly. SQLite has no row level security, and in `local` and `owner` modes there is one user, but the owner column stays on every table so a multi-user mode is a migration, not a rewrite.

Shape of the model:

- **Lesson is the root entity.** Notes are one row per lesson; sections, cards, quiz and chats hang off the lesson.
- `lesson_sections` and `section_blocks` hold the guided lesson. A block is text, multiple choice, fill-in-the-blank or a survey question.
- `quiz_topics` added (quizzes are organised by topic, with topics switchable).
- Flashcards use Leitner boxes with two grades. `flashcard_reviews` is an append-only log, which also gives undo.
- `jobs` added for all generation.
- No share links: a share link needs a public server, which `local` mode does not have. Export covers the need.

Hard constraints, enforced in the database:

- One live job per target: partial unique index `jobs_one_live` on `dedupe_key` where status is queued or running. Double-clicking Generate cannot start two runs.
- One answer per quiz question and per lesson block: the question or block id is the primary key of the answer table.
- Autosave cannot overwrite newer text: `notes.revision` is checked on every save (`update ... where revision = ?`).
- One account per ChatGPT identity: unique `(issuer, client_id, subject)`.
- Deleting a lesson removes everything under it: every child has `on delete cascade`; folders use `set null` so deleting a folder keeps its lessons.

## Sign-in and credentials

`local` mode:

1. `GET /auth/start` creates `state`, `nonce` and a PKCE verifier (kept in server memory for 10 minutes), then redirects to `https://auth.openai.com/api/accounts/authorize` with `client_id=dynamic_agent_client` on first run (the issued id afterwards), `agent_name_hint=Recall`, `ext_agent_host_id=urn:uuid:<generated once per install>`, `redirect_uri=http://127.0.0.1:4517/auth/callback`, `resource=https://api.openai.com/v1`, and scopes `openid profile email offline_access resource.invoke chatgpt.tokens.use.direct`.
2. `GET /auth/callback` checks `state`, exchanges the code at `https://auth.openai.com/api/accounts/oauth/token`, verifies the ID token (signature against JWKS, issuer, audience, expiry, nonce, `sub`), upserts the user, stores encrypted tokens, and sets an HttpOnly, SameSite=Lax session cookie.
3. Tokens never reach browser JavaScript. The AI layer refreshes the access token shortly before expiry under a mutex so two requests cannot both spend the refresh token.

`owner` mode: `/auth/start` is disabled. `recall credentials export` on your laptop writes an encrypted file; you copy it over SSH; `recall credentials import` on the server stores it under the server's own host id. The web UI is locked behind `RECALL_OWNER_PASSPHRASE` (compared with a constant-time check, rate limited), and the server refuses to start in owner mode without both the passphrase and `RECALL_SECRET`.

The sign-in button uses OpenAI's approved "Sign in with ChatGPT" assets and wording.

## AI layer

One module, `lib/ai`, is the only code that calls OpenAI.

- `listModels()`: `GET https://api.openai.com/v1/models`, keep `visibility: "list"`.
- `streamResponse({ instructions, input, tools })`: `POST /v1/responses` with `store: false`, `stream: true`, `input` as an array. It never sends the rejected fields (`temperature`, `max_output_tokens`, `metadata`, `previous_response_id`, and the rest of the preview list) and treats the call as successful only on `response.completed`.
- Structured output: each generator declares a Zod schema and asks the model to return it through a single function tool call, which the preview supports. Output is parsed and validated; on failure there is one repair attempt with the validation errors, then the job fails with a readable message.
- No server-side conversation state exists, so every chat turn resends a trimmed history plus the selected source chunks.
- Errors `subscription_sharing_usage_limit_exceeded` and `subscription_sharing_usage_unavailable` map to a usage banner and pause the job queue rather than retrying.

Generation pipeline for a new lesson, designed so there is something to read within seconds:

1. `extract`: PDF text per page, or pasted text, or a transcript; split into chunks with page ranges.
2. `outline`: one call returns the title, summary and the section list (intro, content sections, a mid-way checkpoint, a final quiz).
3. `notes`: streamed straight into the Notes view, so there is something to read within seconds.
4. `section`: blocks for section 1 are generated immediately; later sections are generated one ahead of the reader, and on demand if opened early.
5. Flashcards and quiz are generated only when asked for, with a size or topic choice first.

## API

Route handlers under `app/`. "Signed in" means a valid session cookie; every handler resolves `user_id` from it. In `demo` mode all `POST`, `PATCH` and `DELETE` routes return 403 with a "run it locally" body.

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| GET /auth/start | begin ChatGPT sign-in | anyone (local mode) | none | redirect | sign in |
| GET /auth/callback | finish sign-in, set session | anyone with valid state | code, state | redirect to /app | sign in |
| POST /auth/owner | unlock with passphrase | anyone (owner mode) | passphrase | session cookie | sign in |
| POST /auth/signout | end session, optionally forget tokens | signed in | forget flag | 204 | sign in |
| GET /api/me | profile, plan-usage status, mode | signed in | none | user, flags | sign in |
| GET /api/models | models available on the user's plan | signed in | none | list | settings |
| PATCH /api/settings | model and theme | signed in | model_slug, theme | settings | settings |
| GET /api/lessons | library list, folder filter, search | signed in | folder, q, cursor | lessons | organise |
| POST /api/lessons | create a draft lesson from a topic, text, link or file | signed in | kind, text or url or multipart file, folder_id | lesson, setup thread | file to notes, text or link to notes, topic lesson |
| GET /api/lessons/:id | lesson overview with sections and progress | owner | none | lesson | guided lesson |
| PATCH /api/lessons/:id | rename, move to folder, set goal, familiarity, focus | owner | fields | lesson | organise |
| DELETE /api/lessons/:id | delete lesson and its files | owner | none | 204 | organise |
| POST /api/lessons/:id/generate | queue extract, outline, notes, first section | owner | focus | job ids | file to notes |
| GET /api/lessons/:id/events | SSE: job progress and streamed note text | owner | none | event stream | file to notes |
| POST /api/jobs/:id/cancel | cancel a running job | owner | none | job | file to notes |
| POST /api/jobs/:id/retry | retry a failed job | owner | none | job | file to notes |
| GET /api/folders | folder tree | signed in | none | folders | organise |
| POST /api/folders | create folder | signed in | name, parent_id | folder | organise |
| PATCH /api/folders/:id | rename or move | owner | fields | folder | organise |
| DELETE /api/folders/:id | delete folder, keep its lessons | owner | none | 204 | organise |
| GET /api/lessons/:id/note | note document | owner | none | content, revision | edit and export |
| PUT /api/lessons/:id/note | autosave | owner | content_json, revision | new revision, or 409 | edit and export |
| GET /api/lessons/:id/note/versions | version list | owner | none | versions | edit and export |
| POST /api/lessons/:id/note/versions/:vid/restore | restore a version | owner | none | note | edit and export |
| GET /api/lessons/:id/export | Markdown download (PDF is browser print) | owner | format | file | edit and export |
| GET /api/sections/:id | blocks and progress for one section | owner | none | section | guided lesson |
| POST /api/blocks/:id/answer | record an answer, return correctness and explanation | owner | chosen_index | result, points | guided lesson |
| POST /api/sections/:id/progress | mark furthest block, complete section | owner | furthest_seq | progress, next section | guided lesson |
| GET /api/lessons/:id/flashcards | deck with counts by state | owner | none | cards | flashcards |
| POST /api/lessons/:id/flashcards/generate | queue card generation | owner | count (10, 20, 30, 50), instructions | job id | flashcards |
| PATCH /api/flashcards/:id | edit text, star | owner | fields | card | flashcards |
| DELETE /api/flashcards/:id | delete card | owner | none | 204 | flashcards |
| POST /api/flashcards/:id/review | grade know or don't know | owner | knew | card | flashcards |
| POST /api/flashcards/:id/undo | undo the last review | owner | none | card | flashcards |
| GET /api/lessons/:id/quiz | topics, questions without answers, own answers | owner | none | quiz | quiz |
| POST /api/lessons/:id/quiz/generate | queue topics, then questions | owner | topic names (optional) | job id | quiz |
| PATCH /api/quiz/topics/:id | enable, disable, rename | owner | fields | topic | quiz |
| POST /api/quiz/questions/:id/answer | record answer, return correctness and explanation | owner | chosen_index, used_hint | result | quiz |
| POST /api/lessons/:id/quiz/reset | clear answers | owner | none | 204 | quiz |
| GET /api/lessons/:id/source/file | the original file for the viewer | owner | none | file stream | source viewer |
| GET /api/threads/:id/messages | chat history | owner | none | messages | chat |
| POST /api/lessons/:id/chat | send a message, stream the reply | owner | scope, section_id, text | SSE stream | chat |

Routes: 42.

Correct answers and explanations are never sent with a question; they come back only from the answer routes.

Webhooks in: none. Webhooks out: none.

Jobs (no schedules; all are triggered by the user):

| job | trigger | does |
| --- | --- | --- |
| extract | lesson created with a file, link or text | text and chunks into `source_chunks` |
| outline | generate | title, summary, section list |
| notes | after outline | streams the note document |
| section | after outline, and when the reader nears a section | blocks for one section |
| flashcards | user request | N cards |
| quiz_topics, quiz_questions | user request | topics, then questions per topic |
| housekeeping (on start) | process start | marks jobs left `running` as `failed`, deletes expired sessions, removes orphaned upload files |

External services used: OpenAI's public auth and Responses endpoints with the user's own tokens.

## The parts that bite

- **Sign-in port:** the redirect must be `http://127.0.0.1:<port>/auth/callback`. The docs say the port may vary, but whether a dynamically registered client accepts a different port on a later run is unverified. Use a fixed default (4517), fail with a clear message if it is taken, and test port changes in the vertical slice.
- **Binding:** `local` mode binds to `127.0.0.1` only, never `0.0.0.0`, so nobody on the same network can use the instance or the plan.
- **Preview API drift:** the plan-usage API is a preview. Keep every OpenAI detail inside `lib/ai` and `lib/auth`, and record real streams as test fixtures so a change shows up as a failing test.
- **Structured output:** not guaranteed by the preview. Function-call arguments are validated with Zod, repaired once, then failed visibly.
- **Long sources:** no `max_output_tokens` and no server-side state. Outline from a per-chunk digest; generate notes and sections per section with only the relevant pages. Cap uploads at 50 MB and 300 pages for the first version.
- **Scanned PDFs:** no text layer means empty extraction. Detect it (near-zero characters per page) and say so; sending page images to the model is a later option.
- **YouTube and web links:** there is no official API for another person's captions, and plan usage has no transcription. Treat link sources as best effort, offer "paste the transcript" as the fallback, and decide before milestone 3 whether an unofficial caption fetcher is acceptable.
- **Usage limits:** requests fail when the user's plan allowance runs out. Pause the queue, show the banner, keep partial results.
- **Idempotency and races:** the partial unique index stops duplicate jobs; note autosave uses a revision check; token refresh is single-flight.
- **Streaming and closed tabs:** jobs write to the database as they go; the SSE endpoint replays current state on reconnect.
- **Untrusted content:** uploaded documents can contain text aimed at the model. Source text goes in as quoted data, the model has no tools beyond the output function, and all rendered Markdown and math is sanitised.
- **Secrets:** tokens are encrypted at rest; the data dir is created with owner-only permissions; logs never contain tokens or document text.
- **Time zones:** times are stored as UTC milliseconds; "due today" for flashcards is computed in the browser's zone.
- **Search:** SQLite FTS5 over titles and note text, refreshed on save.
- **Deleting data:** "Delete my data" removes the user row (cascade), the upload files and the stored tokens. Revoking the app's access is done from the user's ChatGPT settings; link to it.
- **Demo mode:** native SQLite on a serverless host must be verified early. The fallback is exporting the demo database to static JSON at build time.
- **Not applicable:** payments, email deliverability, multi-tenancy, realtime collaboration, offline sync.

## Build order

1. **Vertical slice.** Sign in with ChatGPT, upload the lecture PDF, watch notes stream in, reopen them later. Ugly on purpose; proves sign-in, token refresh, the streaming wrapper and extraction.
   - Screens: sign-in, library, new lesson, generating, notes (read-only).
   - Tables: users, credentials, sessions, settings, lessons, sources, source_chunks, notes, jobs.
   - Routes: /auth/start, /auth/callback, /auth/signout, /api/me, /api/lessons (GET, POST), /api/lessons/:id, /api/lessons/:id/generate, /api/lessons/:id/events, /api/lessons/:id/note (GET).
2. **Must-haves**.
   - Auth edges: denied consent, ineligible plan, usage-limit banner, refresh failure. sign-in.
   - Sources: pasted text; delete lesson. new lesson.
   - Notes: math, tables and code rendering. notes.
   - Flashcards: generate and review. flashcards. Tables: flashcards, flashcard_reviews.
   - Quiz: generate, answer, score. quiz. Tables: quiz_topics, quiz_questions, quiz_answers.
   - Chat grounded in the source. chat. Tables: chat_threads, chat_messages.
3. **Should-haves**, in this order.
   - Guided lesson: outline, sections, checkpoints, final quiz, answer feedback, fill-in-the-blank. lesson overview, lesson section. Tables: lesson_sections, section_blocks, section_progress, block_responses.
   - Learn from a topic; deck size and focus before generating cards.
   - Notes editing with autosave; export. Table: note_versions.
   - Source viewer beside chat. source viewer.
   - Folders and search. folder. Tables: folders, lesson_search.
   - Model picker and settings. settings.
   - Demo mode with seeded lessons and the public landing page. landing.
   - Owner mode: passphrase lock, credential export and import, Dockerfile.
   - YouTube link source; responsive layout.
4. **Could-haves**: setup chat before generation (setup chat), warm-up and personalisation questions, points and accuracy, quiz hints and topic settings, version history UI, starred cards, per-card regeneration, web page sources, Word upload, podcast script with browser speech, bring-your-own API key.

Ship check for each milestone: the Playwright run of the core loop passes against recorded AI streams.

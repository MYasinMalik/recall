-- Recall schema. SQLite (one file per install), first migration.
-- Conventions: ids are UUID v4 text generated in the app; times are integer
-- unix milliseconds in UTC; booleans are 0/1; json columns hold validated JSON text.
-- Access rule: every query goes through the data layer, which takes the session's
-- user_id and filters on it. No table is read without an owner check.

pragma journal_mode = wal;
pragma foreign_keys = on;

-- ---------------------------------------------------------------- identity

create table users (
  id          text primary key,
  issuer      text not null,              -- https://auth.openai.com
  client_id   text not null,              -- issued by dynamic registration
  subject     text not null,              -- ID token sub
  email       text,
  name        text,
  picture_url text,
  created_at  integer not null,
  updated_at  integer not null,
  unique (issuer, client_id, subject)
);

-- One row per user. Tokens are AES-256-GCM encrypted with RECALL_SECRET.
create table credentials (
  user_id           text primary key references users(id) on delete cascade,
  host_id           text not null,         -- ext_agent_host_id of THIS install, never copied
  client_id         text not null,
  access_token_enc  blob not null,
  refresh_token_enc blob not null,
  scopes            text not null,
  expires_at        integer not null,
  plan_usage        integer not null default 0 check (plan_usage in (0,1)),
  created_at        integer not null,
  updated_at        integer not null
);

create table sessions (
  id          text primary key,            -- random 32 bytes, stored hashed
  user_id     text not null references users(id) on delete cascade,
  expires_at  integer not null,
  created_at  integer not null
);
create index sessions_user on sessions (user_id);
create index sessions_expiry on sessions (expires_at);

create table settings (
  user_id     text primary key references users(id) on delete cascade,
  model_slug  text,                        -- chosen from GET /v1/models
  theme       text not null default 'system' check (theme in ('system','light','dark')),
  updated_at  integer not null
);

-- ---------------------------------------------------------------- library

create table folders (
  id          text primary key,
  user_id     text not null references users(id) on delete cascade,
  parent_id   text references folders(id) on delete cascade,
  name        text not null check (length(name) between 1 and 120),
  created_at  integer not null,
  updated_at  integer not null
);
create index folders_user on folders (user_id, parent_id);

-- The core unit. Notes, sections, cards, quiz and chats all hang off a lesson.
create table lessons (
  id            text primary key,
  user_id       text not null references users(id) on delete cascade,
  folder_id     text references folders(id) on delete set null,
  title         text not null,
  summary       text,
  status        text not null default 'draft'
                check (status in ('draft','generating','ready','failed')),
  goal          text check (goal in ('exam','assignment','new','other')),
  familiarity   text check (familiarity in ('new','some','good','expert')),
  focus         text,                      -- optional steering typed before generation
  model_slug    text,
  points        integer not null default 0,
  last_opened_at integer,
  created_at    integer not null,
  updated_at    integer not null
);
create index lessons_user_recent on lessons (user_id, updated_at desc);
create index lessons_folder on lessons (folder_id);

create table sources (
  id            text primary key,
  lesson_id     text not null references lessons(id) on delete cascade,
  user_id       text not null references users(id) on delete cascade,
  kind          text not null check (kind in ('pdf','text','youtube','web','topic')),
  filename      text,
  url           text,
  file_path     text,                      -- relative path under the data dir
  byte_size     integer,
  sha256        text,
  page_count    integer,
  status        text not null default 'pending'
                check (status in ('pending','extracting','ready','failed')),
  error         text,
  created_at    integer not null,
  updated_at    integer not null
);
create index sources_lesson on sources (lesson_id);
create index sources_user_hash on sources (user_id, sha256);

-- Extracted text, split so prompts can cite and select pages.
create table source_chunks (
  id          text primary key,
  source_id   text not null references sources(id) on delete cascade,
  seq         integer not null,
  page_from   integer,
  page_to     integer,
  text        text not null,
  token_estimate integer not null,
  unique (source_id, seq)
);

-- ---------------------------------------------------------------- notes

create table notes (
  lesson_id    text primary key references lessons(id) on delete cascade,
  user_id      text not null references users(id) on delete cascade,
  content_json text not null,              -- editor document
  content_md   text not null,              -- derived on save; used for prompts, search, export
  revision     integer not null default 1, -- optimistic lock for autosave
  updated_at   integer not null
);

create table note_versions (
  id           text primary key,
  lesson_id    text not null references lessons(id) on delete cascade,
  content_json text not null,
  reason       text not null check (reason in ('generated','manual','autosnapshot')),
  created_at   integer not null
);
create index note_versions_lesson on note_versions (lesson_id, created_at desc);

-- Full-text search over titles and note text.
create virtual table lesson_search using fts5 (lesson_id unindexed, user_id unindexed, title, body);

-- ---------------------------------------------------------------- guided lesson

create table lesson_sections (
  id          text primary key,
  lesson_id   text not null references lessons(id) on delete cascade,
  seq         integer not null,
  kind        text not null check (kind in ('intro','content','checkpoint','final')),
  title       text not null,
  brief       text,                        -- outline line the blocks are generated from
  status      text not null default 'pending'
              check (status in ('pending','generating','ready','failed')),
  unique (lesson_id, seq)
);

create table section_blocks (
  id          text primary key,
  section_id  text not null references lesson_sections(id) on delete cascade,
  seq         integer not null,
  kind        text not null check (kind in ('text','mcq','fill_blank','survey')),
  body_md     text,                        -- text blocks, and the stem of questions
  options     text,                        -- json array of strings for mcq / fill_blank / survey
  answer_index integer,                    -- null for text and survey
  explanation text,
  unique (section_id, seq)
);

create table section_progress (
  section_id   text primary key references lesson_sections(id) on delete cascade,
  user_id      text not null references users(id) on delete cascade,
  furthest_seq integer not null default 0,
  correct      integer not null default 0,
  answered     integer not null default 0,
  completed_at integer,
  updated_at   integer not null
);

create table block_responses (
  block_id     text primary key references section_blocks(id) on delete cascade,
  user_id      text not null references users(id) on delete cascade,
  chosen_index integer not null,
  is_correct   integer check (is_correct in (0,1)),   -- null for survey blocks
  answered_at  integer not null
);

-- ---------------------------------------------------------------- flashcards

create table flashcards (
  id          text primary key,
  lesson_id   text not null references lessons(id) on delete cascade,
  user_id     text not null references users(id) on delete cascade,
  front       text not null,
  back        text not null,
  starred     integer not null default 0 check (starred in (0,1)),
  box         integer not null default 0 check (box between 0 and 5),  -- Leitner box; 0 = new
  due_at      integer,                     -- null until first graded
  reps        integer not null default 0,
  lapses      integer not null default 0,
  created_at  integer not null,
  updated_at  integer not null
);
create index flashcards_lesson on flashcards (lesson_id);
create index flashcards_due on flashcards (user_id, due_at);

-- Append-only log: gives undo, and a history chart later.
create table flashcard_reviews (
  id          text primary key,
  card_id     text not null references flashcards(id) on delete cascade,
  knew        integer not null check (knew in (0,1)),
  box_before  integer not null,
  box_after   integer not null,
  reviewed_at integer not null
);
create index flashcard_reviews_card on flashcard_reviews (card_id, reviewed_at desc);

-- ---------------------------------------------------------------- quiz

create table quiz_topics (
  id          text primary key,
  lesson_id   text not null references lessons(id) on delete cascade,
  name        text not null,
  enabled     integer not null default 1 check (enabled in (0,1)),
  seq         integer not null,
  unique (lesson_id, name)
);

create table quiz_questions (
  id           text primary key,
  lesson_id    text not null references lessons(id) on delete cascade,
  topic_id     text not null references quiz_topics(id) on delete cascade,
  seq          integer not null,
  prompt_md    text not null,
  options      text not null,              -- json array of 4 strings
  answer_index integer not null check (answer_index between 0 and 3),
  hint         text,
  explanation  text not null
);
create index quiz_questions_lesson on quiz_questions (lesson_id, seq);

-- One live answer per question; "Reset quiz" deletes the lesson's rows.
create table quiz_answers (
  question_id  text primary key references quiz_questions(id) on delete cascade,
  user_id      text not null references users(id) on delete cascade,
  chosen_index integer not null,
  is_correct   integer not null check (is_correct in (0,1)),
  used_hint    integer not null default 0 check (used_hint in (0,1)),
  answered_at  integer not null
);

-- ---------------------------------------------------------------- chat

create table chat_threads (
  id          text primary key,
  lesson_id   text not null references lessons(id) on delete cascade,
  user_id     text not null references users(id) on delete cascade,
  scope       text not null check (scope in ('setup','notes','source','section')),
  section_id  text references lesson_sections(id) on delete cascade,
  created_at  integer not null,
  unique (lesson_id, scope, section_id)
);

create table chat_messages (
  id          text primary key,
  thread_id   text not null references chat_threads(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content_md  text not null,
  status      text not null default 'complete'
              check (status in ('streaming','complete','failed')),
  created_at  integer not null
);
create index chat_messages_thread on chat_messages (thread_id, created_at);

-- ---------------------------------------------------------------- jobs

-- Every AI generation is a job, so it survives a closed tab and can be resumed or retried.
create table jobs (
  id           text primary key,
  user_id      text not null references users(id) on delete cascade,
  lesson_id    text not null references lessons(id) on delete cascade,
  kind         text not null check (kind in
               ('extract','outline','notes','section','flashcards','quiz_topics','quiz_questions')),
  target_id    text,                       -- section id, topic id, etc.
  dedupe_key   text not null,              -- kind + target; one live job per key
  status       text not null default 'queued'
               check (status in ('queued','running','done','failed','cancelled')),
  progress     integer not null default 0 check (progress between 0 and 100),
  step_label   text,
  error_code   text,                       -- e.g. subscription_sharing_usage_limit_exceeded
  attempts     integer not null default 0,
  created_at   integer not null,
  started_at   integer,
  finished_at  integer
);
create index jobs_lesson on jobs (lesson_id, created_at desc);
create unique index jobs_one_live on jobs (dedupe_key) where status in ('queued','running');

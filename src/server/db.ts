import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { DATA_DIR, ensureDataDir } from "./env";

const globals = globalThis as unknown as { __recallDb?: DatabaseSync };

function open(): DatabaseSync {
  ensureDataDir();
  const db = new DatabaseSync(join(DATA_DIR, "recall.db"));
  db.exec("pragma journal_mode = wal; pragma foreign_keys = on; pragma busy_timeout = 5000;");
  db.exec("create table if not exists _migrations (name text primary key, applied_at integer not null)");
  const dir = join(process.cwd(), "migrations");
  const applied = new Set(db.prepare("select name from _migrations").all().map((r) => r.name as string));
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (applied.has(file)) continue;
    db.exec("begin");
    try {
      db.exec(readFileSync(join(dir, file), "utf8"));
      db.prepare("insert into _migrations (name, applied_at) values (?, ?)").run(file, Date.now());
      db.exec("commit");
    } catch (error) {
      db.exec("rollback");
      throw error;
    }
  }
  // Jobs cannot survive a restart: anything left mid-run is marked as stopped.
  db.exec("update jobs set status = 'failed', error_code = 'interrupted' where status in ('queued','running')");
  db.exec("update lessons set status = 'failed' where status = 'generating'");
  db.exec("update chat_messages set status = 'failed' where status = 'streaming'");
  db.prepare("delete from sessions where expires_at < ?").run(Date.now());
  return db;
}

export function db(): DatabaseSync {
  return (globals.__recallDb ??= open());
}

type Row = Record<string, unknown>;

export const all = <T = Row>(sql: string, ...params: SQLInputValue[]) =>
  db().prepare(sql).all(...params) as T[];
export const get = <T = Row>(sql: string, ...params: SQLInputValue[]) =>
  db().prepare(sql).get(...params) as T | undefined;
export const run = (sql: string, ...params: SQLInputValue[]) => db().prepare(sql).run(...params);

export function transaction<T>(fn: () => T): T {
  db().exec("begin immediate");
  try {
    const result = fn();
    db().exec("commit");
    return result;
  } catch (error) {
    db().exec("rollback");
    throw error;
  }
}

export const uid = () => randomUUID();
export const now = () => Date.now();

export function getMeta(key: string): string | undefined {
  return get<{ value: string }>("select value from meta where key = ?", key)?.value;
}
export function setMeta(key: string, value: string) {
  run("insert into meta (key, value) values (?, ?) on conflict(key) do update set value = excluded.value", key, value);
}

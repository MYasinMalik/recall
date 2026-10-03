import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const PORT = Number(process.env.PORT ?? 4517);
export const ORIGIN = `http://127.0.0.1:${PORT}`;
export const DATA_DIR = process.env.RECALL_DATA_DIR ?? join(homedir(), ".recall");
export const UPLOAD_DIR = join(DATA_DIR, "uploads");

export function ensureDataDir() {
  mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o700 });
}

let cachedSecret: Buffer | null = null;

/** 32-byte key for encrypting tokens at rest. From RECALL_SECRET, or generated once per install. */
export function secretKey(): Buffer {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.RECALL_SECRET;
  if (fromEnv) {
    const key = Buffer.from(fromEnv, "base64");
    if (key.length !== 32) throw new Error("RECALL_SECRET must be 32 bytes, base64 encoded");
    return (cachedSecret = key);
  }
  ensureDataDir();
  const file = join(DATA_DIR, "secret.key");
  if (!existsSync(file)) {
    writeFileSync(file, randomBytes(32).toString("base64"), { mode: 0o600 });
    try {
      chmodSync(file, 0o600);
    } catch {
      // Windows ignores POSIX modes; the file sits in the user's own profile directory.
    }
  }
  return (cachedSecret = Buffer.from(readFileSync(file, "utf8").trim(), "base64"));
}

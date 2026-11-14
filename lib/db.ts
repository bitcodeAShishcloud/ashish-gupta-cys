/* Turso (libSQL) data layer — multi-user device-token auth.
 *
 * The client reads TURSO_DATABASE_URL + TURSO_AUTH_TOKEN from env. Both are
 * required; if either is missing, all DB calls throw and the chat falls back
 * to localStorage (offline mode).
 *
 * Schema is created lazily on first connection via ensureSchema().
 */

import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;

export function getDb(): Client | null {
  if (_client) return _client;
  // Accept a few common env-var names so the user doesn't have to guess
  // which exact one the code expects.
  const url =
    process.env.TURSO_DATABASE_URL ||
    process.env.TURSO_URL ||
    process.env.TURSO_DB_URL ||
    process.env.LIBSQL_URL;
  const token =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.TURSO_API_KEY ||
    process.env.TURSO_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN;
  if (!url || !token) {
    return null;
  }
  _client = createClient({ url, authToken: token });
  return _client;
}

export function dbEnvStatus(): { url: boolean; token: boolean } {
  return {
    url: Boolean(
      process.env.TURSO_DATABASE_URL ||
        process.env.TURSO_URL ||
        process.env.TURSO_DB_URL ||
        process.env.LIBSQL_URL,
    ),
    token: Boolean(
      process.env.TURSO_AUTH_TOKEN ||
        process.env.TURSO_API_KEY ||
        process.env.TURSO_TOKEN ||
        process.env.LIBSQL_AUTH_TOKEN,
    ),
  };
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

let _schemaReady = false;

export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return;
  const db = getDb();
  if (!db) return;
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      device_name TEXT,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Untitled',
      mode TEXT NOT NULL DEFAULT 'chat',
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'text',
      mail INTEGER NOT NULL DEFAULT 0,
      sources TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at);
  `);
  _schemaReady = true;
}

export function now(): number {
  return Date.now();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function safeJson(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

export function parseJson<T>(s: string | null): T | undefined {
  if (!s) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

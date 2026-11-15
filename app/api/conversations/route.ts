// GET  /api/conversations  → list user's conversations (newest first)
// POST /api/conversations  { title?, mode?, id? } → create a conversation
//
// Auth: X-Device-Token header (the device token is the user identity).
// Only the SHA-256 hash of the token is stored or queried (userIdForToken).

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema, now, newId, userIdForToken } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function deviceToken(req: NextRequest): string | null {
  const t = req.headers.get("x-device-token");
  if (!t || t.length < 8) return null;
  return t;
}

export async function GET(req: NextRequest) {
  if (!rateLimit("conv-list:" + clientIp(req), 30)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const token = deviceToken(req);
  if (!token) {
    return NextResponse.json({ error: "no_device" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    const res = await db.execute({
      sql: `SELECT c.id, c.title, c.mode, c.pinned, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS msg_count
            FROM conversations c
            WHERE c.user_id = ?
            ORDER BY c.pinned DESC, c.updated_at DESC`,
      args: [userIdForToken(token)],
    });
    const conversations = res.rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      mode: String(r.mode),
      pinned: Number(r.pinned) === 1,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      messageCount: Number(r.msg_count),
    }));
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[conversations GET]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!rateLimit("conv-create:" + clientIp(req), 20)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const token = deviceToken(req);
  if (!token) {
    return NextResponse.json({ error: "no_device" }, { status: 400 });
  }
  const body = await readJsonBody(req);
  const requested = String(body.id ?? "").trim();
  // Client-supplied ids are primary keys — bound their shape. An unbounded or
  // colliding id would surface as a raw 503 (and act as a cross-user
  // existence oracle); anything malformed is rejected up front.
  const id = requested || newId();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const title = String(body.title ?? "Untitled").trim().slice(0, 80) || "Untitled";
  const mode = ["chat", "image", "video"].includes(String(body.mode)) ? String(body.mode) : "chat";

  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    // Ensure user exists
    await db.execute({
      sql: "INSERT OR IGNORE INTO users (id, created_at, last_seen) VALUES (?, ?, ?)",
      args: [userIdForToken(token), now(), now()],
    });
    try {
      await db.execute({
        sql: `INSERT INTO conversations (id, user_id, title, mode, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, userIdForToken(token), title, mode, now(), now()],
      });
    } catch (insertErr) {
      const e = insertErr as { message?: string };
      if (e?.message && /UNIQUE|PRIMARY KEY/i.test(e.message)) {
        return NextResponse.json({ error: "already_exists" }, { status: 409 });
      }
      throw insertErr;
    }
    return NextResponse.json({ id, title, mode, createdAt: now() });
  } catch (err) {
    console.error("[conversations POST]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

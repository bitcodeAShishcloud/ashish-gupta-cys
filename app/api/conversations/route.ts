// GET  /api/conversations  → list user's conversations (newest first)
// POST /api/conversations  { title?, mode?, id? } → create a conversation
//
// Auth: X-Device-Token header (the device token is the user identity).

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema, now, newId } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function deviceToken(req: NextRequest): string | null {
  const t = req.headers.get("x-device-token");
  if (!t || t.length < 8) return null;
  return t;
}

export async function GET(req: NextRequest) {
  const token = deviceToken(req);
  if (!token) {
    return NextResponse.json({ error: "no_device" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const db = getDb();
    const res = await db.execute({
      sql: `SELECT c.id, c.title, c.mode, c.pinned, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS msg_count
            FROM conversations c
            WHERE c.user_id = ?
            ORDER BY c.pinned DESC, c.updated_at DESC`,
      args: [token],
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
  const id = String(body.id ?? "").trim() || newId();
  const title = String(body.title ?? "Untitled").trim().slice(0, 80) || "Untitled";
  const mode = ["chat", "image", "video"].includes(String(body.mode)) ? String(body.mode) : "chat";

  try {
    await ensureSchema();
    const db = getDb();
    // Ensure user exists
    await db.execute({
      sql: "INSERT OR IGNORE INTO users (id, created_at, last_seen) VALUES (?, ?, ?)",
      args: [token, now(), now()],
    });
    await db.execute({
      sql: `INSERT INTO conversations (id, user_id, title, mode, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, token, title, mode, now(), now()],
    });
    return NextResponse.json({ id, title, mode, createdAt: now() });
  } catch (err) {
    console.error("[conversations POST]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

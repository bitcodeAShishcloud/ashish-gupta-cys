// POST /api/conversations/[id]/messages  → append a message
// GET  /api/conversations/[id]/messages  → list messages (already in GET conversation, but kept for clarity)

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema, now } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function deviceToken(req: NextRequest): string | null {
  const t = req.headers.get("x-device-token");
  if (!t || t.length < 8) return null;
  return t;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = deviceToken(req);
  if (!token) return NextResponse.json({ error: "no_device" }, { status: 400 });
  if (!rateLimit("conv-msg:" + clientIp(req), 60)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await readJsonBody(req);
  const role = body.role === "assistant" ? "assistant" : "user";
  const content = String(body.content ?? "").trim().slice(0, 12000);
  if (!content) return NextResponse.json({ error: "no_content" }, { status: 400 });
  const kind = ["text", "image", "video"].includes(String(body.kind)) ? String(body.kind) : "text";
  const mail = body.mail === true ? 1 : 0;
  const sources = body.sources ? JSON.stringify(body.sources) : null;
  try {
    await ensureSchema();
    const db = getDb();
    const own = await db.execute({
      sql: "SELECT 1 FROM conversations WHERE id = ? AND user_id = ?",
      args: [id, token],
    });
    if (own.rows.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const res = await db.execute({
      sql: `INSERT INTO messages (conversation_id, role, content, kind, mail, sources, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, role, content, kind, mail, sources, now()],
    });
    // Touch conversation updated_at
    await db.execute({
      sql: "UPDATE conversations SET updated_at = ? WHERE id = ?",
      args: [now(), id],
    });
    return NextResponse.json({ id: Number(res.lastInsertRowid) });
  } catch (err) {
    console.error("[conv/messages POST]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

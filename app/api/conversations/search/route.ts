// GET /api/conversations/search?q=...  → search conversations by title + message content
import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function deviceToken(req: NextRequest): string | null {
  const t = req.headers.get("x-device-token");
  if (!t || t.length < 8) return null;
  return t;
}

export async function GET(req: NextRequest) {
  const token = deviceToken(req);
  if (!token) return NextResponse.json({ error: "no_device" }, { status: 400 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!q) {
    // Return all conversations if no query
    const res = await getDb().execute({
      sql: `SELECT c.id, c.title, c.mode, c.pinned, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS msg_count
            FROM conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC`,
      args: [token],
    });
    return NextResponse.json({
      conversations: res.rows.map((r) => ({
        id: String(r.id), title: String(r.title), mode: String(r.mode),
        pinned: Number(r.pinned) === 1, createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at), messageCount: Number(r.msg_count),
      })),
    });
  }
  try {
    await ensureSchema();
    const db = getDb();
    // Search in titles and message content
    const res = await db.execute({
      sql: `SELECT DISTINCT c.id, c.title, c.mode, c.pinned, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS msg_count
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.user_id = ? AND (c.title LIKE ? OR m.content LIKE ?)
            ORDER BY c.updated_at DESC`,
      args: [token, `%${q}%`, `%${q}%`],
    });
    return NextResponse.json({
      conversations: res.rows.map((r) => ({
        id: String(r.id), title: String(r.title), mode: String(r.mode),
        pinned: Number(r.pinned) === 1, createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at), messageCount: Number(r.msg_count),
      })),
    });
  } catch (err) {
    console.error("[conversations/search]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

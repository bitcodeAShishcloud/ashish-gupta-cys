// GET /api/admin/ai/conversations  → list ALL conversations (all users) with previews.
// Admin session required.

import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, adminConfigured } from "@/lib/admin-auth";
import { clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(req: NextRequest) {
  if (!adminConfigured() || !isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!rateLimit("admin-ai-convs:" + clientIp(req), 20)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") || null;
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    const sql = userId
      ? `SELECT c.id, c.user_id, c.title, c.mode, c.pinned, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS msg_count
         FROM conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC`
      : `SELECT c.id, c.user_id, c.title, c.mode, c.pinned, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS msg_count
         FROM conversations c ORDER BY c.updated_at DESC`;
    const res = await db.execute({ sql, args: userId ? [userId] : [] });
    return NextResponse.json({
      conversations: res.rows.map((r) => ({
        id: String(r.id),
        userId: String(r.user_id),
        title: String(r.title),
        mode: String(r.mode),
        pinned: Number(r.pinned) === 1,
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
        messageCount: Number(r.msg_count),
      })),
    });
  } catch (err) {
    console.error("[admin/ai/conversations]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

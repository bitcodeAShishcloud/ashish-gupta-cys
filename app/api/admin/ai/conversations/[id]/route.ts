// GET /api/admin/ai/conversations/[id]  → full conversation + messages (admin view).
// Admin session required.

import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, adminConfigured } from "@/lib/admin-auth";
import { clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!adminConfigured() || !isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!rateLimit("admin-ai-conv-detail:" + clientIp(req), 20)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { id } = await params;
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    const convRes = await db.execute({
      sql: `SELECT c.id, c.user_id, c.title, c.mode, c.pinned, c.created_at, c.updated_at,
                   u.device_name
            FROM conversations c LEFT JOIN users u ON u.id = c.user_id
            WHERE c.id = ?`,
      args: [id],
    });
    if (convRes.rows.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const conv = convRes.rows[0];
    const msgRes = await db.execute({
      sql: "SELECT id, role, content, kind, mail, sources, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [id],
    });
    return NextResponse.json({
      conversation: {
        id: String(conv.id),
        userId: String(conv.user_id),
        deviceName: String(conv.device_name ?? ""),
        title: String(conv.title),
        mode: String(conv.mode),
        pinned: Number(conv.pinned) === 1,
        createdAt: Number(conv.created_at),
        updatedAt: Number(conv.updated_at),
      },
      messages: msgRes.rows.map((r) => ({
        id: Number(r.id),
        role: String(r.role),
        content: String(r.content),
        kind: String(r.kind),
        mail: Number(r.mail) === 1,
        sources: r.sources ? JSON.parse(String(r.sources)) : undefined,
        createdAt: Number(r.created_at),
      })),
    });
  } catch (err) {
    console.error("[admin/ai/conversations/:id]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

// GET /api/admin/ai/users  → list all device-token users with conversation/message counts.
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
  if (!rateLimit("admin-ai-users:" + clientIp(req), 10)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  try {
    await ensureSchema();
    const db = getDb();
    const res = await db.execute({
      sql: `SELECT u.id, u.device_name, u.created_at, u.last_seen,
                   (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) AS conv_count,
                   (SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = u.id) AS msg_count
            FROM users u
            ORDER BY u.last_seen DESC`,
      args: [],
    });
    return NextResponse.json({
      users: res.rows.map((r) => ({
        id: String(r.id),
        deviceName: String(r.device_name ?? ""),
        createdAt: Number(r.created_at),
        lastSeen: Number(r.last_seen),
        conversationCount: Number(r.conv_count),
        messageCount: Number(r.msg_count),
      })),
    });
  } catch (err) {
    console.error("[admin/ai/users]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

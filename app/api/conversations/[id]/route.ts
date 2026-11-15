// GET    /api/conversations/[id]  → conversation + its messages
// PATCH  /api/conversations/[id]  { title?, pinned?, mode? } → update
// DELETE /api/conversations/[id]  → delete conversation + messages

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema, now, userIdForToken } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function deviceToken(req: NextRequest): string | null {
  const t = req.headers.get("x-device-token");
  if (!t || t.length < 8) return null;
  return t;
}

async function ownsConversation(db: ReturnType<typeof getDb>, id: string, token: string): Promise<boolean> {
  const res = await db.execute({
    sql: "SELECT 1 FROM conversations WHERE id = ? AND user_id = ?",
    args: [id, userIdForToken(token)],
  });
  return res.rows.length > 0;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit("conv-read:" + clientIp(req), 60)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { id } = await params;
  const token = deviceToken(req);
  if (!token) return NextResponse.json({ error: "no_device" }, { status: 400 });
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    if (!(await ownsConversation(db, id, token))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const convRes = await db.execute({
      sql: "SELECT id, title, mode, pinned, created_at, updated_at FROM conversations WHERE id = ?",
      args: [id],
    });
    const msgRes = await db.execute({
      sql: "SELECT id, role, content, kind, mail, sources, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [id],
    });
    const conv = convRes.rows[0];
    return NextResponse.json({
      conversation: {
        id: String(conv.id),
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
    console.error("[conversations/:id GET]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit("conv-write:" + clientIp(req), 30)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { id } = await params;
  const token = deviceToken(req);
  if (!token) return NextResponse.json({ error: "no_device" }, { status: 400 });
  const body = await readJsonBody(req);
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    if (!(await ownsConversation(db, id, token))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const fields: string[] = [];
    const args: (string | number)[] = [];
    if (typeof body.title === "string") {
      fields.push("title = ?");
      args.push(body.title.trim().slice(0, 80) || "Untitled");
    }
    if (typeof body.pinned === "boolean") {
      fields.push("pinned = ?");
      args.push(body.pinned ? 1 : 0);
    }
    if (typeof body.mode === "string" && ["chat", "image", "video"].includes(body.mode)) {
      fields.push("mode = ?");
      args.push(body.mode);
    }
    if (fields.length === 0) {
      return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
    }
    fields.push("updated_at = ?");
    args.push(now());
    args.push(id);
    await db.execute({ sql: `UPDATE conversations SET ${fields.join(", ")} WHERE id = ?`, args });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[conversations/:id PATCH]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit("conv-write:" + clientIp(req), 30)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { id } = await params;
  const token = deviceToken(req);
  if (!token) return NextResponse.json({ error: "no_device" }, { status: 400 });
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    if (!(await ownsConversation(db, id, token))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await db.execute({ sql: "DELETE FROM conversations WHERE id = ?", args: [id] });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[conversations/:id DELETE]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

// POST /api/conversations/[id]/messages  → append a message
// GET  /api/conversations/[id]/messages  → list messages (already in GET conversation, but kept for clarity)

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
  const kind = ["text", "image", "video"].includes(String(body.kind)) ? String(body.kind) : "text";
  // Media messages legitimately have empty text — their payload is the URL.
  if (!content && kind === "text") {
    return NextResponse.json({ error: "no_content" }, { status: 400 });
  }
  const mail = body.mail === true ? 1 : 0;
  /* Media is persisted as URL + metadata ONLY (never base64 bytes): the
   * server never fetches provider media, so this stays CSP-safe and tiny. */
  const mediaUrl = (v: unknown, allowLocal = false): string | null => {
    if (typeof v !== "string" || !v) return null;
    const s = v.trim().slice(0, 2000);
    if (/^https:\/\//i.test(s)) return s;
    if (allowLocal && s.startsWith("/api/image/download?")) return s;
    return null;
  };
  const imageUrl = mediaUrl(body.imageUrl, true);
  const videoUrl = mediaUrl(body.videoUrl);
  const jobId = typeof body.jobId === "string" ? body.jobId.trim().slice(0, 200) || null : null;
  let meta: string | null = null;
  if (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) {
    const m = body.meta as Record<string, unknown>;
    meta = JSON.stringify({
      prompt: String(m.prompt ?? "").slice(0, 1000),
      aspect: String(m.aspect ?? "").slice(0, 40),
      style: m.style == null ? undefined : String(m.style).slice(0, 80),
      tier: m.tier == null ? undefined : String(m.tier).slice(0, 40),
      seconds: m.seconds == null ? undefined : String(m.seconds).slice(0, 20),
      revisedPrompt: m.revisedPrompt == null ? undefined : String(m.revisedPrompt).slice(0, 1000),
      createdAt: typeof m.createdAt === "number" ? m.createdAt : undefined,
    });
  }
  /* sources must be a bounded array of {title,url} strings — the column is
   * client-writable, so an unbounded payload would let any token holder pour
   * arbitrary bytes into the owner's Turso storage per request. */
  let sources: string | null = null;
  if (Array.isArray(body.sources)) {
    const cleaned = body.sources
      .slice(0, 8)
      .map((s) => {
        const item = (s ?? {}) as { title?: unknown; url?: unknown };
        return {
          title: String(item.title ?? "").slice(0, 200),
          url: String(item.url ?? "").slice(0, 500),
        };
      })
      .filter((s) => s.title || s.url);
    if (cleaned.length > 0) sources = JSON.stringify(cleaned);
  }
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    const own = await db.execute({
      sql: "SELECT 1 FROM conversations WHERE id = ? AND user_id = ?",
      args: [id, userIdForToken(token)],
    });
    if (own.rows.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const res = await db.execute({
      sql: `INSERT INTO messages (conversation_id, role, content, kind, mail, sources,
                                  image_url, video_url, job_id, meta, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, role, content, kind, mail, sources, imageUrl, videoUrl, jobId, meta, now()],
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

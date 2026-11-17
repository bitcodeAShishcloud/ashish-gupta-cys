// GET /api/admin/ai/backup — full dataset export (admin only).
//
// Includes every device, conversation and message (text + image/video URLs +
// metadata + mail + sources) plus the provider registry. Provider API keys are
// copied VERBATIM from the DB — Phase 9 stores them as `enc:v1:...` ciphertext,
// so a leaked backup yields no usable keys. This route never decrypts them.

import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, adminConfigured } from "@/lib/admin-auth";
import { clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseJson(raw: unknown): unknown {
  if (raw == null) return undefined;
  try {
    return JSON.parse(String(raw));
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  if (!adminConfigured() || !isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Large payload — tighter limit than the list endpoints.
  if (!rateLimit("admin-ai-backup:" + clientIp(req), 3)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });

    const usersRes = await db.execute(
      "SELECT id, device_name, created_at, last_seen FROM users ORDER BY last_seen DESC",
    );
    const convRes = await db.execute(
      "SELECT id, user_id, title, mode, pinned, created_at, updated_at FROM conversations ORDER BY updated_at DESC",
    );
    const msgRes = await db.execute(
      `SELECT id, conversation_id, role, content, kind, mail, sources,
              image_url, video_url, job_id, meta, created_at
       FROM messages ORDER BY created_at ASC`,
    );
    const providerRes = await db.execute(
      "SELECT id, name, base_url, api_key, model, protocol, type, active, context_window, max_output FROM providers ORDER BY created_at ASC",
    );

    const messagesByConv = new Map<string, unknown[]>();
    for (const r of msgRes.rows) {
      const cid = String(r.conversation_id);
      const list = messagesByConv.get(cid) ?? [];
      list.push({
        id: Number(r.id),
        role: String(r.role),
        content: String(r.content),
        kind: String(r.kind),
        mail: Number(r.mail) === 1,
        sources: parseJson(r.sources),
        imageUrl: r.image_url ? String(r.image_url) : undefined,
        videoUrl: r.video_url ? String(r.video_url) : undefined,
        jobId: r.job_id ? String(r.job_id) : undefined,
        meta: parseJson(r.meta),
        createdAt: Number(r.created_at),
      });
      messagesByConv.set(cid, list);
    }

    const convsByUser = new Map<string, unknown[]>();
    for (const r of convRes.rows) {
      const uid = String(r.user_id);
      const list = convsByUser.get(uid) ?? [];
      list.push({
        id: String(r.id),
        title: String(r.title),
        mode: String(r.mode),
        pinned: Number(r.pinned) === 1,
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
        messages: messagesByConv.get(String(r.id)) ?? [],
      });
      convsByUser.set(uid, list);
    }

    const users = usersRes.rows.map((r) => ({
      // The id IS the SHA-256 hash of the device token — never the raw token.
      id: String(r.id),
      deviceName: String(r.device_name ?? ""),
      createdAt: Number(r.created_at),
      lastSeen: Number(r.last_seen),
      conversations: convsByUser.get(String(r.id)) ?? [],
    }));

    const providers = providerRes.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      baseUrl: String(r.base_url),
      // Raw DB value: `enc:v1:...` ciphertext. NEVER decrypt in a backup.
      apiKey: String(r.api_key ?? ""),
      model: String(r.model),
      protocol: String(r.protocol ?? "openai"),
      type: String(r.type ?? "chat"),
      active: Number(r.active) === 1,
      contextWindow: r.context_window == null ? undefined : Number(r.context_window),
      maxOutput: r.max_output == null ? undefined : Number(r.max_output),
    }));

    const payload = {
      format: "ashish-portfolio-full-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      note: "Provider apiKey values are AES-256-GCM ciphertext; restore requires PROVIDER_ENCRYPTION_KEY. Media is stored as URL + metadata only.",
      stats: {
        users: users.length,
        conversations: convRes.rows.length,
        messages: msgRes.rows.length,
        providers: providers.length,
      },
      users,
      providers,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="ashish-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error("[admin/ai/backup]", (err as Error).message?.slice(0, 200));
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

// GET  /api/admin/providers — list all DB providers (keys masked)
// POST /api/admin/providers — add a provider (key encrypted at rest)
// Admin session required. Rate-limited.

import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, adminConfigured } from "@/lib/admin-auth";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema, now, newId } from "@/lib/db";
import { encryptKey, encryptionConfigured, isEncrypted } from "@/lib/crypto";
import { validateProviderUrl } from "@/lib/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const TYPES = new Set(["chat", "image", "video"]);

function mask(key: string): string {
  if (!key) return "";
  const k = String(key);
  if (k.length <= 8) return "****";
  return `${k.slice(0, 4)}…${k.slice(-4)} (${k.length} chars)`;
}

function auth(req: NextRequest): NextResponse | null {
  if (!adminConfigured() || !isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized", message: "Admin session required." }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const a = auth(req);
  if (a) return a;
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_unavailable", providers: [] }, { status: 503 });
    const res = await db.execute("SELECT * FROM providers ORDER BY created_at ASC");
    const providers = res.rows.map((r) => {
      const g = (k: string) => r[k] as string | number | null;
      const rawKey = String(g("api_key") ?? "");
      return {
        id: String(g("id")),
        name: String(g("name")),
        baseUrl: String(g("base_url")),
        model: String(g("model")),
        type: String(g("type") ?? "chat"),
        active: Number(g("active") ?? 0) === 1,
        contextWindow: g("context_window") == null ? undefined : Number(g("context_window")),
        maxOutput: g("max_output") == null ? undefined : Number(g("max_output")),
        endpoint: g("endpoint") == null ? undefined : String(g("endpoint")),
        hasKey: Boolean(rawKey),
        keyPreview: mask(isEncrypted(rawKey) ? "encrypted-key" : rawKey),
      };
    });
    return NextResponse.json({ providers, encryptionConfigured: encryptionConfigured() });
  } catch (err) {
    console.error("[admin/providers GET]", (err as Error).message?.slice(0, 120));
    return NextResponse.json({ error: "db_unavailable", providers: [] }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const a = auth(req);
  if (a) return a;
  if (!rateLimit("admin-provider-add:" + clientIp(req), 10)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!encryptionConfigured()) {
    return NextResponse.json(
      { error: "encryption_not_configured", message: "Set PROVIDER_ENCRYPTION_KEY to store provider keys." },
      { status: 503 },
    );
  }
  const body = await readJsonBody(req);
  const id = String(body.id ?? "").trim() || newId();
  const name = String(body.name ?? "").trim().slice(0, 80) || "Custom";
  const baseUrl = String(body.baseUrl ?? "").trim();
  const apiKey = String(body.apiKey ?? "").trim();
  const model = String(body.model ?? "").trim();
  const type = TYPES.has(String(body.type)) ? String(body.type) : "chat";

  if (!baseUrl || !apiKey || !model) {
    return NextResponse.json({ error: "missing_fields", message: "baseUrl, apiKey and model are required." }, { status: 400 });
  }
  const urlError = validateProviderUrl(baseUrl);
  if (urlError) return NextResponse.json({ error: "invalid_url", message: urlError }, { status: 400 });

  const intOr = (v: unknown) => (v == null || String(v).trim() === "" ? null : Number(v));
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
    const dup = await db.execute({ sql: "SELECT 1 FROM providers WHERE id = ?", args: [id] });
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: "duplicate_id", message: "A provider with that id exists." }, { status: 409 });
    }
    const active = body.active === true ? 1 : 0;
    if (active) {
      await db.execute({ sql: "UPDATE providers SET active = 0 WHERE type = ?", args: [type] });
    }
    await db.execute({
      sql: `INSERT INTO providers (id, name, base_url, api_key, model, type, active,
              context_window, max_output, endpoint, auth_header, auth_prefix, response_field, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, name, baseUrl, encryptKey(apiKey), model, type, active,
        intOr(body.contextWindow), intOr(body.maxOutput),
        body.endpoint ? String(body.endpoint) : null,
        body.authHeader ? String(body.authHeader) : null,
        body.authPrefix != null && String(body.authPrefix) !== "" ? String(body.authPrefix) : null,
        body.responseField ? String(body.responseField) : null,
        now(), now(),
      ],
    });
    return NextResponse.json({ ok: true, id, type, active: active === 1 });
  } catch (err) {
    console.error("[admin/providers POST]", (err as Error).message?.slice(0, 120));
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

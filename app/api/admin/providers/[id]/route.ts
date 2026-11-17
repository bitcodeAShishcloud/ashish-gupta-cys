// PATCH /api/admin/providers/[id] — edit fields / set active (per-type)
// DELETE /api/admin/providers/[id] — remove provider
// Admin session required. Rate-limited.

import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, adminConfigured } from "@/lib/admin-auth";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema, now } from "@/lib/db";
import { encryptKey, encryptionConfigured } from "@/lib/crypto";
import { validateProviderUrl } from "@/lib/providers";
import { invalidateProviderCache } from "@/lib/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const PROTOCOLS = new Set(["openai", "anthropic", "google"]);

function auth(req: NextRequest): NextResponse | null {
  if (!adminConfigured() || !isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = auth(req);
  if (a) return a;
  if (!rateLimit("admin-provider-edit:" + clientIp(req), 10)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { id } = await params;
  const body = await readJsonBody(req);
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
    const existing = await db.execute({ sql: "SELECT * FROM providers WHERE id = ?", args: [id] });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const row = existing.rows[0] as Record<string, unknown>;
    const type = String(row.type ?? "chat");

    // Set active: clear same-type actives first, then set this one.
    if (body.active === true) {
      await db.execute({ sql: "UPDATE providers SET active = 0 WHERE type = ?", args: [type] });
      await db.execute({ sql: "UPDATE providers SET active = 1, updated_at = ? WHERE id = ?", args: [now(), id] });
      invalidateProviderCache();
      return NextResponse.json({ ok: true, active: true });
    }
    if (body.active === false) {
      await db.execute({ sql: "UPDATE providers SET active = 0, updated_at = ? WHERE id = ?", args: [now(), id] });
      invalidateProviderCache();
      return NextResponse.json({ ok: true, active: false });
    }

    const fields: string[] = [];
    const args: (string | number | null)[] = [];
    const set = (col: string, val: string | number | null) => { fields.push(`${col} = ?`); args.push(val); };
    if (typeof body.name === "string") set("name", body.name.trim().slice(0, 80) || "Custom");
    if (typeof baseUrlStr(body) === "string") {
      const err = validateProviderUrl(String(body.baseUrl).trim());
      if (err) return NextResponse.json({ error: "invalid_url", message: err }, { status: 400 });
      set("base_url", String(body.baseUrl).trim());
    }
    if (typeof body.model === "string") set("model", body.model.trim());
    if (typeof body.apiKey === "string" && body.apiKey.trim()) {
      if (!encryptionConfigured()) {
        return NextResponse.json({ error: "encryption_not_configured" }, { status: 503 });
      }
      set("api_key", encryptKey(body.apiKey.trim()));
    }
    if (PROTOCOLS.has(String(body.protocol))) set("protocol", String(body.protocol));
    const intOr = (v: unknown) => (v == null || String(v).trim() === "" ? null : Number(v));
    if (body.contextWindow !== undefined) set("context_window", intOr(body.contextWindow));
    if (body.maxOutput !== undefined) set("max_output", intOr(body.maxOutput));
    if (body.endpoint !== undefined) set("endpoint", body.endpoint ? String(body.endpoint) : null);
    if (body.authHeader !== undefined) set("auth_header", body.authHeader ? String(body.authHeader) : null);
    if (body.authPrefix !== undefined) set("auth_prefix", body.authPrefix !== "" ? String(body.authPrefix) : null);
    if (body.responseField !== undefined) set("response_field", body.responseField ? String(body.responseField) : null);

    if (fields.length === 0) return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
    fields.push("updated_at = ?");
    args.push(now(), id);
    await db.execute({ sql: `UPDATE providers SET ${fields.join(", ")} WHERE id = ?`, args });
    invalidateProviderCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/providers PATCH]", (err as Error).message?.slice(0, 120));
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

function baseUrlStr(body: Record<string, unknown>): string | null {
  return typeof body.baseUrl === "string" && body.baseUrl.trim() ? body.baseUrl : null;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = auth(req);
  if (a) return a;
  if (!rateLimit("admin-provider-delete:" + clientIp(req), 10)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { id } = await params;
  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
    await db.execute({ sql: "DELETE FROM providers WHERE id = ?", args: [id] });
    invalidateProviderCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/providers DELETE]", (err as Error).message?.slice(0, 120));
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

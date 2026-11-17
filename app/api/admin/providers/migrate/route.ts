// POST /api/admin/providers/migrate — one-time import of legacy env providers
// (AI_PROVIDERS_JSON) into the encrypted DB registry. Admin only, idempotent.
//
// The raw key lives in the server env; it is encrypted with PROVIDER_ENCRYPTION_KEY
// before it is written to Turso. This route NEVER returns key material — only
// names and counts.

import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, adminConfigured } from "@/lib/admin-auth";
import { clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema, now } from "@/lib/db";
import { encryptKey, encryptionConfigured } from "@/lib/crypto";
import { loadProviders, type ProviderConfig, type ProviderProtocol } from "@/lib/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function normalizeProtocol(p: ProviderConfig): ProviderProtocol {
  return p.protocol === "anthropic" || p.protocol === "google" ? p.protocol : "openai";
}

function normalizeType(p: ProviderConfig): string {
  return p.type === "image" || p.type === "video" ? p.type : "chat";
}

export async function POST(req: NextRequest) {
  if (!adminConfigured() || !isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!rateLimit("admin-provider-migrate:" + clientIp(req), 3)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!encryptionConfigured()) {
    return NextResponse.json(
      { error: "encryption_not_configured", message: "Set PROVIDER_ENCRYPTION_KEY first." },
      { status: 503 },
    );
  }

  const envReg = loadProviders();
  if (envReg.providers.length === 0) {
    return NextResponse.json({
      migrated: 0,
      skipped: 0,
      total: 0,
      message: "No legacy AI_PROVIDERS_JSON providers found on the server.",
    });
  }

  try {
    await ensureSchema();
    const db = getDb();
    if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 503 });

    const migrated: string[] = [];
    const skipped: string[] = [];
    const activated: string[] = [];

    for (const p of envReg.providers) {
      const existing = await db.execute({
        sql: "SELECT 1 FROM providers WHERE id = ?",
        args: [p.id],
      });
      if (existing.rows.length > 0) {
        skipped.push(p.name || p.id);
        continue;
      }

      const protocol = normalizeProtocol(p);
      const type = normalizeType(p);
      const active = p.id === envReg.activeId ? 1 : 0;
      if (active) {
        // One active provider per type — mirrors the admin Activate action.
        await db.execute({
          sql: "UPDATE providers SET active = 0 WHERE type = ?",
          args: [type],
        });
      }
      await db.execute({
        sql: `INSERT INTO providers (id, name, base_url, api_key, model, protocol, type, active,
                 context_window, max_output, endpoint, auth_header, auth_prefix, response_field,
                 size_mode, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id,
          String(p.name || p.id).slice(0, 80),
          p.baseUrl,
          encryptKey(String(p.apiKey || "")),
          p.model,
          protocol,
          type,
          active,
          p.contextWindow ?? null,
          p.maxOutput ?? null,
          p.endpoint ?? null,
          p.authHeader ?? null,
          p.authPrefix === undefined ? null : String(p.authPrefix),
          p.responseField ?? null,
          p.sizeMode ?? null,
          now(),
          now(),
        ],
      });
      migrated.push(p.name || p.id);
      if (active) activated.push(p.name || p.id);
    }

    return NextResponse.json({
      ok: true,
      migrated: migrated.length,
      skipped: skipped.length,
      total: envReg.providers.length,
      migratedNames: migrated,
      skippedNames: skipped,
      activatedNames: activated,
      message:
        migrated.length === 0
          ? "Nothing new to import — all env providers already exist in the DB."
          : `Imported ${migrated.length} provider(s); keys encrypted at rest.`,
    });
  } catch (err) {
    console.error("[admin/providers/migrate]", (err as Error).message?.slice(0, 200));
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

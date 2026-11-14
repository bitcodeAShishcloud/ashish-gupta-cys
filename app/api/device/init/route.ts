// POST /api/device/init  { token: string, deviceName?: string }
// Registers a device token if new, updates last_seen + device_name if
// returning. Returns the user record. Rate-limited to prevent spam.
//
// The device token IS the user identity — no password, no email. It lives
// in the visitor's localStorage. Clearing browser data = new identity.

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { getDb, ensureSchema, now, dbEnvStatus } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const MAX_NAME = 64;

export async function POST(req: NextRequest) {
  if (!rateLimit("device-init:" + clientIp(req), 10)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await readJsonBody(req);
  const token = String(body.token ?? "").trim();
  if (!token || token.length < 8 || token.length > 128) {
    return NextResponse.json({ error: "bad_token" }, { status: 400 });
  }
  const deviceName = String(body.deviceName ?? "").trim().slice(0, MAX_NAME) || null;

  try {
    await ensureSchema();
    const db = getDb();
    if (!db) {
      const status = dbEnvStatus();
      return NextResponse.json(
        {
          error: "db_not_configured",
          detail: `Missing: ${!status.url ? "TURSO_DATABASE_URL (or TURSO_URL)" : ""} ${!status.token ? "TURSO_AUTH_TOKEN (or TURSO_API_KEY)" : ""}`.trim(),
        },
        { status: 503 },
      );
    }
    const existing = await db.execute({
      sql: "SELECT id, device_name, created_at, last_seen FROM users WHERE id = ?",
      args: [token],
    });

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      await db.execute({
        sql: "UPDATE users SET last_seen = ?, device_name = COALESCE(?, device_name) WHERE id = ?",
        args: [now(), deviceName, token],
      });
      return NextResponse.json({
        id: String(row.id),
        deviceName: deviceName ?? String(row.device_name ?? ""),
        createdAt: Number(row.created_at),
        lastSeen: now(),
        isNew: false,
      });
    }

    await db.execute({
      sql: "INSERT INTO users (id, device_name, created_at, last_seen) VALUES (?, ?, ?, ?)",
      args: [token, deviceName, now(), now()],
    });
    return NextResponse.json({
      id: token,
      deviceName: deviceName ?? "",
      createdAt: now(),
      lastSeen: now(),
      isNew: true,
    });
  } catch (err) {
    console.error("[device/init]", err);
    return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
  }
}

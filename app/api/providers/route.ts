import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, adminConfigured } from "@/lib/admin-auth";
import { rateLimit, clientIp } from "@/lib/chat-http";
import {
  loadProviders,
  getActiveProvider,
  providerDefaults,
  validateProviderUrl,
  callProvider,
  type ProviderConfig,
} from "@/lib/providers";

export const dynamic = "force-dynamic";

// Mask the API key for display (show only a short fingerprint).
function maskKey(key?: string): string {
  if (!key) return "";
  const k = String(key);
  if (k.length <= 8) return "****";
  return `${k.slice(0, 4)}…${k.slice(-4)} (${k.length} chars)`;
}

function publicShape(p: ProviderConfig) {
  const d = providerDefaults(p);
  return {
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    model: p.model,
    endpoint: d.endpoint,
    contextWindow: d.contextWindow,
    maxOutput: d.maxOutput,
    hasKey: Boolean(p.apiKey),
    keyPreview: maskKey(p.apiKey),
  };
}

function unauthorized(res?: NextResponse) {
  return res ?? NextResponse.json({ error: "unauthorized", message: "Admin session required." }, { status: 401 });
}

// GET /api/providers — active + all configured providers (keys masked). Admin only.
export async function GET(req: NextRequest) {
  if (!adminConfigured() || !isAdminRequest(req)) return unauthorized();
  const reg = loadProviders();
  return NextResponse.json({
    activeId: reg.activeId,
    providers: reg.providers.map(publicShape),
  });
}

// POST /api/providers { action: "test" } — live test of the ACTIVE provider
// with a tiny ping. Only the env-configured provider is ever contacted.
export async function POST(req: NextRequest) {
  if (!adminConfigured() || !isAdminRequest(req)) return unauthorized();
  if (!rateLimit("providers-test:" + clientIp(req), 6)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tests. Wait a bit." }, { status: 429 });
  }

  const provider = getActiveProvider();
  if (!provider || !provider.apiKey || !provider.model) {
    return NextResponse.json(
      { error: "provider_not_configured", message: "No active provider with an API key is configured." },
      { status: 503 },
    );
  }
  const urlError = validateProviderUrl(provider.baseUrl);
  if (urlError) {
    return NextResponse.json({ error: "invalid_url", message: urlError }, { status: 503 });
  }

  const result = await callProvider(provider, [
    { role: "system", content: "Reply with exactly: ok" },
    { role: "user", content: "ping" },
  ]);

  if (!result.ok) {
    const detail = result.detail ? String(result.detail).replace(provider.apiKey, "***").slice(0, 300) : "";
    return NextResponse.json(
      { error: "test_failed", message: "Provider test failed.", detail, status: result.status },
      { status: 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    provider: provider.name,
    model: provider.model,
    reply: (result.reply || "").slice(0, 200),
  });
}

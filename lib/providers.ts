import net from "node:net";

/*
 * AI provider config is supplied via the AI_PROVIDERS_JSON env var:
 *   {
 *     "activeId": "p1",
 *     "providers": [{
 *       "id": "p1", "name": "XKiro", "baseUrl": "https://api.xkiro.com/v1",
 *       "apiKey": "...", "model": "qwen/qwen3.8-max:free",
 *       "contextWindow": 1000000, "maxOutput": 65536
 *     }]
 *   }
 * OpenAI-compatible by default; optional fields (endpoint, authHeader,
 * authPrefix, responseField) allow custom providers.
 */

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  endpoint?: string;
  authHeader?: string;
  authPrefix?: string;
  responseField?: string;
  contextWindow?: number;
  maxOutput?: number;
}

export interface ProviderRegistry {
  activeId: string;
  providers: ProviderConfig[];
}

export function loadProviders(): ProviderRegistry {
  const raw = process.env.AI_PROVIDERS_JSON;
  if (!raw) return { activeId: "", providers: [] };
  try {
    const parsed = JSON.parse(raw);
    const list: ProviderConfig[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.providers)
        ? parsed.providers
        : [];
    const activeId = parsed.activeId ?? list[0]?.id ?? "";
    return { activeId, providers: list };
  } catch {
    console.error("AI_PROVIDERS_JSON is not valid JSON");
    return { activeId: "", providers: [] };
  }
}

export function getActiveProvider(): ProviderConfig | null {
  const reg = loadProviders();
  return reg.providers.find((p) => p.id === reg.activeId) ?? reg.providers[0] ?? null;
}

/* ── Outbound URL safety: only https to public hosts ── */
export function validateProviderUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(String(rawUrl));
  } catch {
    return "Invalid URL";
  }
  if (url.protocol !== "https:") return "Only https:// base URLs are allowed";
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return "Missing hostname";
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return "Local hostnames are not allowed";
  }
  if (host === "metadata.google.internal" || host === "169.254.169.254") {
    return "Reserved addresses are not allowed";
  }
  if (net.isIP(host)) {
    if (isPrivateOrReservedIP(host)) return "Private or reserved IP addresses are not allowed";
    return null;
  }
  return null;
}

function isPrivateOrReservedIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const first = ip.split(":")[0].toLowerCase();
  return (
    first === "fe80" || first === "fc" || first === "fd" || ip === "::1" || ip === "::"
  );
}

export function normalizeBaseUrl(url: string): string {
  return String(url || "").trim().replace(/\/+$/, "");
}

/*
 * Positive host allowlist. When AI_ALLOWED_HOSTS is set (comma-separated), the
 * provider base URL's host MUST be one of those hosts — a strict whitelist.
 * This is the strongest SSRF posture: the server can only ever reach a small
 * set of explicitly approved provider domains. If the var is unset we fall
 * back to "any public https host" (still blocked for private/loopback).
 */
export function allowedHosts(): string[] {
  const raw = process.env.AI_ALLOWED_HOSTS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function hostIsAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const list = allowedHosts();
  if (list.length === 0) return true; // unset → allow any public host
  return list.includes(host);
}

export function normalizeEndpoint(raw?: string): string | null {
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  const p = String(raw).trim();
  if (!p.startsWith("/")) return null;
  if (p.includes("//") || p.includes("?") || p.includes("#")) return null;
  return p;
}

export function resolvePath(data: unknown, dotted?: string): unknown {
  if (!dotted || data === undefined || data === null) return undefined;
  return String(dotted)
    .split(".")
    .reduce<unknown>((node, key) =>
      node === undefined || node === null ? undefined : (node as Record<string, unknown>)[key],
      data,
    );
}

export function estimateTokens(text: string): number {
  return Math.max(4, Math.round(String(text).length / 4));
}

export function trimToContext(
  systemPrompt: string,
  history: { role: string; content: string }[],
  contextWindow: number,
  maxOutput: number,
): { role: string; content: string }[] {
  const budget = Math.max(2000, contextWindow) - Math.max(200, maxOutput) - 200;
  const msgs: { role: string; content: string }[] = [{ role: "system", content: systemPrompt }];
  let used = estimateTokens(systemPrompt);
  const picked: { role: string; content: string }[] = [];
  for (let i = history.length - 1; i >= 0 && picked.length < 24; i--) {
    const m = history[i];
    const cost = estimateTokens(m.content) + 4;
    if (used + cost > budget) break;
    picked.unshift(m);
    used += cost;
  }
  return [...msgs, ...picked];
}

export interface ResolvedProvider {
  endpoint: string;
  authHeader: string;
  authPrefix: string;
  responseField: string | null;
  maxOutput: number;
  contextWindow: number;
}

export function providerDefaults(provider: ProviderConfig): ResolvedProvider {
  const d = provider;
  return {
    endpoint: normalizeEndpoint(d.endpoint) || "/chat/completions",
    authHeader: String(d.authHeader || "").trim() || "Authorization",
    authPrefix: d.authPrefix === undefined ? "Bearer " : String(d.authPrefix),
    responseField: d.responseField ? String(d.responseField) : null,
    maxOutput: Math.min(196608, Math.max(100, Number(d.maxOutput) || 900)),
    contextWindow: Math.min(2000000, Math.max(2000, Number(d.contextWindow) || 32000)),
  };
}

export interface ProviderCallResult {
  ok: boolean;
  reply?: string;
  status?: number;
  detail?: string;
}

/* ── Streaming provider call: same gates, SSE body back ── */
export interface ProviderStreamResult {
  ok: boolean;
  stream?: ReadableStream<Uint8Array>;
  status?: number;
  detail?: string;
  /** Upstream answered but ignored stream:true (non-SSE body) — caller should fall back to buffered callProvider. */
  notStreamable?: boolean;
  /** Clears the stream-wide abort timer. Must be called when the route finishes reading. */
  dispose?: () => void;
}

export async function streamProvider(
  provider: ProviderConfig,
  messages: { role: string; content: string }[],
  opts: { timeoutMs?: number; validatedUrl?: string } = {},
): Promise<ProviderStreamResult> {
  const c = providerDefaults(provider);
  let url = opts.validatedUrl;
  if (!url) {
    const baseErr = validateProviderUrl(provider.baseUrl);
    if (baseErr) return { ok: false, status: 503, detail: baseErr };
    url = normalizeBaseUrl(provider.baseUrl) + c.endpoint;
  }

  const targetHost = new URL(url).hostname.toLowerCase();
  if (!hostIsAllowed(targetHost)) {
    return {
      ok: false,
      status: 503,
      detail: `Provider host "${targetHost}" is not in the AI_ALLOWED_HOSTS whitelist.`,
    };
  }

  // The abort timer covers the whole stream (headers + body), not just the
  // handshake — dispose() clears it once the route is done reading.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120000);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  headers[c.authHeader] = c.authPrefix + String(provider.apiKey || "");
  try {
    if (/openrouter\.ai$/i.test(new URL(url).hostname)) {
      headers["HTTP-Referer"] = process.env.PUBLIC_SITE_URL || "https://localhost";
      headers["X-Title"] = "Ashish Gupta Portfolio Chat";
    }
  } catch {
    /* url is already validated */
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.7,
        max_tokens: c.maxOutput,
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      const anyErr = data as { error?: { message?: string }; message?: string; msg?: string };
      const detail = String(
        anyErr?.error?.message || anyErr?.message || anyErr?.msg || text || `HTTP ${res.status}`,
      ).slice(0, 300);
      return { ok: false, status: res.status, detail };
    }

    if (!res.body) return { ok: false, status: 502, detail: "Provider returned an empty body." };

    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    if (!ctype.includes("text/event-stream")) {
      // Provider ignored stream:true and answered JSON — let the route buffer instead.
      try {
        await res.body.cancel();
      } catch {
        /* ignore */
      }
      clearTimeout(timer);
      return { ok: false, status: 502, detail: "Provider did not stream.", notStreamable: true };
    }

    return {
      ok: true,
      stream: res.body,
      dispose: () => clearTimeout(timer),
    };
  } catch (err) {
    clearTimeout(timer);
    const e = err as { name?: string; message?: string };
    if (e.name === "AbortError") {
      return { ok: false, status: 504, detail: "Provider timed out." };
    }
    return { ok: false, status: 502, detail: e.message };
  }
}

export async function callProvider(
  provider: ProviderConfig,
  messages: { role: string; content: string }[],
  opts: { maxOutput?: number; timeoutMs?: number; validatedUrl?: string } = {},
): Promise<ProviderCallResult> {
  const c = providerDefaults(provider);
  // The fetch target is only ever a pre-validated public https URL (see
  // resolveChatTarget / validateProviderUrl). Callers may pass a trusted
  // validatedUrl; otherwise we derive + validate from the provider base URL.
  let url = opts.validatedUrl;
  if (!url) {
    const baseErr = validateProviderUrl(provider.baseUrl);
    if (baseErr) return { ok: false, status: 503, detail: baseErr };
    url = normalizeBaseUrl(provider.baseUrl) + c.endpoint;
  }
  const maxTokens = opts.maxOutput ?? c.maxOutput;

  // Enforce the positive host allowlist (AI_ALLOWED_HOSTS). If the var is set,
  // the resolved target host must be on the whitelist; otherwise reject.
  const targetHost = new URL(url).hostname.toLowerCase();
  if (!hostIsAllowed(targetHost)) {
    return {
      ok: false,
      status: 503,
      detail: `Provider host "${targetHost}" is not in the AI_ALLOWED_HOSTS whitelist.`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60000);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  headers[c.authHeader] = c.authPrefix + String(provider.apiKey || "");
  try {
    if (/openrouter\.ai$/i.test(new URL(url).hostname)) {
      headers["HTTP-Referer"] = process.env.PUBLIC_SITE_URL || "https://localhost";
      headers["X-Title"] = "Ashish Gupta Portfolio Chat";
    }
  } catch {
    /* url is already validated */
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const anyErr = data as { error?: { message?: string }; message?: string; msg?: string };
      const detail = String(
        anyErr?.error?.message || anyErr?.message || anyErr?.msg || text || `HTTP ${res.status}`,
      ).slice(0, 300);
      return { ok: false, status: res.status, detail };
    }

    let reply: unknown;
    if (c.responseField) {
      reply = resolvePath(data, c.responseField);
      if (reply === undefined || reply === null || reply === "") {
        return {
          ok: false,
          status: 502,
          detail: `Response did not contain the configured responseField "${c.responseField}".`,
        };
      }
    } else {
      reply = resolvePath(data, "choices.0.message.content");
      if (reply === undefined || reply === null || reply === "") {
        const anyData = data as Record<string, unknown>;
        reply =
          resolvePath(data, "choices.0.text") ??
          anyData?.reply ??
          anyData?.response ??
          anyData?.answer ??
          anyData?.message;
      }
      if (typeof reply !== "string" || reply.trim() === "") {
        return {
          ok: false,
          status: 502,
          detail: `Unrecognized response shape${
            data ? ` (keys: ${Object.keys(data as object).join(", ")})` : ""
          }. Set "responseField" if the provider is not OpenAI-compatible.`,
        };
      }
    }

    return { ok: true, reply: String(reply).slice(0, 12000) };
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "AbortError") {
      return { ok: false, status: 504, detail: "Provider timed out." };
    }
    return { ok: false, status: 502, detail: e.message };
  } finally {
    clearTimeout(timer);
  }
}

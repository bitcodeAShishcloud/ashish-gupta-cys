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
  /** "image" marks an image-generation endpoint; entries whose baseUrl contains /images/ are inferred as image providers. */
  type?: string;
  /** "ratio-tiers": the provider takes {size: "1K".."4K", ratio} + return_base64 (Agnes-style),
   *  instead of the legacy exact pixel-size OpenAI shape. */
  sizeMode?: string;
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
  const chat = reg.providers.find(
    (p) => p.id === reg.activeId && !isImageProvider(p) && !isVideoProvider(p),
  );
  if (chat) return chat;
  return (
    reg.providers.find((p) => !isImageProvider(p) && !isVideoProvider(p)) ?? null
  );
}

/**
 * Ordered chat-failover candidate list. The active provider comes first —
 * exactly what getActiveProvider() returns, including its silent fallback
 * when activeId is empty/invalid/image-typed, so the failover order and the
 * admin "active" badge can never diverge — followed by the remaining chat
 * providers in AI_PROVIDERS_JSON array order. Image providers are never
 * candidates; duplicate ids dedupe with the first occurrence winning.
 */
export function orderedChatCandidates(): ProviderConfig[] {
  const reg = loadProviders();
  const chat = reg.providers.filter((p) => !isImageProvider(p) && !isVideoProvider(p));
  const active = getActiveProvider();
  if (!active) return chat;
  const ordered = [active, ...chat];
  const seen = new Set<string>();
  const deduped: ProviderConfig[] = [];
  for (const p of ordered) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    deduped.push(p);
  }
  return deduped;
}

/* ── Image generation ── */
export function isImageProvider(p: ProviderConfig): boolean {
  return p.type === "image" || /\/images\//.test(p.baseUrl);
}

/* ── Video generation ── */
export function isVideoProvider(p: ProviderConfig): boolean {
  return p.type === "video";
}

/**
 * Resolve the video-generation target. An explicit type:"video" entry is
 * used verbatim: create URL = baseUrl + /videos (unless it already ends
 * with it), retrieval URL = baseUrl + /agnesapi?video_id=…&model_name=….
 * Returns null when no video provider with a key is configured.
 */
export function resolveVideoTarget(): {
  provider: ProviderConfig;
  createUrl: string;
  retrievalBase: string;
} | null {
  const reg = loadProviders();
  const video = reg.providers.find((p) => isVideoProvider(p) && p.apiKey);
  if (!video) return null;
  const base = normalizeBaseUrl(video.baseUrl);
  const createUrl = base.endsWith("/videos") ? base : `${base}/videos`;
  return { provider: video, createUrl, retrievalBase: base };
}

/**
 * Resolve the image-generation target. An explicit image provider entry
 * (type:"image" or a baseUrl that already contains /images/) is used
 * verbatim — its baseUrl IS the full request URL. Otherwise the active
 * chat provider is reused with the same key: its base URL's
 * /chat/completions suffix is swapped for /images/generations, or
 * /images/generations is appended.
 */
export function resolveImageTarget(): { provider: ProviderConfig; url: string } | null {
  const reg = loadProviders();
  const explicit = reg.providers.find((p) => isImageProvider(p) && p.apiKey);
  if (explicit) {
    return { provider: explicit, url: normalizeBaseUrl(explicit.baseUrl) };
  }
  const active = getActiveProvider();
  if (!active || !active.apiKey) return null;
  const base = normalizeBaseUrl(active.baseUrl);
  const url = base.endsWith("/chat/completions")
    ? base.replace(/\/chat\/completions$/, "/images/generations")
    : `${base}/images/generations`;
  return { provider: active, url };
}

export interface ImageResult {
  ok: boolean;
  /** Provider CDN URL — rendered directly by the browser (CSP must allow the host). */
  url?: string;
  /** Inline base64 payload when the provider returns b64 instead of a URL. */
  dataUrl?: string;
  /** Model's restated understanding of the prompt (Agnes returns revised_prompt). */
  revisedPrompt?: string;
  /** Async-job id, when the provider used one — enables the download route. */
  jobId?: string;
  status?: number;
  detail?: string;
}

function toDataUrl(bytes: Buffer, contentType: string): string {
  const type = /image\//.test(contentType) ? contentType : "image/png";
  return `data:${type};base64,${bytes.toString("base64")}`;
}

export async function generateImage(
  target: { provider: ProviderConfig; url: string },
  prompt: string,
  size: string,
  opts: { timeoutMs?: number; tier?: string; ratio?: string; images?: string[] } = {},
): Promise<ImageResult> {
  const { provider, url } = target;
  const c = providerDefaults(provider);

  const urlError = validateProviderUrl(url);
  if (urlError) return { ok: false, status: 503, detail: urlError };
  if (!hostIsAllowed(new URL(url).hostname.toLowerCase())) {
    return {
      ok: false,
      status: 503,
      detail: `Provider host "${new URL(url).hostname}" is not in the AI_ALLOWED_HOSTS whitelist.`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120000);

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  headers[c.authHeader] = c.authPrefix + String(provider.apiKey || "");

  /* ratio-tiers providers (Agnes-style) take tier + ratio + base64 return;
   * legacy OpenAI-shape providers keep the exact-size body unchanged. */
  const tierMode = provider.sizeMode === "ratio-tiers";
  const payload: Record<string, unknown> = tierMode
    ? {
        model: provider.model,
        prompt,
        size: opts.tier || "1K",
        ratio: opts.ratio || "1:1",
        return_base64: true,
      }
    : { model: provider.model, prompt, n: 1, size };
  if (opts.images && opts.images.length > 0) payload.image = opts.images;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify(payload),
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

    /* Async job gateways answer 202 {id, status:"processing"} — poll
     * GET {url}/{id} until the job succeeds and data shows up. */
    const body = data as {
      id?: unknown;
      status?: unknown;
      object?: unknown;
      data?: unknown[];
    } | null;
    let resolvedJobId: string | undefined;
    const jobShaped =
      body &&
      typeof body === "object" &&
      !Array.isArray(body.data) &&
      typeof body.id === "string" &&
      (res.status === 202 ||
        body.object === "image.generation.job" ||
        typeof body.status === "string");
    if (jobShaped) {
      const jobId = body.id as string;
      resolvedJobId = jobId;
      const pollUrl = `${normalizeBaseUrl(url)}/${jobId}`;
      const deadline = Date.now() + (opts.timeoutMs ?? 120000) - 3000;
      let jobData: { data?: unknown[] } | null = null;      for (;;) {
        if (Date.now() >= deadline) {
          return { ok: false, status: 504, detail: "Image generation timed out." };
        }
        await new Promise((r) => setTimeout(r, 3500));
        try {
          const pollRes = await fetch(pollUrl, { headers, signal: controller.signal });
          const pollText = await pollRes.text();
          let pollJson: Record<string, unknown> = {};
          try {
            pollJson = JSON.parse(pollText) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (!pollRes.ok) {
            const anyErr = pollJson as { error?: { message?: string }; message?: string };
            return {
              ok: false,
              status: 502,
              detail: String(anyErr?.error?.message || anyErr?.message || pollText || `HTTP ${pollRes.status}`).slice(0, 300),
            };
          }
          const st = String(pollJson.status ?? "").toLowerCase();
          if (Array.isArray(pollJson.data) && pollJson.data.length > 0) {
            jobData = pollJson as { data: unknown[] };
            break;
          }
          if (st === "failed" || st === "error" || st === "cancelled" || st === "canceled") {
            return { ok: false, status: 502, detail: "Image generation failed." };
          }
          if (st === "succeeded" || st === "completed" || st === "complete") {
            jobData = pollJson as { data: unknown[] };
            break;
          }
        } catch (err) {
          const e = err as { name?: string };
          if (e.name === "AbortError") return { ok: false, status: 504, detail: "Image generation timed out." };
          /* transient poll error — keep trying until the deadline */
        }
      }
      if (!jobData || !Array.isArray(jobData.data)) {
        return { ok: false, status: 504, detail: "Image generation timed out." };
      }
      data = jobData;
    }

    // OpenAI shape: { data: [{ url | b64_json }] }; aggregator fallbacks below.
    const first = (data as { data?: unknown[] })?.data;
    const item = (Array.isArray(first) ? first[0] : data) as Record<string, unknown> | undefined;
    const revised =
      typeof item?.revised_prompt === "string" && item.revised_prompt.trim()
        ? item.revised_prompt.trim().slice(0, 500)
        : undefined;
    const candidates = [
      item?.url,
      item?.image_url,
      (item?.image_url as { url?: unknown })?.url,
      item?.image,
      item?.b64_json,
      item?.base64,
      typeof data === "string" ? data : undefined,
    ];
    const found = candidates.find((v) => typeof v === "string" && v);

    if (typeof found !== "string" || !found) {
      const keys = data && typeof data === "object" ? Object.keys(data as object).join(", ") : "";
      return {
        ok: false,
        status: 502,
        detail: `Unrecognized image response shape${keys ? ` (keys: ${keys})` : ""}.`,
      };
    }

    if (/^data:image\//i.test(found)) return { ok: true, dataUrl: found, revisedPrompt: revised, jobId: resolvedJobId };
    if (/^https?:\/\//i.test(found)) return { ok: true, url: found, revisedPrompt: revised, jobId: resolvedJobId };
    // Bare base64 payload
    return {
      ok: true,
      dataUrl: toDataUrl(Buffer.from(found, "base64"), "image/png"),
      revisedPrompt: revised,
      jobId: resolvedJobId,
    };
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "AbortError") return { ok: false, status: 504, detail: "Image provider timed out." };
    return { ok: false, status: 502, detail: e.message };
  } finally {
    clearTimeout(timer);
  }
}

/* ── Image CDN host ── */
/* Default is the current provider's CDN (xkiro); AI_IMAGE_CSP_HOSTS overrides
 * it (comma-separated) when the provider changes. next.config.mjs mirrors the
 * same default for the CSP header — keep the two in sync. */
export function imageCdnHost(): string {
  const first = (process.env.AI_IMAGE_CSP_HOSTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return first || "cdn.xkiro.com";
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

/* ── Video generation (async task API) ── */
export interface VideoCreateResult {
  ok: boolean;
  taskId?: string;
  status?: number;
  detail?: string;
}

export interface VideoStatusResult {
  ok: boolean;
  status?: "pending" | "completed" | "failed";
  progress?: number;
  url?: string;
  httpStatus?: number;
  detail?: string;
}

/**
 * Create a text-to-video task. Agnes is async: the call returns a task id
 * immediately; status arrives via getVideoTask polling. SSRF gates run on
 * the create URL before any fetch.
 */
export async function createVideoTask(
  target: { provider: ProviderConfig; createUrl: string },
  payload: { prompt: string; seconds: string; aspectRatio: string },
  opts: { timeoutMs?: number } = {},
): Promise<VideoCreateResult> {
  const { provider, createUrl } = target;
  const c = providerDefaults(provider);

  const urlError = validateProviderUrl(createUrl);
  if (urlError) return { ok: false, status: 503, detail: urlError };
  if (!hostIsAllowed(new URL(createUrl).hostname.toLowerCase())) {
    return {
      ok: false,
      status: 503,
      detail: `Provider host "${new URL(createUrl).hostname}" is not in the AI_ALLOWED_HOSTS whitelist.`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  headers[c.authHeader] = c.authPrefix + String(provider.apiKey || "");

  try {
    const res = await fetch(createUrl, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: provider.model,
        prompt: payload.prompt,
        mode: "text",
        seconds: payload.seconds,
        size: "720P",
        aspect_ratio: payload.aspectRatio,
        n: 1,
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
    const body = data as { id?: unknown; task_id?: unknown; video_id?: unknown } | null;
    const taskId = [body?.id, body?.task_id, body?.video_id].find(
      (v) => typeof v === "string" && v,
    );
    if (typeof taskId !== "string" || !taskId) {
      const keys = data && typeof data === "object" ? Object.keys(data as object).join(", ") : "";
      return {
        ok: false,
        status: 502,
        detail: `Unrecognized video task response shape${keys ? ` (keys: ${keys})` : ""}.`,
      };
    }
    return { ok: true, taskId };
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "AbortError") return { ok: false, status: 504, detail: "Video provider timed out." };
    return { ok: false, status: 502, detail: e.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One status fetch for a video task. Returns the provider's normalized
 * status (pending | completed | failed), progress percent, and the final
 * URL when completed. The URL is played by the BROWSER directly — the
 * server never fetches it — so no server-side SSRF surface exists for the
 * generated output.
 */
export async function getVideoTask(
  target: { provider: ProviderConfig; retrievalBase: string },
  taskId: string,
  opts: { timeoutMs?: number } = {},
): Promise<VideoStatusResult> {
  const { provider, retrievalBase } = target;
  const c = providerDefaults(provider);

  const retrievalUrl = `${retrievalBase}/agnesapi?video_id=${encodeURIComponent(taskId)}&model_name=${encodeURIComponent(provider.model)}`;
  const urlError = validateProviderUrl(retrievalUrl);
  if (urlError) return { ok: false, detail: urlError };
  if (!hostIsAllowed(new URL(retrievalUrl).hostname.toLowerCase())) {
    return {
      ok: false,
      detail: `Provider host "${new URL(retrievalUrl).hostname}" is not in the AI_ALLOWED_HOSTS whitelist.`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);

  const headers: Record<string, string> = { Accept: "application/json" };
  headers[c.authHeader] = c.authPrefix + String(provider.apiKey || "");

  try {
    const res = await fetch(retrievalUrl, { method: "GET", headers, signal: controller.signal });
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
      return { ok: false, httpStatus: res.status, detail };
    }
    const body = data as {
      status?: unknown;
      progress?: unknown;
      url?: unknown;
      error?: unknown;
    } | null;
    const st = String(body?.status ?? "pending").toLowerCase();
    const status: VideoStatusResult["status"] =
      st === "completed" || st === "succeeded" || st === "success"
        ? "completed"
        : st === "failed" || st === "error"
          ? "failed"
          : "pending";
    const progress = Math.max(0, Math.min(100, Math.round(Number(body?.progress) || 0)));
    const url = typeof body?.url === "string" && body.url ? body.url : undefined;
    if (status === "failed") {
      const detail =
        typeof body?.error === "string" ? body.error.slice(0, 300) : "Video generation failed.";
      return { ok: true, status: "failed", progress, detail };
    }
    if (status === "completed" && !url) {
      return { ok: true, status: "pending", progress, detail: "Completed without a video URL." };
    }
    return { ok: true, status, progress, url };
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "AbortError") return { ok: false, detail: "Video status fetch timed out." };
    return { ok: false, detail: e.message };
  } finally {
    clearTimeout(timer);
  }
}

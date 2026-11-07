# Phase 4: Multi-Provider Chat with Automatic Failover - Pattern Map

**Mapped:** 2026-11-07
**Files analyzed:** 4 modified (+1 optional new helper)
**Analogs found:** 4 / 4 (this is a modification phase — the analogs are the files being modified themselves, plus supporting modules)

**Note for planner:** Phase 4 creates no wholly new file types. Every change lands inside existing files whose patterns must be *preserved and extended*, not reinvented. Excerpts below are verbatim from the working tree and are the copy-source for each plan action.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/providers.ts` (modify — add `orderedChatCandidates()`) | service (provider registry + outbound client) | request-response + streaming | itself — sibling `getActiveProvider()` L56-61 | exact |
| `app/api/chat/route.ts` (modify — failover loop + first-token probe) | route (controller) | streaming (SSE) + request-response | itself (only SSE route in codebase) | exact |
| `app/api/providers/route.ts` (modify — optional `{id}` test target) | route (controller) | request-response | itself; sibling `app/api/image/route.ts` | exact |
| `app/admin/page.tsx` (modify — badges + per-row Test) | component (admin console page) | request-response (fetch) | itself; `app/admin/login/page.tsx` | exact |
| *(optional)* `lib/chat-failover.ts` (new — only if planner extracts probe/helpers) | utility | transform | `lib/chat-http.ts` | role-match |

**Client files that must NOT change** (invariants, verified anchors): `components/chat-panel.tsx` (`DAILY_LIMIT = 30` at L40; SSE parser L250-320; name gate L407-465), `app/chat/page.tsx`, `app/api/image/**`.

---

## Pattern Assignments

### `lib/providers.ts` (service, request-response + streaming)

**Analog:** itself — new `orderedChatCandidates()` copies the shape of `getActiveProvider()` (lines 56-61).

**Registry load pattern** (lines 38-54) — defensive env parsing, never throws:
```ts
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
```

**Active-provider selection + silent fallback** (lines 56-61) — the consistency anchor for candidate ordering (R7): candidate[0] must be exactly what this returns, including the fallback:
```ts
export function getActiveProvider(): ProviderConfig | null {
  const reg = loadProviders();
  const chat = reg.providers.find((p) => p.id === reg.activeId && !isImageProvider(p));
  if (chat) return chat;
  return reg.providers.find((p) => !isImageProvider(p)) ?? null;
}
```

**Image-provider filter** (lines 64-66) — reuse verbatim in the candidate filter:
```ts
export function isImageProvider(p: ProviderConfig): boolean {
  return p.type === "image" || /\/images\//.test(p.baseUrl);
}
```

**Per-call SSRF gates** (lines 441-453 in `streamProvider`; identical block 543-558 in `callProvider`) — these already run on EVERY invocation, which is what makes per-candidate gating free; the loop must never pass `opts.validatedUrl` across providers:
```ts
let url = opts.validatedUrl;
if (!url) {
  const baseErr = validateProviderUrl(provider.baseUrl);
  if (baseErr) return { ok: false, status: 503, detail: baseErr };
  url = normalizeBaseUrl(provider.baseUrl) + c.endpoint;
}
const targetHost = new URL(url).hostname.toLowerCase();
if (!hostIsAllowed(targetHost)) {
  return { ok: false, status: 503, detail: `Provider host "${targetHost}" is not in the AI_ALLOWED_HOSTS whitelist.` };
}
```

**Result-shape convention** — both provider calls return `{ok, status?, detail?}` / `{ok, reply?}` (interfaces at lines 414-431). Failover loop branches on `ok`; `notStreamable` (L427-428) routes to same-candidate `callProvider`. HTTP 429 arrives here as `{ok:false, status:429}` (L488-501) — no special casing needed for the failover trigger.

**Per-candidate timeout via existing opts** (line 458): `setTimeout(() => controller.abort(), opts.timeoutMs ?? 120000)` — R2 mitigation passes a shared budget through `opts.timeoutMs`; `dispose()` (L520) clears the timer and MUST be called when abandoning a candidate.

**Pure helpers safe to re-run per candidate:** `providerDefaults` (L402-412), `trimToContext` (L373-391), `validateProviderUrl` (L277-303), `hostIsAllowed` (L344-349).

---

### `app/api/chat/route.ts` (route, streaming SSE)

**Analog:** itself — the failover loop restructures this file; every excerpt below is the pattern the new loop must keep.

**Imports pattern** (lines 11-20) — path alias `@/lib/*`, no default imports:
```ts
import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import {
  getActiveProvider,
  validateProviderUrl,
  trimToContext,
  callProvider,
  streamProvider,
  providerDefaults,
} from "@/lib/providers";
```

**Rate limit is always the first statement** (lines 54-59) — our 429 returns BEFORE any provider contact and never triggers failover:
```ts
if (!rateLimit("chat:" + clientIp(req), RATE_LIMIT)) {
  return NextResponse.json(
    { error: "rate_limited", message: "Too many requests. Slow down a bit." },
    { status: 429 },
  );
}
```

**Defensive input sanitization** (lines 61-79) — `String(x ?? "")`, `.slice()` caps, `Array.isArray` guard; keep untouched:
```ts
const body = await readJsonBody(req);
const message = String(body.message ?? "").trim().slice(0, MAX_INPUT);
...
const rawHistory = Array.isArray(body.history) ? body.history : [];
const history = rawHistory.slice(0, MAX_HISTORY_MESSAGES).flatMap((m) => {
  if (typeof m !== "object" || m === null) return [];
  const item = m as { role?: unknown; content?: unknown };
  const role = item.role === "assistant" ? "assistant" : "user";
  const content = String(item.content ?? "").trim().slice(0, MAX_HISTORY_CONTENT);
  if (!content) return [];
  return [{ role, content }];
});
```

**Key redaction closure** (lines 106-112) — generalize to ALL candidates' keys (R5); 300-char cap is T-03-03, non-negotiable:
```ts
const redact = (text: unknown) => {
  let out = String(text ?? "");
  if (provider.apiKey && out.includes(provider.apiKey)) {
    out = out.split(provider.apiKey).join("***");
  }
  return out.slice(0, 300);
};
```

**SSE machinery — byte-identical, never touched** (lines 43-51):
```ts
const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
} as const;

function sseEvent(obj: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}
```

**Upstream SSE line parser** (lines 126-155) — the first-token probe MUST reuse this exact parsing (research Section 3); `sentChars` accounting + `push({delta})` (L148-151):
```ts
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: unknown }; message?: { content?: unknown } }[] };
      const piece = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content;
      if (typeof piece === "string" && piece) {
        sentChars += piece.length;
        push({ delta: piece });
      }
    } catch {
      /* keep-alive comment or partial line — skip */
    }
  }
}
```

**Mid-stream error + finally contract** (lines 157-166) — post-commit failure path, no failover here (visitor already saw text):
```ts
} catch (err) {
  push({ error: redact(err instanceof Error ? err.message : "stream interrupted") });
} finally {
  if (sentChars === 0) {
    push({ error: redact("The AI provider returned an empty response.") });
  }
  push({ done: true });
  controller.close();
  streamed.dispose?.();
}
```

**Buffered single-delta fallback** (lines 176-192) — becomes the per-candidate `notStreamable` handler and the all-failed error response; shape unchanged:
```ts
const result = await callProvider(provider, upstream);
const buffered = new ReadableStream<Uint8Array>({
  start(controller) {
    if (!result.ok) {
      controller.enqueue(sseEvent({ error: redact(result.detail || "The AI provider failed to respond.") }));
    } else {
      controller.enqueue(sseEvent({ delta: result.reply ?? "" }));
    }
    controller.enqueue(sseEvent({ done: true }));
    controller.close();
  },
});
return new Response(buffered, { headers: SSE_HEADERS });
```

**503 gate to preserve verbatim** (lines 82-91) — fires only when the viability filter leaves zero candidates:
```ts
if (!provider || !provider.apiKey || !provider.model) {
  return NextResponse.json(
    { error: "provider_not_configured", message: "No AI provider is configured yet. The site owner needs to set AI_PROVIDERS_JSON on the server." },
    { status: 503 },
  );
}
```

**Line 92-98 (single-provider URL pre-gate) is DELETED** — gating moves inside the loop via `streamProvider`/`callProvider` internals. A candidate with an invalid URL is a pre-first-token failure, not a 503.

---

### `app/api/providers/route.ts` (route, request-response)

**Analog:** itself — the POST handler gains an optional `{id}` target while keeping every guard in place.

**Guard order is fixed** (lines 54-58) — auth first, then rate limit; do not reorder:
```ts
export async function POST(req: NextRequest) {
  if (!adminConfigured() || !isAdminRequest(req)) return unauthorized();
  if (!rateLimit("providers-test:" + clientIp(req), 6)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tests. Wait a bit." }, { status: 429 });
  }
```
Guard helpers live in `lib/admin-auth.ts` (`adminConfigured` L13, `isAdminRequest` L70 — HMAC cookie check). GET guard (L43-44) untouched.

**POST currently never reads the body** — the extension adds it using the shared helper:
```ts
const body = await readJsonBody(req);          // NEW import from "@/lib/chat-http"
const id = typeof body.id === "string" ? body.id.trim() : "";
const target = id
  ? loadProviders().providers.find((p) => p.id === id)   // first match wins
  : getActiveProvider();                                  // absent → active (backward compatible)
if (id && !target) {
  return NextResponse.json({ error: "provider_not_found", message: "No provider with that id is configured." }, { status: 404 });
}
```

**Viability → URL gate → ping** (lines 60-75) — swap `provider` for `target`, message unchanged:
```ts
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
```

**Failure shape — detail redacts the TARGET's key** (line 78 currently redacts the active provider's key; must switch to `target`; 300-char cap kept):
```ts
if (!result.ok) {
  const detail = result.detail ? String(result.detail).replace(provider.apiKey, "***").slice(0, 300) : "";
  return NextResponse.json(
    { error: "test_failed", message: "Provider test failed.", detail, status: result.status },
    { status: 502 },
  );
}
```

**Success shape — never includes key fields** (lines 84-89, unchanged):
```ts
return NextResponse.json({
  ok: true,
  provider: provider.name,
  model: provider.model,
  reply: (result.reply || "").slice(0, 200),
});
```

**Key masking convention** (lines 16-36) — GET/masking untouched:
```ts
function maskKey(key?: string): string {
  if (!key) return "";
  const k = String(key);
  if (k.length <= 8) return "****";
  return `${k.slice(0, 4)}…${k.slice(-4)} (${k.length} chars)`;
}
```

---

### `app/admin/page.tsx` (component, request-response)

**Analog:** itself — providers card (lines 244-321) is the extension surface; global test block (291-319) is deleted and replaced.

**Imports pattern** (lines 1-28) — add `RefreshCw` to the lucide block; `Rocket` becomes unused once the global Test button goes; keep `Loader2` (already imported, L9):
```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Cpu, Loader2, LogOut, Plus, Rocket, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
...
import { cn } from "@/lib/utils";
```

**Test state to replace** (lines 88-89) — becomes per-row maps:
```ts
// Test state
const [testing, setTesting] = useState(false);
const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
```
Replacement (same hooks style as the rest of the file):
```ts
const [testingId, setTestingId] = useState<string | null>(null);
const [rowResults, setRowResults] = useState<Record<string, { ok: boolean; text: string }>>({});
```

**runTest fetch pattern** (lines 165-188) — copy verbatim, parameterize with `id`, keep the exact user copy:
```ts
async function runTest() {
  setTesting(true);
  setTestResult(null);
  try {
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setTestResult({ ok: true, text: `Connected to ${data.provider} (${data.model}), replied: "${(data.reply || "").slice(0, 80)}"` });
    } else {
      setTestResult({ ok: false, text: data.detail || data.message || `Provider test failed (HTTP ${res.status}).` });
    }
  } catch {
    setTestResult({ ok: false, text: "Network error while testing." });
  } finally {
    setTesting(false);
  }
}
```

**Provider row + active badge** (lines 258-288) — keep the row card, `glass` styling, active highlight, and the success badge; add the standby badge on the else branch and a per-row Test button:
```tsx
<div key={p.id} className={cn("glass rounded-lg p-4", p.id === activeId && "border-primary/50")}>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="font-mono font-semibold text-foreground">{p.name}</span>
      {p.id === activeId ? (
        <Badge variant="success" className="text-[10px]">active</Badge>
      ) : null}
    </div>
    <span className="font-mono text-[11px] text-muted-foreground">{p.keyPreview || "no key"}</span>
  </div>
  ...
</div>
```

**Result-line styling convention** (lines 306-318) — reuse the two-tone `cn(...)` pattern for per-row result lines; success shifts to neutral `text-muted-foreground` per UI-SPEC, failure keeps the danger tone:
```tsx
<div className={cn(
  "mt-3 rounded-md border px-3 py-2 font-mono text-xs",
  testResult.ok ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger",
)}>
  {testResult.ok ? "✓ " : "✗ "}{testResult.text}
</div>
```

**Badge variants available** — `components/ui/badge.tsx` lines 9-15: `outline: "text-foreground"` and `success: "border-success/30 bg-success/15 text-success"`. Standby badge = `<Badge variant="outline" className="font-mono text-[10px]">standby</Badge>`.

**Spinner pattern** (lines 297-304) — per-row button copies `disabled={testingId === p.id}` + conditional `Loader2 h-3.5 w-3.5 animate-spin`; other rows stay enabled.

**Delete** lines 291-319 (global test block) entirely — replaced, not duplicated. **Unchanged:** `checkAuth` (L91-113), `ProviderShape` (L30-40), Generate Env tab, security-model card, read-only footer (L510-515).

---

## Shared Patterns

### Route handlers never throw
**Source:** `app/api/chat/route.ts` L54-98, L181-189; `app/api/providers/route.ts` L60-89
**Apply to:** both route files
Every failure returns `NextResponse.json({ error: <code>, message: <human text> }, { status: <4xx/5xx> })`. SSE failures are emitted as `data: {"error": ...}` events, never thrown. Error codes in use: `rate_limited`, `no_messages`, `provider_not_configured`, `unauthorized`, `invalid_url`, `test_failed`; new code adds `provider_not_found` (404) only.

### Admin auth guard
**Source:** `lib/admin-auth.ts` L13 (`adminConfigured`), L70 (`isAdminRequest`); applied at `app/api/providers/route.ts` L44/L55 as the FIRST statement
**Apply to:** providers route POST (already present — keep position)

### Rate limiting
**Source:** `lib/chat-http.ts` L35-49 (`rateLimit(key, limit)` — sliding 1-min window), `clientIp` L18-30
**Apply to:** chat route (`chat:<ip>`, 10/min, first statement) and providers-test route (`providers-test:<ip>`, 6/min, second statement after auth)

### SSRF gates run per outbound fetch
**Source:** `lib/providers.ts` L441-453 (`streamProvider`) and L543-558 (`callProvider`) — both run `validateProviderUrl` + `hostIsAllowed` internally on every call
**Apply to:** failover loop. Rules: (1) delete the route's hoisted pre-gate (chat route L92-98); (2) NEVER pass `opts.validatedUrl` in the loop — a URL validated for candidate A must never reach candidate B; (3) optional belt-and-braces explicit pre-check per candidate for a precise warn reason, with the internal gates remaining the enforcement point.

### Key redaction + 300-char cap (T-03-03)
**Source:** `app/api/chat/route.ts` L106-112; `app/api/providers/route.ts` L78
**Apply to:** chat route (generalize `redact` to strip EVERY candidate's `apiKey`, build the key list before the loop) and providers route (redact the *target's* key, not the active one). Cap: `.slice(0, 300)`.

### SSE event contract — exactly three keys
**Source:** emit sites `app/api/chat/route.ts` L150/158/161-163/183-188 (`sseEvent` L49-51); parser `components/chat-panel.tsx` L250-320
**Apply to:** chat route. Every `data:` line is one of `{"delta": string}` / `{"error": string}` / `{"done": true}`. No new event types, no identity fields.

### Defensive parsing
**Source:** everywhere — representative: `lib/providers.ts` L141-147, L489-499; `app/api/chat/route.ts` L71-79; `app/api/providers/route.ts` L174 (admin)
**Apply to:** all new parsing. `String(x ?? "")`, `Array.isArray(...)` guards, try/catch around JSON.parse, `unknown` casts with optional-chained extraction, `.slice()` caps on any string that crosses a boundary (300 detail / 200 reply / 12000 buffered reply).

### Logging register
**Source:** `lib/providers.ts` L51 (`console.error` for config problems); CONTEXT decision — `console.warn` fits failover events
**Apply to:** failover loop — one `console.warn` per pre-token failure: `[chat] provider "<id>" failed before first token (<short reason>); failing over` (or `no candidates left`). No PII, no provider names in any visitor-bound string.

---

## No Analog Found

| Function (new, inline in existing files) | Role | Data Flow | Reason / Closest starting point |
|------------------------------------------|------|-----------|--------------------------------|
| `orderedChatCandidates()` (recommended in `lib/providers.ts`) | service helper | transform | No ordered-candidate builder exists. Copy shape from `getActiveProvider()` (`lib/providers.ts` L56-61): filter `!isImageProvider`, active first, dedupe by id, registry order after. Candidate[0] must equal `getActiveProvider()`'s return (R7). Research Section 2(a) has the reference implementation. |
| `readFirstDelta()` first-token probe (recommended in `app/api/chat/route.ts`) | route helper | streaming | No probe exists. The parse loop inside is a direct lift of chat route L126-155 (same decoder/buffer/line-split/payload extraction); wrap it in a probe that returns `{ok, reader, pendingDeltas, tailBuffer}` or `{ok:false, err}`. Research Section 3 has the reference implementation. |
| Shared failover timeout budget (R2) | route helper | transform | No elapsed-budget pattern exists. Use `Date.now()` delta feeding `streamProvider`'s existing `opts.timeoutMs` (providers.ts L436/L458): `Math.min(120_000, 170_000 - elapsed)` per candidate. |
| *(if extracted)* `lib/chat-failover.ts` | utility | transform | No dedicated failover module exists; `lib/chat-http.ts` (49 lines, plain helpers, no framework deps beyond the `NextRequest` type) is the style template. |

---

## Must-Not-Change Invariants (verified anchors)

| Invariant | Anchor (verified in working tree) |
|---|---|
| Visitor client untouched | `components/chat-panel.tsx`: `DAILY_LIMIT = 30` (L40), SSE parser (L250-320), name gate (L407-465); `app/chat/page.tsx` |
| Image path untouched | `app/api/image/route.ts`, `resolveImageTarget` (`lib/providers.ts` L76-89), `generateImage` (L108-262) |
| SSE headers/encoder byte-identical | chat route L43-51; `maxDuration = 180` L41 + `vercel.json` L11-13 (image routes at 300, L5-10) |
| Config immutability | failover never writes `AI_PROVIDERS_JSON` / `activeId`; admin footer L510-515 |
| PRES-01 | no provider/model identity in any emitted SSE string, error detail, or DOM; visitor error copy stays the existing generic message |
| Own rate limits before provider contact | chat 10/min (route L54-59); providers-test 6/min (providers route L56-58) |

## Metadata

**Analog search scope:** `app/api/**`, `app/admin/**`, `lib/**`, `components/**` (full file list enumerated; 50 .ts/.tsx source files)
**Files read in full:** `app/api/chat/route.ts` (193), `app/api/providers/route.ts` (90), `lib/providers.ts` (645), `lib/chat-http.ts` (49), `lib/admin-auth.ts` (80), `app/admin/page.tsx` (518), `components/ui/badge.tsx` (32)
**Git tracking:** all analog paths verified `git ls-files`-tracked (no mirror/gitignored paths)
**Pattern extraction date:** 2026-11-07

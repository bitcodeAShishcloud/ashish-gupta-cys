# Phase 4 Research — Multi-Provider Chat with Automatic Failover

Researched: 2026-11-07 · Read-only pass over the shipped v0.0.0.0.1 chat architecture.
All paths relative to repo root. Line numbers verified against working tree at commit `8a9f969`.

**Note on the security register:** the brief cites `.planning/milestones/v0.0.0.0.1-phases/01-streaming-chat-de-branded-presentation/01-SECURITY.md`, which does not exist. The live threat register is `.planning/milestones/v0.0.0.0.1-phases/03-image-generation-mode-in-chat/03-SECURITY.md` (frontmatter `threats_open: 0`). The constraints that must stay closed are T-03-03 (API-key redaction + 300-char cap on all error detail) and T-03-04 (SSRF posture). PRES-01 verification evidence lives in `01-VERIFICATION.md` (lines 19–20, 31).

---

## 1. Current State (evidence, file:line)

### Provider layer — `lib/providers.ts`
- `loadProviders()` L38–54: parses `AI_PROVIDERS_JSON` (bare array or `{activeId, providers[]}`), defaults `activeId` to `list[0]?.id` (L48). Invalid JSON → `console.error` + empty registry (L50–53).
- `getActiveProvider()` L56–61: finds `id === activeId && !isImageProvider(p)`; **falls back to the first chat provider** if activeId is missing/matches an image entry (L60).
- `isImageProvider()` L64–66: `type === "image"` or `/\/images\//` in baseUrl.
- `validateProviderUrl()` L277–303: https-only, rejects localhost/.local/.internal, cloud metadata, private/reserved IPs.
- `allowedHosts()` L336–342 / `hostIsAllowed()` L344–349: positive whitelist from `AI_ALLOWED_HOSTS`; unset → any public https host.
- `providerDefaults()` L402–412: resolves endpoint/authHeader/authPrefix/responseField/maxOutput/contextWindow per provider.
- `streamProvider()` L433–530: **runs both SSRF gates internally per call** — `validateProviderUrl` L441–444, `hostIsAllowed` L446–453. Single abort timer covering the whole stream (L455–458, cleared by `dispose()` L520 / L166–170 in the route). Returns `{ok:false, status, detail}` for: HTTP error incl. 429 (L488–501), empty body (L503), non-SSE content-type → `notStreamable: true` (L505–515), AbortError → 504 (L525–527), network error → 502 (L528). `opts.validatedUrl` (L436) lets a caller pass a pre-validated URL — per-provider, must never be reused across providers.
- `callProvider()` L532–645: same internal gates (L543–546, L551–558), 60s default timeout (L561), HTTP error → `{ok:false}` (L595–601), unrecognized/empty reply shape → 502 (L624–632), reply capped at 12 000 chars (L635), AbortError → 504 (L638–640).
- `trimToContext()` L373–391: pure function — safe to re-run per candidate.

### Chat route — `app/api/chat/route.ts` (193 lines)
- L22–25: `RATE_LIMIT` 10/min/IP, `MAX_INPUT` 1000, history caps.
- L41: `export const maxDuration = 180` (mirrored in `vercel.json` L11–13).
- L43–47: `SSE_HEADERS`; L49–51: `sseEvent()`.
- L54–59: own per-IP rate limit → 429 JSON (this is OUR 429, unrelated to provider 429).
- L61–79: message + history sanitization.
- L81–91: `getActiveProvider()`; missing/keyless/model-less → 503 `provider_not_configured` **before any provider contact**.
- L92–98: `validateProviderUrl` pre-gate on the active provider's baseUrl → 503.
- L101–103: `providerDefaults(provider)` → `trimToContext` → `upstream` message list (built from the ACTIVE provider's contextWindow only).
- L106–112: `redact()` closure — strips **only the active provider's** apiKey from error text, caps at 300 chars.
- L115: `const streamed = await streamProvider(provider, upstream)`.
- L116–174: streaming branch. `ReadableStream.start()` (L120–167) parses upstream SSE lines (L133–155), extracts `choices[0].delta.content` (L145–148), emits `push({delta})` (L150) with `sentChars` accounting. **Mid-stream failure** → catch L157–159 emits `{error}`; `finally` L160–163: if `sentChars === 0` emits `{error: "The AI provider returned an empty response."}`; always ends `{done:true}` (L163), `controller.close()` (L164), `dispose()` (L165). `cancel()` → `dispose()` (L168–170).
- L176–192: buffered fallback (reached only when `streamed.ok === false`, incl. `notStreamable`): `callProvider` (L178) → single `{delta: reply}` (L186) or `{error: redact(detail)}` (L181–184), then `{done:true}` (L188).

### Providers admin API — `app/api/providers/route.ts` (91 lines)
- `maskKey()` L16–21; `publicShape()` L23–36 (hasKey L33, keyPreview L34 — keys never returned raw).
- GET L43–50: guard `adminConfigured() && isAdminRequest(req)` (L44) → `{activeId, providers[]}`.
- POST L54–90: guard (L55), rate limit 6/min (L56–58), `getActiveProvider()` (L60), viability check (L61–66), URL gate (L67–70), ping via `callProvider` (L72–75), failure → HTTP 502 `{error:"test_failed", message, detail(key-redacted via L78), status}` (L77–83), success → HTTP 200 `{ok:true, provider, model, reply}` (L84–89). **The POST handler never reads the request body today** — no `readJsonBody` call, `action` is not checked server-side; `{action:"test"}` is admin-page convention only.
- Guard helpers: `lib/admin-auth.ts` L13 (`adminConfigured`), L70 (`isAdminRequest`).

### Admin console — `app/admin/page.tsx`
- L88–89: global test state `testing` / `testResult`.
- L165–188: `runTest()` — POST `{action:"test"}` (L172), success line L176 `Connected to ${data.provider} (${data.model}), replied: "…"`, failure L178–181 (`data.detail || data.message || HTTP status`), network catch L183–184 `"Network error while testing."`.
- L249–289: provider rows — name + model + `keyPreview`; active badge exists (L271–275, `<Badge variant="success">`); **no standby badge**.
- L291–319: the single global Test button + shared result line (to be replaced).
- L5–16: lucide imports — `Rocket` present; **`RefreshCw` not imported**. `Badge` variants `success`/`outline` exist in `components/ui/badge.tsx` L13–14.

### Visitor side (must not change)
- `components/chat-panel.tsx`: `DAILY_LIMIT = 30` (L40); `send()` L227–325 — fetch L239–243, non-OK → throw (L244–248), assistant message appended **before first read** (L252–253), SSE parser accepts only `delta`/`error`/`done` (L269–293), `streamError` → throw (L295), error path rolls back both messages (L313–320). Name gate L407–465. `app/chat/page.tsx` is a 12-line wrapper around `<ChatPanel />`.

### Deploy config
- `vercel.json` L11–13: `app/api/chat/route.ts` `maxDuration: 180`; image routes already at 300 (L5–10) — so 300 is proven available on this plan.
- `next.config.mjs`: security headers only; **no `functions` config, no serverless timeout settings beyond the above**.

---

## 2. Failover Loop Design (line-anchored insertion points)

All changes are inside `POST` in `app/api/chat/route.ts`. The loop replaces the single-provider block L81–98 and the two response branches L114–192. L54–79 (rate limit, input, history) are untouched.

**(a) Ordered candidate list — recommended in `lib/providers.ts`** (CONTEXT leaves location to discretion; providers.ts already owns registry logic and keeps the route thin):

```ts
export function orderedChatCandidates(): ProviderConfig[] {
  const reg = loadProviders();
  const chat = reg.providers.filter((p) => !isImageProvider(p));
  const active = getActiveProvider();          // same fallback as today (L56–61)
  if (!active) return chat;
  return [active, ...chat.filter((p) => p.id !== active.id)]; // active first, dedup by id, registry order after
}
```

Critical consistency rule: candidate[0] **must be the provider `getActiveProvider()` returns** — including its silent fallback when `activeId` is empty/invalid (L60) — otherwise the admin "active" badge and the failover order disagree.

**(b) Route restructure:**

1. L81–91 → viability filter + gate:
   ```ts
   const candidates = orderedChatCandidates()
     .filter((p) => p.apiKey && p.model);       // keyless/model-less candidates are skipped, not attempted
   if (candidates.length === 0) { /* existing 503 provider_not_configured response, L82–90 verbatim */ }
   ```
   Skipping keyless candidates preserves today's semantic (L82 required `apiKey` on the active provider) and avoids a guaranteed-401 round trip (`streamProvider` would send `Bearer ""`, L464).
2. **Delete the single-provider URL pre-gate L92–98.** Gating moves inside the loop (Section 4). A candidate with an invalid URL is a pre-first-token failure, not a 503.
3. Keep L101–103 conceptually but move upstream construction **inside the loop**: `trimToContext` is pure (L373–391) and the context window is per-provider (`providerDefaults(candidate).contextWindow`). Trimming once with the active provider's window would send an over-long payload to a standby with a smaller window and fail it spuriously. Per-candidate trim is O(messages ≤ 24) — negligible.
4. L106–112 `redact` → generalize to the **set of all candidates' apiKeys** (build once before the loop):
   ```ts
   const keys = candidates.map((p) => p.apiKey).filter(Boolean) as string[];
   const redact = (text: unknown) => {
     let out = String(text ?? "");
     for (const k of keys) if (out.includes(k)) out = out.split(k).join("***");
     return out.slice(0, 300);
   };
   ```
   Today's version strips only the active key; with failover, the surfaced error may originate from any candidate (see Risks R5).
5. **The loop** replaces L114–192:
   ```ts
   let lastErr = { detail: "The AI provider failed to respond.", status: 502 };
   for (let i = 0; i < candidates.length; i++) {
     const candidate = candidates[i];
     const d = providerDefaults(candidate);
     const upstream = trimToContext(SYSTEM_PROMPT, history, d.contextWindow, d.maxOutput);
     upstream.push({ role: "user", content: message });

     const streamed = await streamProvider(candidate, upstream);   // gates run inside (providers.ts L441–453)
     if (streamed.ok && streamed.stream) {
       const probe = await readFirstDelta(streamed.stream);        // Section 3 — commit point
       if (probe.ok) {
         return sseResponseFrom(probe.reader, probe.pendingDeltas, probe.tailBuffer, redact);
       }
       streamed.dispose?.(); await probe.cancel();                 // clear timer + abandon upstream (R4)
       lastErr = probe.err;
       console.warn(`[chat] provider "${candidate.id}" failed before first token (${probe.err.detail}); ${i < candidates.length - 1 ? "failing over" : "no candidates left"}`);
       continue;
     }
     if (streamed.notStreamable) {
       const result = await callProvider(candidate, upstream);     // same-candidate buffered fallback (locked)
       if (result.ok) return bufferedDeltaResponse(result, redact); // reuse today's L179–191 shape
       lastErr = { detail: result.detail || lastErr.detail, status: result.status ?? lastErr.status };
     } else {
       lastErr = { detail: streamed.detail || lastErr.detail, status: streamed.status ?? lastErr.status };
     }
     console.warn(`[chat] provider "${candidate.id}" failed before first token (${lastErr.detail}); ${i < candidates.length - 1 ? "failing over" : "no candidates left"}`);
   }
   // all candidates failed → last error wins, existing error path:
   return bufferedErrorResponse(lastErr, redact);                   // reuse today's L181–189 shape
   ```
   The three response builders are the existing code, relocated unchanged: streaming pass-through (L118–173), single-delta buffered (L179–191), buffered error (L181–189 subset). SSE_HEADERS/sseEvent/maxDuration untouched.

**(c) What composes with what, per candidate** (locked by 04-AI-SPEC "stream→buffered fallback preserved per candidate"):
- `streamProvider` ok → probe → commit → pass-through stream (no buffered retry for this candidate).
- `streamProvider` `notStreamable` → **same candidate** via `callProvider` → single delta. (Capability fallback, not a failure retry.)
- Any other `streamProvider` false, or `callProvider` false, or probe failure → candidate consumed → advance to next candidate.
- A probe failure does **not** fall back to the same candidate's buffered path — the provider already failed pre-token; a same-provider retry doubles latency for a likely-repeat failure. (Planner may overrule; recommendation: advance.)

---

## 3. Failure Detection (pre-first-token vs mid-stream)

**The `streamProvider() → ok` boundary is NOT sufficient.** `streamed.ok === true` only means the upstream returned 200 with `text/event-stream` (providers.ts L505–517). The connection can then die or yield zero content-bearing events — exactly the "malformed/empty reply" triggers locked in 04-CONTEXT. Today those surface as visitor-facing errors (route L157–163) even when a healthy standby exists, which would violate success criterion 2. Hence a **first-token probe**:

```ts
// Reads the upstream reader until the first parseable delta piece.
// Reuses the exact line-parsing of route.ts L130–155.
async function readFirstDelta(stream: ReadableStream<Uint8Array>): Promise<Probe> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    let chunk;
    try { ({ done, value: chunk } = await reader.read()); }
    catch (err) { return { ok: false, err: { detail: msg(err), status: 502 }, reader }; }
    if (done) return { ok: false, err: { detail: "The AI provider returned an empty response.", status: 502 }, reader };
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const piece = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content;
        if (typeof piece === "string" && piece) {
          return { ok: true, reader, pendingDeltas: [piece], tailBuffer: buffer };
        }
      } catch { /* keep-alive / partial line — skip, same as L152–154 */ }
    }
  }
}
```

- **Probe succeeds** → commit point. Construct the `Response` only now: the stream first enqueues the pending delta(s), then continues the existing read loop from the already-held `reader` (identical parsing to L133–155; `sentChars` starts at the pending piece's length). From commit onward the behavior is byte-identical to today.
- **Probe fails (throw or EOF before any piece)** → pre-first-token failure → `reader.cancel()` + `dispose()` → failover.
- This design structurally guarantees **no byte reaches the visitor before a candidate is committed** — which is what eliminates the double-send risk (R1). The `Response`/200 status is only returned after a token exists; the client's `assistantAdded` append (chat-panel L252–253) and `firstToken` flag (L276) behave exactly as today.

**Mid-stream failure (after commit) — no cross-provider retry**, per 04-CONTEXT ("after the first delta reached the visitor… a retry would duplicate text"):
- Upstream read throw after commit → route catch (L157–159 relocated) emits `{error: redact(...)}` then `{done:true}`. Client throws (chat-panel L295), rolls back both messages (L313–320). Unchanged.
- A stream that yields ≥1 delta then dies can never fail over — the visitor already rendered text; a retry would concatenate two replies.

**Buffered-path failure detection is already complete:** `callProvider` returns `{ok:false}` for HTTP errors incl. 429 (L595–601), empty/unrecognized/empty-after-responseField replies (L603–633), timeouts (L638–640). No extra detection needed — `ok` is the pre-first-token signal for that candidate.

**Timeout detection:** the per-candidate abort timer covers headers + body-start + probe (providers.ts L455–458 comment); AbortError → `{ok:false, status:504}` (L525–527) → failover. 120s default stands per candidate (see R2 for the budget math).

---

## 4. Candidate Ordering & Gates

**Ordering** (locked in 04-CONTEXT): active provider first, then remaining chat providers in `AI_PROVIDERS_JSON` array order — exactly the helper in Section 2(a). Image providers (`isImageProvider`, L64–66) are excluded from candidates entirely; image generation keeps `resolveImageTarget()` (L76–89) untouched. Duplicate ids in the config: dedupe by id in the helper; `POST {id}` resolution takes the first match (`Array.find`).

**SSRF gates per candidate — confirmed both run inside the loop.** `streamProvider` runs `validateProviderUrl` (L441–444) then `hostIsAllowed` (L446–453) on every invocation; `callProvider` does the same (L543–546, L551–558). Because the loop invokes these functions per candidate, the gates run per candidate **with zero new code** — provided:
1. The route's old hoisted pre-gate (L92–98) is deleted, not kept (it references the active provider only and would misreport).
2. **`opts.validatedUrl` is never passed** in the loop (leave both opts objects empty, as today at L115/L178). A URL validated for candidate A must never be handed to candidate B — that would bypass B's gate entirely.
3. Optional belt-and-braces: an explicit loop pre-check (`validateProviderUrl(candidate.baseUrl)` + `hostIsAllowed(new URL(...).hostname)`) to `continue` with a clean warn line before spending the fetch. Redundant with the internal gates but makes the warn reason precise. Either way the internal gates remain the enforcement point (04-AI-SPEC: "run per candidate provider inside the loop, not once").

A candidate blocked by either gate returns `{ok:false, status:503}` → treated as any other pre-token failure → failover. This is also the evaluation lever for the test matrix (V.3/V.4).

---

## 5. Test Endpoint Extension (`{id}` param) — `app/api/providers/route.ts` POST

Current POST never reads the body (Section 1). Extension, keeping the guard order intact:

```ts
export async function POST(req: NextRequest) {
  if (!adminConfigured() || !isAdminRequest(req)) return unauthorized();      // L55 unchanged
  if (!rateLimit("providers-test:" + clientIp(req), 6)) { /* L56–58 unchanged */ }

  const body = await readJsonBody(req);                                       // NEW import from "@/lib/chat-http"
  const id = typeof body.id === "string" ? body.id.trim() : "";               // optional {id}
  const target = id
    ? loadProviders().providers.find((p) => p.id === id)                      // first match wins
    : getActiveProvider();                                                    // absent → active (backward compatible)
  if (id && !target) {
    return NextResponse.json({ error: "provider_not_found", message: "No provider with that id is configured." }, { status: 404 });
  }
  if (!target || !target.apiKey || !target.model) { /* L61–66 message unchanged */ }
  const urlError = validateProviderUrl(target.baseUrl);                       // L67–70, now on target
  const result = await callProvider(target, [ /* same ping messages, L72–75 */ ]);
  if (!result.ok) {
    const detail = result.detail ? String(result.detail).replace(target.apiKey ?? "", "***").slice(0, 300) : "";  // L78 — redact TARGET's key
    return NextResponse.json({ error: "test_failed", message: "Provider test failed.", detail, status: result.status }, { status: 502 });
  }
  return NextResponse.json({ ok: true, provider: target.name, model: target.model, reply: (result.reply || "").slice(0, 200) });  // L84–89
}
```

Contract points:
- **Auth guard intact**: `adminConfigured() && isAdminRequest(req)` stays the first statement (L55; helpers at `lib/admin-auth.ts` L13/L70). GET's guard (L44) untouched.
- **Rate limit intact**: 6/min/IP (L56–58) — shared across rows; at 2 providers, per-row testing fits comfortably.
- **Keys stay masked**: response carries `provider` (name), `model`, `reply` only — no key fields (L84–89 unchanged shape). GET masking (`publicShape` L23–36, `maskKey` L16–21) untouched. Failure detail redacts the **target's** key (L78 currently uses the active provider — must switch to `target`), 300-char cap kept (T-03-03).
- **Backward compatible**: no `id` → active provider, byte-identical responses.
- **Response contract for the UI** (unchanged shapes, so `runTest`'s handling at admin L174–181 keeps working): success HTTP 200 `{ok:true, provider, model, reply}`; failure HTTP 502 `{error:"test_failed", message, detail, status}`; 401 `{error:"unauthorized"}`; 404 `{error:"provider_not_found"}`; 429 `{error:"rate_limited"}`. (04-UI-SPEC phrases failure as `{ok:false, detail}` — the existing HTTP-502 shape already carries `detail` and the page reads `data.detail || data.message`; keeping the current shape is the smaller diff and satisfies the UI contract.)
- **Image-typed rows**: admin lists ALL providers (`publicShape` over `reg.providers`, L48). Testing an `type:"image"` row via `callProvider` will hit `/chat/completions` on an image base URL and honestly fail (404/unrecognized shape). Per UI-SPEC "every row" is the contract; document the caveat rather than special-casing — image health is the image flow itself (out of scope per 04-CONTEXT deferred).

---

## 6. Admin Console Changes — `app/admin/page.tsx` (Providers card only)

**State (replaces L88–89):**
```ts
const [testingId, setTestingId] = useState<string | null>(null);                                  // which row is testing
const [rowResults, setRowResults] = useState<Record<string, { ok: boolean; text: string }>>({});  // per-row result line
```

**`runTest(id: string)`** (rewrites L165–188): body `JSON.stringify({ action: "test", id })`; on success set `rowResults[id] = { ok: true, text: \`Connected to ${data.provider} (${data.model}), replied: "${(data.reply || "").slice(0, 80)}"\` }`; failure `data.detail || data.message || \`Provider test failed (HTTP ${res.status}).\``; network catch `"Network error while testing."` — all identical copy to today, now stored per id. A 404 (unknown id, e.g. stale list) lands in the same failure branch.

**Row rendering (L258–288):**
- Keep the active badge (L271–275). Add the standby badge on the else branch: `<Badge variant="outline" className="font-mono text-[10px]">standby</Badge>` (outline variant exists, badge.tsx L13). Exactly one row can be active (`getActiveProvider` returns one).
- Add a per-row Test button (`h-8 px-3 text-xs`, outline, mono, `RefreshCw h-3.5 w-3.5`), `disabled={testingId === p.id}`, spinner `Loader2 h-3.5 w-3.5 animate-spin` while that row tests; other rows stay enabled. Requires importing `RefreshCw` from lucide (L5–16); `Rocket` becomes unused once the global block goes.
- Result line rendered under the row (inside the row's card div): neutral `text-muted-foreground` for success per UI-SPEC (NOT the old green box), danger styling for failure (keep `text-danger` language).

**Delete** the global test block L291–319 (button + shared result line) — UI-SPEC: replaced, not duplicated.

**Unchanged:** `checkAuth` providers fetch (L97–102), `ProviderShape` (L30–40), masked `keyPreview` display (L277–279), "Generate Env" tab, security-model card, footer read-only note (L512), 44px+ touch targets.

---

## 7. Must-Not-Change Invariants & Guards

| Invariant | Where it lives | Guard check |
|---|---|---|
| SSE event contract: only `{"delta"}` / `{"error"}` / `{"done"}` | emit sites route L150/158/161–163/183–188; parser chat-panel L269–293 | `curl -N POST /api/chat` → every `data:` line parses to exactly one of the three keys; grep new route for `sseEvent(`/`push(` calls |
| Name gate | chat-panel L407–465 | `git diff --stat` lists no `components/` files |
| `DAILY_LIMIT = 30` | chat-panel L40 (counter text L964–966) | grep `DAILY_LIMIT` — still 30 (Phase 6 owns 50) |
| Visitor client untouched | `components/chat-panel.tsx`, `app/chat/page.tsx` (12-line wrapper) | `git diff --stat` must show neither (UI-SPEC hook) |
| Image mode + no image failover | `app/api/image/route.ts` (uses `resolveImageTarget` L76–89), `generateImage` L108–262 | no diff under `app/api/image/`; `resolveImageTarget`/`generateImage` untouched in providers.ts |
| PRES-01: no provider/model identity in public stream or DOM | server never emits identity (01-VERIFICATION L19–20, L31); visitor error copy stays generic | grep stream + `/chat` HTML for `model`/`provider`/candidate brand names → zero; error detail is redacted provider text exactly as today (do not add provider names to any emitted string) |
| Key redaction + 300-char cap (T-03-03) | route `redact` L106–112; providers route L78 | generalized redact strips **every** candidate's key; cap kept |
| SSRF gates per outbound fetch (T-03-04 posture) | providers.ts L441–453 / L543–558 | loop never passes `validatedUrl` across providers; gates provably run per candidate (test V.4) |
| Own rate limits | chat 10/min (route L22, L54–59); providers-test 6/min (providers L56–58) | unchanged; our 429 returns before any provider contact |
| SSE headers / encoder | L43–51 | byte-identical |
| Config immutability at runtime | server never writes `AI_PROVIDERS_JSON`; admin panel read-only (page L512); 04-AI-SPEC guardrail | failover never mutates `activeId` or registry (stateless per request) |
| `maxDuration ≥ 180` for chat | route L41 + vercel.json L11–13 | if R2 mitigation raises it, both move together |

---

## 8. Edge Cases

1. **Single provider configured** → `candidates.length === 1`; loop runs once; any failure falls out to the last-error block. Behavior identical to today; warn line reads "no candidates left". No 503, no special casing needed.
2. **Zero providers / empty registry** → filter yields `[]` → existing 503 `provider_not_configured` (L82–90 verbatim). Empty `providers` array or missing env both land here.
3. **Invalid `AI_PROVIDERS_JSON`** → `loadProviders` catch (providers.ts L50–53): `console.error` + empty registry → same 503. Preserved by construction.
4. **Provider with no `apiKey`** (or no `model`) → filtered out of candidates before the loop (Section 2(b)1) — cheaper than a doomed request (`Bearer ""` → guaranteed 401, providers.ts L464). If ALL candidates are keyless → 503 (same as today's L82 check).
5. **`activeId` empty / invalid / points at an image provider** → `getActiveProvider` falls back to first chat provider (L60); candidate[0] is that fallback; admin badge shows whatever GET reports (`activeId` echo at providers L47 — note: GET echoes raw `reg.activeId` even when no row matches it; the page's badge logic `p.id === activeId` then shows zero active badges. Pre-existing cosmetic quirk, not introduced by this phase; failover order and admin remain self-consistent via `getActiveProvider`).
6. **Both providers fail** → loop exhausts → buffered error stream with the **last** candidate's `detail` (redacted, capped) + `done`. Visitor sees the existing generic error box (chat-panel L589–592/761–765); no silent fallback, no provider names added by our code.
7. **Upstream 429** → `res.ok === false` in `streamProvider`/`callProvider` (providers.ts L488–501 / L595–601) → pre-first-token failure → **failover triggers** (locked in 04-CONTEXT). Distinct from our own chat 429 (route L54–59), which returns before any provider work and never fails over.
8. **Duplicate provider ids** in the JSON → candidate dedupe by id; test-by-id resolves first match.
9. **Standby with smaller `contextWindow`** → per-candidate `trimToContext` (Section 2(b)3) prevents over-long payloads.
10. **Provider sends keep-alives / partial lines before first token** → probe's parser skips non-`data:` lines and unparseable payloads (same as L135/152–154) — a chatty-but-healthy stream still commits correctly.
11. **Image-typed provider in the admin list** → listed and testable; the test will honestly fail (Section 5 caveat); never a chat candidate.

---

## 9. Risks & Mitigations

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| R1 | **Double-send**: retry after a delta reached the visitor duplicates text (`full` in chat-panel L276–283 would concatenate) | CONTEXT locks no-mid-stream-retry; chat-panel L252–253 appends before first read | Structural: commit-before-emit probe — zero bytes enqueued until a candidate produces its first token (Section 3). No delta can precede the failover decision |
| R2 | **Worst-case 240s across two providers vs 180s cap**: two 120s pre-token timeouts (providers.ts L458) exceed `maxDuration` (route L41, vercel.json L11–13) → Vercel kills mid-second-try, visitor gets a dropped connection | vercel.json chat=180, image routes already at 300 (L5–10, commit d16c2b3 raised them) | Either (a) shared failover budget: per-candidate `timeoutMs = Math.min(120_000, 170_000 - elapsed)` passed via `streamProvider`'s existing `opts.timeoutMs` (L436); or (b) raise chat `maxDuration` to 300 in BOTH route L41 and vercel.json (plan already allows 300). Recommend (a) for this phase; (b) optional, touches deploy config Phase 5 owns |
| R3 | **Buffering memory** in probe/buffered paths | probe holds only the chunks needed to reach the first `data:` line (one SSE line + tail); post-commit is pure pass-through (no accumulation beyond `buffer` tail, L130–132); `callProvider` already buffers a full reply, capped 12 000 chars (providers.ts L635) | No new unbounded buffer introduced; keep the 300-char detail cap and 12k reply cap |
| R4 | **Abandoned upstream stream leak** on failover (socket + 120s timer held while trying candidate 2) | `streamProvider` timer cleared only via `dispose()` (L520) or body cancel (L509–512) | On probe failure: `await reader.cancel()` (best-effort) + `streamed.dispose?.()` before advancing; same for a discarded notStreamable path |
| R5 | **Redaction gap**: `redact` captures only the active key (route L106–112); a failover error from candidate B could echo candidate A's key (e.g., echo servers) or B's own key would be missed if redact stayed bound to A | T-03-03 requires all browser-bound detail redacted | Generalize `redact` to strip every candidate's key before the loop (Section 2(b)4) |
| R6 | **Provider brand names inside upstream error detail** could leak identity through the existing detail passthrough (e.g., "OpenRouter: insufficient credits") | PRES-01; today's exposure class unchanged but failover adds a second provider's phrasing | Keep the existing passthrough (it IS the current generic path) plus optional cheap scrub: split/join each candidate's `name` out of the detail before emitting. Decide at plan time; never add names ourselves |
| R7 | **Ordering divergence** between failover candidate[0] and the admin "active" badge when `activeId` is unset/invalid | `getActiveProvider` silently falls back (L56–61) | Candidate list must reuse `getActiveProvider()` as candidate[0] (Section 2a) |
| R8 | **Keyless candidate wasted round trip / confusing 401s** | `streamProvider` sends `Bearer ""` (L464) | Viability filter before the loop (Section 2b1) |
| R9 | **providers-test rate limit shared across rows** (6/min) while per-row buttons invite clicking | providers L56–58 | Acceptable at 2 providers; failure surfaces as the row's 429 `message` — self-explanatory |
| R10 | **Probe slightly changes empty-stream semantics**: an upstream 200-SSE that ends with zero deltas now fails over instead of erroring | CONTEXT lists "malformed/empty reply" as failover triggers — this is the intended behavior change; flag so verification expects it | Covered by test V.7 |

---

## Validation Architecture

Manual matrix against `next dev` (never run `npm run build` while dev holds `.next` — 01-VERIFICATION L36, STATE.md blockers):

1. `npx tsc --noEmit` → exit 0 (AI-SPEC regression bar).
2. **Happy path** (both providers valid): `curl -N POST /api/chat` → progressive deltas + `{"done":true}`; every event key ∈ {delta, error, done}.
3. **Failover on pre-token HTTP failure**: set candidate-1's apiKey invalid → reply still streams (from candidate 2); exactly one `console.warn` `[chat] provider "p1" failed before first token (…)`; upstream hit count proves **one** retry, no more.
4. **Failover on gate block**: set `AI_ALLOWED_HOSTS` to candidate-2's host only → candidate-1 blocked by `hostIsAllowed` (proves per-candidate gating, Section 4) → reply streams from candidate 2.
5. **Failover on invalid URL**: candidate-1 `baseUrl: "http://…"` → `validateProviderUrl` reject → failover.
6. **All fail** (both keys invalid): single `{error: <last candidate's redacted detail>}` + `{done:true}`; visitor error box shows the generic copy; response contains no key material (check the 300-char redacted detail).
7. **Empty stream probe**: mock upstream returns 200 `text/event-stream` then closes with zero deltas → failover (R10), not an error event.
8. **notStreamable preserved**: candidate-1 ignores `stream:true` (JSON body) → same-candidate buffered single-delta success (existing CHAT-03 behavior per candidate).
9. **Mid-stream failure, no retry**: mock closes after 2 deltas → `{error}` + `{done}`, no second provider hit, client rollback as today.
10. **429**: mock 429 from candidate-1 → failover to candidate-2.
11. **Single/zero provider**: one-provider config → identical to shipped behavior; `{}` / garbage JSON → 503 `provider_not_configured`.
12. **Admin**: exactly one `active` badge; per-row Test works on active AND standby; standby failure renders inline under that row only; masked keys still `sk-x…xxxx (n chars)`; unknown `id` → 404 line; GET still masks.
13. **PRES-01 sweep**: `curl /chat` HTML + captured stream grepped for `model` / `provider` / brand strings → zero hits.
14. **Diff scope**: `git diff --stat` shows only `app/api/chat/route.ts`, `app/api/providers/route.ts`, `app/admin/page.tsx`, optionally `lib/providers.ts`, + planning docs. `components/chat-panel.tsx`, `app/chat/**`, `app/api/image/**` absent.
15. **Image smoke**: one image generation still completes (image path untouched).

AI-SPEC's evaluation table (failover correctness / contract safety / visitor parity / admin parity / regression) maps 1:1 onto items 3–14 above.

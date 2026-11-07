---
phase: 04-multi-provider-chat-with-automatic-failover
plan: 01
subsystem: api
tags: [sse, streaming, failover, ai-providers, nextjs, ssrf, redaction]

# Dependency graph
requires:
  - phase: 01-streaming-chat-de-branded-presentation (v0.0.0.0.1)
    provides: same-origin SSE chat route contract (delta/error/done), lib/providers.ts registry + streamProvider/callProvider with internal SSRF gates
  - phase: 03-image-generation-mode-in-chat (v0.0.0.0.1)
    provides: T-03-03 redaction bar (300-char cap), frozen visitor client contract
provides:
  - orderedChatCandidates(): ProviderConfig[] export in lib/providers.ts (active first incl. silent fallback, registry order, id-deduped, image entries excluded)
  - Failover loop in POST /api/chat with a first-token commit probe (readFirstDelta) — zero visitor bytes before a candidate is committed
  - Locked failover log format: [chat] provider "<id>" failed before first token (<reason>); failing over / ; no candidates left
  - Multi-candidate key redaction (every viable candidate's apiKey stripped, 300-char cap kept)
  - Shared 170000 ms failover budget via per-candidate opts.timeoutMs (maxDuration stays 180)
affects: [04-02-multi-provider-admin-console, phase-5-production-deploy]

# Actuals (#2632) — pairs with the plan's estimate (65000 tokens) to calibrate future estimates.
actuals:
  tokens: 4253        # chars/4 over the realized diff (17011 chars across lib/providers.ts + app/api/chat/route.ts)
  tasks: 3
  commits: 1          # MEASURED: git rev-list --count 0ef746085a73d49b2d35f16b28841433205db735..HEAD at summary write; plan metadata docs commit follows separately

plan_head_before: 0ef746085a73d49b2d35f16b28841433205db735
plan_head_after: 2148cb30425bc44a8dd691f1176dd734451e83b6
commits: 1

# Tech tracking
tech-stack:
  added: []           # 04-AI-SPEC: no new dependencies
  patterns:
    - "First-token probe commit point: the SSE Response is only constructed after readFirstDelta parses the first delta, so failover can never duplicate text"
    - "Ordered candidate failover loop: active provider first (reusing getActiveProvider() so admin badge and failover order can't diverge), remaining chat providers in AI_PROVIDERS_JSON order, deduped by id"
    - "Shared failover budget: per-candidate timeoutMs = max(5000, min(120000, 170000 - elapsed)) keeps N attempts under the 180s maxDuration"
    - "Capability fallback preserved per candidate: streamProvider notStreamable → same-candidate callProvider buffered single delta"

key-files:
  created: []
  modified:
    - lib/providers.ts
    - app/api/chat/route.ts

key-decisions:
  - "candidate[0] is exactly getActiveProvider()'s return value (including its silent fallback) so the failover order and the admin active badge can never diverge (research R7)"
  - "Keyless/model-less registry entries are filtered out before the loop instead of attempted (avoids a guaranteed-401 round trip, research R8)"
  - "The single-provider URL pre-gate was deleted; both SSRF gates run inside streamProvider/callProvider per candidate and the route never passes a pre-validated URL (T-04-02)"
  - "A probe failure does not retry the same candidate buffered — it advances to the next candidate (research Section 2(c) recommendation)"
  - "console.warn reason is passed through redact() so no candidate's apiKey can reach server logs (research reference passed raw detail)"
  - "All-fail returns the LAST candidate's redacted error through the existing buffered error path — generic copy, no provider names added (04-CONTEXT All-fail decision)"

patterns-established:
  - "Failover warn register: one console.warn per pre-token failure in the locked format — provider id + short reason only, no PII (04-CONTEXT)"
  - "Per-candidate context trimming: trimToContext re-run per candidate with that provider's contextWindow so a smaller-window standby never receives an over-long payload"
  - "Stateless failover: the loop never writes AI_PROVIDERS_JSON/activeId; config stays the owner's manual control"

requirements-completed: [PROV-01, PROV-02]

coverage:
  - id: D1
    description: "Config-only provider ordering: candidate list = active provider (with silent fallback) then remaining chat providers in AI_PROVIDERS_JSON order, deduped by id, image entries excluded (PROV-01)"
    requirement: PROV-01
    verification:
      - kind: integration
        ref: "process-scoped env scenarios on next dev:3100 — s1 (activeId c0 tried first), s6a/s6b (single-provider parity via .env.local activeId p1), s7 (duplicate-id dedupe keeps first occurrence, no double attempt)"
        status: pass
      - kind: other
        ref: "command: grep -q 'export function orderedChatCandidates' lib/providers.ts; grep -c 'getActiveProvider()' lib/providers.ts >= 2"
        status: pass
    human_judgment: false
  - id: D2
    description: "Exactly-one automatic retry on every pre-first-token failure (HTTP error, gate block, invalid URL) — visitor still receives a complete streamed reply (PROV-02)"
    requirement: PROV-02
    verification:
      - kind: integration
        ref: "dev:3100 scenarios — s1 invalid-key failover (1 warn + streamed reply, no error event), s2 AI_ALLOWED_HOSTS gate-block failover (allowlist-rejection warn + streamed reply), s3 http baseUrl failover (validateProviderUrl reject warn + streamed reply)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SSE visitor contract byte-identical: every data: payload has exactly one of delta/error/done; SSE_HEADERS, sseEvent, maxDuration = 180 unchanged; no client diff"
    verification:
      - kind: other
        ref: "command: captured /api/chat stream on dev:3000 validated line-by-line — 8 data lines, histogram {delta:7, error:0, done:1}, zero contract violations"
        status: pass
      - kind: other
        ref: "command: git diff vs 413a926 lists no components/, app/chat/, app/api/image/ paths; source diff = exactly lib/providers.ts + app/api/chat/route.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "All-fail path: exactly two warns (second reads 'no candidates left'), one redacted error event then done, zero deltas, and the error detail contains no candidate's apiKey (T-04-01) nor provider name (PRES-01)"
    verification:
      - kind: integration
        ref: "dev:3100 scenario s4-all-fail + key-material checker (real apiKey, both sentinels, 'sk-' prefix: zero hits in captured stream; detail 33 chars, cap 300)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Build discipline and regression bar: npx tsc --noEmit exit 0, npm run build exit 0 with verified-no dev server on .next, DAILY_LIMIT = 30 intact, route never reads process.env.AI_PROVIDERS_JSON, zero-provider 503 preserved"
    verification:
      - kind: other
        ref: "commands: npx tsc --noEmit (exit 0); npm run build (exit 0, re-run after verified dev-server kill); grep -q 'DAILY_LIMIT = 30' components/chat-panel.tsx; grep -c 'process.env.AI_PROVIDERS_JSON' app/api/chat/route.ts = 0; scenario s5 zero-providers -> HTTP 503 provider_not_configured"
        status: pass
    human_judgment: false
  - id: D6
    description: "Image smoke: one image generation completes end-to-end in the browser (aspect-shaped result card renders, download saves); /,/blog,/chat,/admin walk shows no console CSP errors and a chat reply streams with its name gate intact (plan Task 3 declared human-check)"
    verification: []
    human_judgment: true
    rationale: "Requires operating the visitor browser UI against the real image-generation API (spends provider credits) and reading the browser console across four pages — deferred to /gsd-verify-work; the image path (app/api/image/**, resolveImageTarget, generateImage) has zero diff vs the phase base, so the regression risk is structural only."

# Metrics
duration: 29 min
completed: 2026-11-07
status: complete
---

# Phase 4 Plan 01: Server Failover Core Summary

**Ordered-provider failover for /api/chat with a first-token commit probe — a pre-token provider failure now retries the next configured chat provider while the SSE contract, visitor client, image path and redaction bar stay byte-identical.**

## Performance

- **Duration:** 29 min
- **Started:** 2026-11-07T06:46:18Z
- **Completed:** 2026-11-07T07:15:20Z
- **Tasks:** 3
- **Files modified:** 2 (source) + planning docs

## Accomplishments

- `orderedChatCandidates()` exported from `lib/providers.ts`: active provider first (reusing `getActiveProvider()` including its silent fallback — failover order and admin badge cannot diverge), remaining chat providers in `AI_PROVIDERS_JSON` array order, deduped by id (first occurrence wins), image entries excluded.
- `POST /api/chat` rewritten as a candidate loop with a module-local `readFirstDelta()` first-token probe: the SSE Response is only constructed after the first delta is parsed, structurally guaranteeing no byte reaches the visitor before a candidate is committed — failover can never duplicate text (R1 eliminated by construction).
- Every pre-first-token failure class fails over: HTTP errors (incl. upstream 429), SSRF gate rejections (both gates run inside `streamProvider`/`callProvider` per candidate — the route's single-provider URL pre-gate was deleted and no pre-validated URL is ever passed), abort timeouts, and malformed/empty replies (probe EOF branch).
- Abandoned candidates are cleaned up (`reader.cancel()` + `dispose()` — no socket or 120s timer leaks while the next candidate runs); shared 170000 ms budget keeps worst case under `maxDuration = 180`.
- Redaction generalized to strip EVERY viable candidate's apiKey from any visitor-bound (and now server-log) error detail, 300-char cap kept (T-03-03/T-04-01).
- One locked `console.warn` per pre-token failure; notStreamable keeps the same-candidate buffered fallback; all-fail returns the last candidate's redacted error through the existing buffered path.

## Task Commits

Each task was committed atomically (Tasks 2 and 3 produced zero code changes — the implementations already satisfied every scenario and invariant — so no commits were needed for them):

1. **Task 1: End-to-end failover vertical (tracer)** - `2148cb3` (feat)
2. **Task 2: Failure-class matrix** - no commit (all 8 scenarios passed against the Task 1 code as written; zero divergences found)
3. **Task 3: Regression gate** - no commit (all invariants held; build discipline re-honored after a dev-server kill hiccup, see Issues)

**Plan metadata:** this SUMMARY's docs commit; STATE.md/ROADMAP.md/REQUIREMENTS.md updates follow in a second metadata commit.

## Files Created/Modified

- `lib/providers.ts` — added `orderedChatCandidates()` next to `getActiveProvider()` (dedupe by id, image filter reuse)
- `app/api/chat/route.ts` — candidate loop + `FirstTokenProbe`/`readFirstDelta()`; single-provider block and URL pre-gate deleted; multi-key `redact`; per-candidate trim + timeout budget; all response shapes preserved

## Validation Matrix (Task 2, recorded per plan requirement)

All scenarios run against `next dev` on port 3100 with process-scoped env overrides composed from the real `.env.local` entry (`.env.local` itself never edited; no key material written to any file).

| # | Scenario | Observed result | Expected signal | Verdict |
|---|----------|-----------------|-----------------|---------|
| 1 | Pre-token HTTP failure failover (candidate[0] sentinel key) | 1 warn `[chat] provider "c0" failed before first token (Invalid or disabled ClientApiKey.); failing over`; stream = `{delta:"ok"}` + `{done:true}`, no error event | one warn + streamed reply | PASS |
| 2 | Gate-block failover (`AI_ALLOWED_HOSTS` = only candidate[1]'s host) | 1 warn with reason `Provider host "gate-blocked.example.com" is not in the AI_ALLOWED_HOSTS whitelist.`; streamed reply | allowlist-rejection warn + streamed reply | PASS |
| 3 | Invalid-URL failover (candidate[0] `http://` baseUrl) | 1 warn with reason `Only https:// base URLs are allowed`; streamed reply | reply with the http candidate consumed | PASS |
| 4 | All fail (both candidates sentinel keys) | 2 warns, second reads `; no candidates left`; stream = one `{error:"Invalid or disabled ClientApiKey."}` + `{done:true}`, zero deltas; checker proved real key + both sentinels + `sk-` prefix absent, detail 33 chars (cap 300) | two warns + single error + done + zero deltas + no key material | PASS |
| 5 | Zero providers (`AI_PROVIDERS_JSON={}`) | HTTP 503, body `{"error":"provider_not_configured", ...}` | 503 provider_not_configured | PASS |
| 6a | Single-provider parity — success | `{delta:"ok"}` + `{done:true}`, zero warns — identical to shipped build | parity | PASS |
| 6b | Single-provider parity — failure | one `{error}` + `{done:true}`, 1 warn `; no candidates left` — identical visitor shape to shipped build | parity | PASS |
| 7 | Duplicate ids (first invalid, second valid, third valid as p2) | 1 warn for `"p1"` only; reply streamed from the other provider; no candidate attempted twice | dedupe keeps first occurrence | PASS |
| 8 | PRES-01 sweep | s1 stream grepped for `xkiro/top-tools/toptools/qwen/sensenova/deepseek/sk-/provider/model`: all 0 hits; s4 error text: 0 provider-name hits | zero identity hits | PASS |

**Code-structure assertions for the three SSRF-unreachable classes** (localhost targets are deliberately rejected by the SSRF gate, so mock upstreams are unreachable in dev — asserted by inspection as the plan directs):
- Empty stream after 200 → fails over via the probe's EOF branch (`app/api/chat/route.ts` L96–100 returns `{ok:false, err:{detail:"The AI provider returned an empty response."}}` on `done` with zero pieces) → same warn + continue path proven live in s1–s3.
- Mid-stream close after a committed delta → emits `{error}` (route catch) + `{done:true}` (finally) with no further candidate — the loop is already exited at commit (the Response returns from inside the loop iteration).
- Upstream 429 → `streamProvider`/`callProvider` map any non-OK response to `{ok:false, status, detail}` (`lib/providers.ts` L524/L624) → the loop's false-result branch → failover; the same code path was behaviorally proven with the 401 in s1/s4.

## Decisions Made

- candidate[0] reuses `getActiveProvider()` itself (never re-derives the fallback) — R7 consistency.
- Keyless/model-less candidates are skipped pre-loop (R8), with the verbatim 503 `provider_not_configured` gate preserved for an empty viable list.
- Probe failure advances to the next candidate (no same-candidate buffered retry) — research Section 2(c) recommendation.
- Warn-line reason passed through `redact()` — see Deviations.
- Shared budget floor: last candidate always gets at least 5000 ms (`Math.max(5000, ...)`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical (log hygiene)] Failover warn line redacts key material**
- **Found during:** Task 1 (failover loop implementation)
- **Issue:** Research Section 2(b)'s reference implementation passes the raw upstream `err.detail` into the `console.warn` failover line; an upstream error echoing an API key would then land in server logs.
- **Fix:** The warn reason is emitted as `redact(lastErr.detail)` (the same multi-key redaction closure that guards the visitor path) — locked format unchanged, provider id + short reason only.
- **Files modified:** app/api/chat/route.ts (single warn site)
- **Verification:** s1–s4 warn lines observed clean; key-material checker proves no key reaches even the visitor path
- **Committed in:** 2148cb3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing-critical/log-hygiene)
**Impact on plan:** Defensive hardening of one log line; no scope creep. Everything else executed exactly as written.

## Issues Encountered

- **Stale port-3100 listener (scenarios 1 and 5 first runs):** the tracer verify's `kill %1` was ineffective on Windows Git Bash (subshell-disowned process), leaving the Task-1 dev server holding 3100. The first s1/s5 runs got `EADDRINUSE` on their spawned server and curled the stale (real-config) server, producing misleading clean outputs. Fixed by killing the listener (PID from `netstat -ano` + `taskkill //F //T //PID`) and hardening the scenario runner with a port-free assertion plus an `EADDRINUSE` fail-fast; s1–s7 were then re-run cleanly on a verified-free port.
- **Port-3000 dev-server kill did not take on the first attempt (Task 3):** `taskkill //F //T //PID 12816` produced no visible error yet the process survived, so the first `npm run build` ran while a dev server existed. Build discipline was re-honored: the process was killed again and **verified dead** via `tasklist`, the port was confirmed clear, `npm run build` was **re-run cleanly (exit 0)** with no dev server holding `.next`, and dev was restarted on 3000 (`Ready`, `GET /` → 200, chat SSE smoke streams `{delta}` → `{done:true}`).
- **`gsd_run` CLI unavailable in this environment:** STATE.md / ROADMAP.md / REQUIREMENTS.md updates were applied by direct edits replicating the documented effects of `state.advance-plan`, `state.update-progress`, `roadmap.update-plan-progress 4 04-01 complete`, and `requirements.mark-complete PROV-01 PROV-02` (PROV-01/PROV-02 are declared only by 04-01, so the shared-ID gate passes).
- **Windows.md ledger:** `.planning/WINDOWS.md` does not exist and the `gsd_run windows append` verb is unavailable; ledger population skipped per its best-effort contract. The one human-check deferral (D6) is tracked here in the SUMMARY instead.

## User Setup Required

None — no external service configuration required by this plan. (Owner-side note for enabling real two-provider failover in `.env.local`: add the Top-Tools-AI entry to `AI_PROVIDERS_JSON` and its host to `AI_ALLOWED_HOSTS`; failover order/behavior is exactly what the matrix scenarios exercised.)

## Next Phase Readiness

- Server half of Phase 4 complete and verified: PROV-01 and PROV-02 behaviorally proven across the full reachable failure matrix; `orderedChatCandidates()` is available to 04-02 (admin half: badges + per-row live test via optional `id`) and to Phase 5 (deploy).
- dev server is back up on localhost:3000 serving the new code (page 200 + streaming chat verified post-restart).
- Deferred to verification (not a blocker): plan Task 3's declared human-check — one browser image generation end-to-end and the /,/blog,/chat,/admin console-CSP walk (see coverage D6). The image path has zero diff against the phase base.

## Self-Check: PASSED

- `lib/providers.ts`, `app/api/chat/route.ts` exist on disk — FOUND
- Commit `2148cb3` is an ancestor of HEAD — FOUND
- `orderedChatCandidates` export present in `lib/providers.ts` — FOUND
- `npx tsc --noEmit` exit 0 at summary time — PASS
- `http://localhost:3000/` → 200 after the mandated dev restart — PASS
- Commits measured from ledger `0ef7460..HEAD` = 1 (production); plan metadata commit(s) follow this file

---
*Phase: 04-multi-provider-chat-with-automatic-failover*
*Completed: 2026-11-07*

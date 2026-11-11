---
phase: 04-multi-provider-chat-with-automatic-failover
verified: 2026-11-11T18:44:00Z
status: passed
score: 16/16 must-haves verified
covered_files:
  - ".planning/milestones/v0.0.0.0.2-phases/04-multi-provider-chat-with-automatic-failover/04-01-PLAN.md"
  - ".planning/milestones/v0.0.0.0.2-phases/04-multi-provider-chat-with-automatic-failover/04-01-SUMMARY.md"
  - ".planning/milestones/v0.0.0.0.2-phases/04-multi-provider-chat-with-automatic-failover/04-02-PLAN.md"
  - ".planning/milestones/v0.0.0.0.2-phases/04-multi-provider-chat-with-automatic-failover/04-02-SUMMARY.md"
  - "app/admin/page.tsx"
  - "app/api/chat/route.ts"
  - "app/api/providers/route.ts"
  - "lib/knowledge.ts"
  - "lib/providers.ts"
covered_digest: "v4:sha256:237f9551a57e62fea6cdda1ecdf51bb96d6d55d471d274fd2c2438ba8a97223e"
behavior_unverified: 0
overrides_applied: 0
re_verification: # Stale-verification refresh (previous VERIFICATION.md existed with status passed)
  previous_status: passed
  previous_score: 16/16
  staleness: previous verified 2026-11-07T08:30:24Z at HEAD 70013d7 went STALE — covered files changed after verification (app/api/chat/route.ts knowledge injection via lib/knowledge.ts commits 621e451/49be407 + phase 7/8 chat work; lib/providers.ts video helpers + video exclusion commits a4d5b1e/be7bf06/4de14d3; lib/knowledge.ts NEW). This report refreshes the verification against the current tree (HEAD 757cabe).
  gaps_closed: []
  gaps_remaining: []
  regressions: []
  delta_findings_fixed:
    - "WR-06 (from delta re-review, 04-REVIEW.md): failover budget not recomputed per attempt on the phase-8 research-restart path — fixed in 757cabe"
deferred:
  - truth: "Owner's live .env.local carries a second CHAT provider alongside p1 (live config today: p1 chat + img1 image + vid1 video; AI_ALLOWED_HOSTS has 2 entries)"
    addressed_in: "Phase 5"
    evidence: "DEPL-02: 'All production secrets live in Vercel env vars — AI_PROVIDERS_JSON (both providers), AI_ALLOWED_HOSTS (both hosts)…'. Phase 5 shipped (05-VERIFICATION.md exists). The config-only switching MECHANISM is code- AND live-proven at this refresh (process-scoped two-candidate configs failed over correctly on dev:3100); the production two-CHAT-provider registry remains the owner's operational step."
---

# Phase 4: Multi-Provider Chat with Automatic Failover — Verification Report (REFRESHED)

**Phase Goal:** The chat runs on two interchangeable providers — the owner switches the active one by editing config only, and a single provider failure no longer breaks a visitor's chat.
**Verified:** 2026-11-11T18:44:00Z (HEAD `757cabe`, includes delta fix WR-06)
**Status:** passed
**Re-verification:** Yes — stale-verification refresh (previous verification passed 2026-11-07T08:30:24Z at HEAD 70013d7; covered files changed afterwards)

## Why This Refresh Exists

The previous verification's `covered_digest` went stale: after it was issued, later commits touched covered files — `app/api/chat/route.ts` (knowledge-base injection into SYSTEM_PROMPT via NEW `lib/knowledge.ts`, plus phase 7/8 mail/research/markdown chat work) and `lib/providers.ts` (video task helpers `createVideoTask`/`getVideoTask`/`resolveVideoTarget`/`isVideoProvider`, and video-provider exclusion added to `getActiveProvider`/`orderedChatCandidates`). This refresh re-verifies every phase-4 must-have against the CURRENT tree, reviews the delta (04-REVIEW.md "Delta Re-Review" section), and re-runs the failover matrix subset live. The phase-4 shipped features were NOT meant to change — confirmed: `app/api/providers/route.ts` and `app/admin/page.tsx` have ZERO diff since phase-4 HEAD `70013d7`, and the failover loop's control flow (probe → commit → pass-through; probe-failure cancel+dispose; exactly one warn site; all-fail buffered last error) is intact.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence (current tree, HEAD 757cabe) |
|---|-------|--------|----------|
| 1 | Owner adds a second chat provider to AI_PROVIDERS_JSON and switches the active one by editing `activeId` only — /api/chat works against either provider with no code changes (SC1 / PROV-01) | ✓ VERIFIED | Node-level checks against the live registry (p1 chat + img1 image + vid1 video): `orderedChatCandidates()` → `["p1"]` only (image AND video excluded); duplicate-id config → first-wins dedupe `["p1","p0"]`; invalid `activeId` → silent fallback to `p1` (lib/providers.ts L59-92). Live S1a: invalid activeId via process-scoped env → reply streams, no error. Route reads the registry only via lib (direct env-read count 0). |
| 2 | Active provider fails before the first streamed token (HTTP error, timeout, malformed/empty reply, gate block, invalid URL, 429) → exactly one automatic retry against the next configured chat provider; visitor still receives a complete streamed reply (SC2 / PROV-02) | ✓ VERIFIED | Live S2 (dev:3100, process-scoped env): candidate[0] with sentinel bad key → exactly one warn `[chat] provider "p0" failed before first token (Invalid or disabled ClientApiKey.); failing over` → reply streamed from candidate[1] (`{"delta":"ok"}` → `{"done":true}`), no error event. Probe-failure branch cancels reader + disposes before advancing (route L387-393). Phase-8 research restart inside the loop stays pre-commit (bounded `pass < 2`, no bytes before probe.ok) — no duplication path. |
| 3 | Admin console lists every configured provider; each row shows exactly one status badge — active (success) / standby (outline, mono, muted) (SC3a / PROV-03) | ✓ VERIFIED | `app/admin/page.tsx` byte-unchanged since phase-4 HEAD 70013d7 (git diff empty) — prior verification evidence (agent-executed browser walk 2026-11-07, machine-executed not human-validated) still applies verbatim. |
| 4 | Live test targets ANY configured provider — per-row Test button + result under that row (SC3b / PROV-03) | ✓ VERIFIED | `app/admin/page.tsx` + `app/api/providers/route.ts` byte-unchanged since phase-4 HEAD; prior agent-executed walk evidence (standby-row ✗ under its own row, active-row ✓ under its own row) stands. |
| 5 | POST /api/providers {action:"test", id?} — id present tests that provider; id absent tests active, byte-compatible | ✓ VERIFIED | File unchanged since phase-4 HEAD; grep gates green (readJsonBody ≥2, `loadProviders().providers.find` present, `getActiveProvider` retained). |
| 6 | Unknown id → 404 provider_not_found; auth guard FIRST, 6/min rate limit second (T-04-05) | ✓ VERIFIED | File unchanged; grep gates green (provider_not_found present). Prior live 401 pre-auth probes stand. |
| 7 | Test-failure detail redacts the TARGET provider's apiKey (all occurrences), 300-char cap; GET masking unchanged (T-04-06 / WR-03) | ✓ VERIFIED | File unchanged; `split(target.apiKey).join("***")` present, `replace(provider.apiKey` count 0. |
| 8 | Failover events stay server-side console.warn only — no identity fields in admin DOM | ✓ VERIFIED | Exactly 1 warn site in route (L431-433, locked format); admin files unchanged; admin page contains no failover-history UI. |
| 9 | Admin ergonomics preserved: 44px+ targets, mono ids/models, masked keys, card language | ✓ VERIFIED | Admin files byte-unchanged since phase-4 HEAD; prior walk evidence stands. |
| 10 | No byte reaches the visitor before a candidate is committed — failover can never duplicate text | ✓ VERIFIED | `makeStreamResponse` constructed only under `probe.ok` (route L353-383); pending deltas pushed first, then pass-through from the held reader seeded with tail buffer + carried decoder (WR-01 fix present, L171). Live S2: first emitted event is a delta. |
| 11 | Mid-stream failures never retry cross-provider; surface as error event + done exactly as before | ✓ VERIFIED | The committed stream is `return`ed from inside the candidate loop (route L374-383) — loop exited at commit; the stream's catch closure (L208-213) has no path to candidate advancement. Static control-flow proof re-confirmed on current tree. |
| 12 | If every candidate fails, the LAST candidate's redacted, identity-scrubbed error reaches the visitor — generic copy, no provider names | ✓ VERIFIED | Live S3: two candidates with sentinel keys → 2 warns (last: `; no candidates left`), single `{"error":"Invalid or disabled ClientApiKey."}` + done, zero deltas, no key material, no brand/model tokens. Route L438-449: `redact(scrubIdentity(lastErr.detail…))`. |
| 13 | Every emitted SSE payload is exactly one of {delta}/{error}/{done}; SSE_HEADERS, sseEvent, maxDuration = 180 byte-identical (SC4) | ✓ VERIFIED | Live histogram over all matrix captures: `{delta:3, done:4, error:1}`, 0 contract violations, 0 identity fields (S5). `SSE_HEADERS` L60-64, `sseEvent` L66-68, `maxDuration = 180` L58 unchanged. Scope note (honest): phase 8 later added the documented `{type:"mail"}` signal (client-aware, components/chat-panel.tsx L361/L477) — a later-phase extension absorbed by the same contract, not a phase-4 regression; no identity fields ride any event. |
| 14 | Error detail shown to the visitor is stripped of EVERY candidate's apiKey and capped at 300 chars (T-04-01) | ✓ VERIFIED | Key list built from all viable candidates pre-loop (L271-278), split/join + `.slice(0, 300)`; `scrubIdentity` unchanged (L281-286). Live S4: sentinel keys absent from captured error event. |
| 15 | SSRF gates (validateProviderUrl + hostIsAllowed) run per candidate inside streamProvider/callProvider; route never passes a pre-validated URL (T-04-02) | ✓ VERIFIED | `validatedUrl` count in route = 0; route calls `streamProvider(candidate, upstream, { timeoutMs: remaining })` (L349+); both gates run inside lib/providers.ts when `opts.validatedUrl` is unset. Delta extends the same posture to the video helpers: `createVideoTask` (L753-761) and `getVideoTask` (L836-843) each run `validateProviderUrl` + `hostIsAllowed` per call; retrieval URL carries only encoded taskId/model — no key in any URL. |
| 16 | Zero client changes at phase 4: chat-panel/app/chat untouched, DAILY_LIMIT intact, image path untouched, AI_PROVIDERS_JSON/activeId never mutated at runtime (SC4) | ✓ VERIFIED (with Phase-6 scope notes) | Phase-4 server clauses hold: route never writes the registry or activeId (reads via lib only); failover loop stateless. Client/image clauses were intentionally superseded by LATER phases, per their own verifications: Phase 6 raised DAILY_LIMIT 30→50 and removed the name gate ("Phase 6: no name gate — visitors land straight in the chat", chat-panel L229/L830) — chat-access-simplification scope, EXPECTED per the refresh dispatch; image-path changes (Agnes tier mode, phase 6/7) and chat-panel rewrite (phase 7/8) are later-phase scope. No phase-4 regression: none of these alter the failover server contract. |

**Score:** 16/16 truths verified (0 present-but-behavior-unverified — every changed surface was behaviorally exercised live in this refresh)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/providers.ts` → `orderedChatCandidates(): ProviderConfig[]` | Ordered chat candidate export | ✓ VERIFIED | L78-92; now also filters `isVideoProvider`; dedupe + active-first incl. silent fallback intact; node-level checks PASS |
| `app/api/chat/route.ts` → `readFirstDelta` + `FirstTokenProbe` | Module-local first-token probe | ✓ VERIFIED | L87-152 incl. tailBuffer/tailDecoder carry (WR-01 fix) and control-marker buffering; used in loop |
| `app/api/chat/route.ts` → POST candidate loop | Single-provider block replaced | ✓ VERIFIED | L334-434; per-candidate trim via `buildUpstream`, shared budget L289-290, commit branch, capability fallback, all-fail path; WR-06 fix: `remaining` recomputed per attempt |
| Failover warn format + `FAILOVER_BUDGET_MS = 170000` | Locked log format + shared budget | ✓ VERIFIED | Exactly 1 warn site in locked format; budget L290; `maxDuration = 180` unchanged |
| `app/api/providers/route.ts` → optional `body.id` + `provider_not_found` | In-place endpoint extension | ✓ VERIFIED | Byte-unchanged since phase-4 HEAD; grep gates green |
| `app/admin/page.tsx` → `testingId` / `rowResults` / `runTest(id)` | Per-row test state | ✓ VERIFIED | Byte-unchanged since phase-4 HEAD; grep gates green |
| `lib/knowledge.ts` → `buildKnowledgeBase(): string` (new, post-phase) | Fact-sheet formatter injected into SYSTEM_PROMPT | ✓ VERIFIED | Pure function over `content.ts`; deterministic; per-field clip caps + blog slice(0,8); measured 8038 chars ≈ ~2.0k est. tokens; no secrets; wired (route L22 import, L52 injection) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `orderedChatCandidates` candidate[0] | `getActiveProvider()` return (incl. silent fallback) | function reuse | ✓ WIRED | lib/providers.ts L81 calls `getActiveProvider()` itself — admin badge and failover order cannot diverge; now also video-aware |
| `readFirstDelta` commit | Response construction | probe.ok guard | ✓ WIRED | `makeStreamResponse` only at route L374 under `probe.ok`; pending deltas re-emitted first; tail decoder carried |
| `redact` key list | ALL viable candidates | pre-loop closure | ✓ WIRED | route L271-278; unchanged |
| Abandoned candidate cleanup | reader.cancel + dispose | probe-failure branch | ✓ WIRED | route L387-393; also the research-restart abandon path L360-365 |
| `buildKnowledgeBase()` | `SYSTEM_PROMPT` → `trimToContext` per candidate | module-scope injection | ✓ WIRED | route L22/L52 → `buildUpstream` L319-332 (`SYSTEM_PROMPT + context`, per-candidate window) |
| Admin target resolution / per-row test | providers route + admin page | unchanged files | ✓ WIRED | Byte-identical to phase-4 verified state |

### Behavioral Spot-Checks (this refresh, dev:3100, process-scoped env only — .env.local untouched)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Typecheck current tree | `npx tsc --noEmit` | exit 0 (before AND after WR-06 fix) | ✓ PASS |
| Zero-provider gate (S0) | server env `AI_PROVIDERS_JSON={}` + POST /api/chat | HTTP 503 `provider_not_configured` | ✓ PASS |
| Single-provider parity (S1b) | real .env.local config + POST | `{"delta":"ok"}` → `{"done":true}`, no error, 0 warns | ✓ PASS |
| Video exclusion live (S1b) | real registry contains vid1 video provider | 0 failover warns — vid1 never a chat candidate | ✓ PASS |
| Invalid activeId fallback (S1a) | process-scoped env activeId="no-such-id" | reply streams via silent fallback, no error | ✓ PASS |
| Active-provider failover (S2) | candidate[0] sentinel bad key, candidate[1] real | exactly 1 warn `failed before first token (…); failing over`; reply from candidate[1]; no error event | ✓ PASS |
| All-fail last-error (S3) | both candidates sentinel keys | 2 warns (last `no candidates left`); 1 error + done; 0 deltas | ✓ PASS |
| PRES-01 sweep (S4) | grep S2/S3 captures for xkiro/mistral/agnes/FailProbe/sk-invalid | zero hits in stream; no key material in error | ✓ PASS |
| SSE contract histogram (S5) | parse all captures line-by-line | events 8, `{delta:3, done:4, error:1}`, 0 violations, no identity fields | ✓ PASS |
| Candidate exclusion + dedupe (node-level) | compiled providers module against live + duplicate-id configs | `["p1"]` / `["p1","p0"]` first-wins / invalid-activeId fallback | ✓ PASS |
| Fact-sheet size (node-level) | compiled knowledge module | 8038 chars ≈ ~2.0k est. tokens, 36 lines — bounded | ✓ PASS |
| Page walk + CSP | curl /, /blog, /chat, /admin | all 200; Content-Security-Policy present on / and /chat | ✓ PASS |
| Post-fix happy path | POST after WR-06 fix | `{"delta":"ok"}` → `{"done":true}` | ✓ PASS |
| `npm run build` | (not run) | refresh dispatch: tsc is sufficient; build skipped to avoid .next contention | ? SKIP |
| Full failover matrix s1-s8 of 04-01-SUMMARY | subset re-run live (S0-S5 above); gate-block and http-URL variants covered by the same code paths (per-candidate gating inside streamProvider, unchanged) | subset all PASS | ✓ PASS (subset) |

### Probe Execution

No probes declared in the phase PLAN/SUMMARY files and no conventional `scripts/*/tests/probe-*.sh` exist — Step 7c not applicable.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PROV-01 | 04-01 | Multiple providers; switch active by editing `activeId` only — no code changes | ✓ SATISFIED | Truth 1; node-level + live fallback proof; video/image exclusion verified |
| PROV-02 | 04-01 | Pre-token failure → retry against next configured provider, still returns a reply | ✓ SATISFIED | Truth 2; live S2 failover + S3 all-fail + S0 zero-provider on current tree |
| PROV-03 | 04-02 | Admin lists every provider with status; live test targets any provider | ✓ SATISFIED | Truths 3-9; admin files byte-unchanged since phase-4 HEAD |

No orphaned requirements (REQUIREMENTS.md maps exactly PROV-01/02/03 to Phase 4).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | No TBD/FIXME/XXX/HACK/PLACEHOLDER debt markers in any covered file | — | Debt-marker gate clean |

### Human Verification Required

None new in this refresh. The delta (knowledge injection, video helpers, candidate exclusion) is entirely server-side and was behaviorally exercised live; the admin surface is byte-unchanged. The two prior human items were closed pre-staleness by the machine-executed browser walks recorded in the previous report (2026-11-07 addendum — machine evidence, not human validation; owner may re-verify visually at any time). One standing owner-side operational item remains deferred to production config (see Deferred Items): adding a second CHAT provider to the live registry.

### Gaps Summary

No gaps. Every phase-4 must-hold re-verified against the current tree with behavioral evidence: config-only switching with image AND video providers excluded from chat candidates (node-level + live), probe-guarded failover with exactly one locked-format warn and a complete streamed reply (live S2), all-fail last redacted error with zero deltas (live S3), zero-provider 503 (live S0), SSE contract histogram clean with no identity fields (live S5), redaction/scrub unchanged, SSRF gating per call including the new video helpers, admin console byte-unchanged, and the failover budget invariant restored on the research-restart path (WR-06 fixed, commit 757cabe). The knowledge injection is pure, secret-free, bounded (~8KB fact sheet), and introduces no untrusted input into the system prompt.

---

_Verified: 2026-11-11T18:44:00Z_
_Verifier: Claude (gsd-verifier)_

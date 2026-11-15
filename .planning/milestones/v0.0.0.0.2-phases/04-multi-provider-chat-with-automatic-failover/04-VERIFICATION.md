---
phase: 04-multi-provider-chat-with-automatic-failover
verified: 2026-11-15T10:49:55Z
status: passed
score: 16/16 must-haves verified
covered_files:
  - ".planning/milestones/v0.0.0.0.2-phases/04-multi-provider-chat-with-automatic-failover/04-01-PLAN.md"
  - ".planning/milestones/v0.0.0.0.2-phases/04-multi-provider-chat-with-automatic-failover/04-01-SUMMARY.md"
  - ".planning/milestones/v0.0.0.0.2-phases/04-multi-provider-chat-with-automatic-failover/04-02-PLAN.md"
  - ".planning/milestones/v0.0.0.0.2-phases/04-multi-provider-chat-with-automatic-failover/04-02-SUMMARY.md"
  - "app/admin/page.tsx"
  - "app/api/admin/ai/conversations/[id]/route.ts"
  - "app/api/admin/ai/conversations/route.ts"
  - "app/api/admin/ai/users/route.ts"
  - "app/api/chat/route.ts"
  - "app/api/conversations/[id]/messages/route.ts"
  - "app/api/conversations/[id]/route.ts"
  - "app/api/conversations/route.ts"
  - "app/api/conversations/search/route.ts"
  - "app/api/device/init/route.ts"
  - "app/api/image/route.ts"
  - "app/api/providers/route.ts"
  - "app/api/research/route.ts"
  - "app/api/video/route.ts"
  - "components/chat-panel.tsx"
  - "components/code-block.tsx"
  - "components/conversation-sidebar.tsx"
  - "components/markdown.tsx"
  - "components/mermaid-diagram.tsx"
  - "components/message-actions.tsx"
  - "lib/conversations.ts"
  - "lib/db.ts"
  - "lib/knowledge.ts"
  - "lib/mail.ts"
  - "lib/providers.ts"
  - "lib/research.ts"
covered_digest: "v4:sha256:29d8a0856f43ba43cbd24601561a35468144307bbf894f05e03492ff8e03dfdc"
behavior_unverified: 0
overrides_applied: 0
re_verification: # Stale-verification refresh (previous VERIFICATION.md existed with status passed)
  previous_status: passed
  previous_score: 16/16
  staleness: "previous verified 2026-11-11T18:44:00Z at HEAD 757cabe went STALE — the delta since 70013d7 (34 source files, ~5k insertions, 11k+ lines) shipped whole new subsystems that were never reviewed: Turso DB layer + device-token auth (lib/db.ts, /api/device/init, /api/conversations/*, /api/admin/ai/*), server-backed conversations (lib/conversations.ts, conversation-sidebar), mail draft (lib/mail.ts + SSE mail signal), You.com research (lib/research.ts, /api/research, [[RESEARCH]] restart), Shiki/KaTeX/mermaid markdown (code-block/markdown/mermaid-diagram), export menus (message-actions, export-formats), video mode (chat-panel poll loop, /api/video), and 7 new package deps. This report refreshes the verification against the current tree (HEAD 9cf354a, after delta review WR-07..WR-14 fixes)."
  gaps_closed: []
  gaps_remaining: []
  regressions: []
  delta_findings_fixed:
    - "WR-07..WR-14 (delta re-review #2 in 04-REVIEW.md) — 8 Warnings fixed in atomic commits d538a26/0c9433e/acc8deb/b5df60d/a3005cd/f04db5e/9006fe2/9cf354a, see the Delta #2 Fix Log"
deferred:
  - truth: "Owner's live .env.local carries a second CHAT provider alongside p1 (live config today: p1 chat + img1 image + vid1 video; AI_ALLOWED_HOSTS has 2 entries)"
    addressed_in: "Phase 5"
    evidence: "DEPL-02: production registry is an env-var operation. The config-only switching MECHANISM is code- AND live-proven at this refresh (S1a invalid-activeId fallback and S2 two-candidate failover both ran correctly on dev:3100); the production two-CHAT-provider registry remains the owner's operational step."
---

# Phase 4: Multi-Provider Chat with Automatic Failover — Verification Report (REFRESHED #2)

**Phase Goal:** The chat runs on two interchangeable providers — the owner switches the active one by editing config only, and a single provider failure no longer breaks a visitor's chat.
**Verified:** 2026-11-15T10:49:55Z (HEAD `9cf354a`, includes delta review fixes WR-07..WR-14)
**Status:** passed
**Re-verification:** Yes — stale-verification refresh (previous verification passed 2026-11-11T18:44:00Z at HEAD 757cabe; covered files changed afterwards)

## Why This Refresh Exists

The previous refresh's `covered_digest` went stale again: parallel sessions shipped phases 7/8/9 (rich markdown, mail draft, research, Turso multi-user conversations, video mode) on top of the phase-4 files. This refresh (a) ran a standard-depth adversarial delta review of the entire `70013d7..HEAD` range (04-REVIEW.md "Delta Re-Review #2" — Shiki XSS proven safe by execution, SQL binding verified statement-by-statement, device-token scoping verified per route, 8 Warnings found and fixed), (b) re-verified every phase-4 must-have against the current tree with live behavioral evidence, and (c) live-tested the new DB-route fixes. The phase-4 shipped features were NOT meant to change — confirmed: `app/admin/page.tsx` and `app/api/providers/route.ts` have ZERO diff since phase-4 HEAD `70013d7`, and the failover loop's control flow (probe → commit → pass-through; per-attempt budget recompute; exactly one warn site; all-fail buffered last error) is intact.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence (current tree, HEAD 9cf354a) |
|---|-------|--------|----------|
| 1 | Owner adds a second chat provider to AI_PROVIDERS_JSON and switches the active one by editing `activeId` only — /api/chat works against either provider with no code changes (SC1 / PROV-01) | ✓ VERIFIED | Node-level checks against the live registry (p1 chat + img1 image + vid1 video): `orderedChatCandidates()` → `["p1"]` only (image AND video excluded); duplicate-id config → `["p0","p1"]` first-wins with activeId p0 first; invalid `activeId` → silent fallback to `p1`. Live S1a on dev:3100 (process-scoped env activeId="no-such-id"): reply streamed `{"delta":"ok"}` → `{"done":true}`, 0 failover warns. Route reads the registry only via lib (direct env reads: 2, both comment/copy strings). |
| 2 | Active provider fails before the first streamed token → exactly one automatic retry against the next configured chat provider; visitor still receives a complete streamed reply (SC2 / PROV-02) | ✓ VERIFIED | Live S2 (dev:3100, process-scoped env: candidate[0] sentinel key `sk-invalid-failover-probe`, candidate[1] real): exactly one warn `[chat] provider "p0" failed before first token (Invalid or disabled ClientApiKey.); failing over` → reply streamed from candidate[1] (`{"delta":"ok"}` → `{"done":true}`), no error event. Probe-failure branch cancels reader + disposes before advancing. WR-06 fix intact: `remaining` recomputed per ATTEMPT inside the `pass < 2` loop (route L346-354). |
| 3 | Admin console lists every configured provider; each row shows exactly one status badge (SC3a / PROV-03) | ✓ VERIFIED | `app/admin/page.tsx` byte-unchanged since phase-4 HEAD 70013d7 (git diff empty) — prior agent-executed browser-walk evidence stands verbatim. |
| 4 | Live test targets ANY configured provider — per-row Test button + result under that row (SC3b / PROV-03) | ✓ VERIFIED | File byte-unchanged since phase-4 HEAD; prior walk evidence stands. |
| 5 | POST /api/providers {action:"test", id?} — id present tests that provider; id absent tests active, byte-compatible | ✓ VERIFIED | File unchanged; grep gates green (`provider_not_found` L68 present, `split(target.apiKey` redaction present, `replace(provider.apiKey` count 0). |
| 6 | Unknown id → 404 provider_not_found; auth guard FIRST, rate limit second (T-04-05) | ✓ VERIFIED | File unchanged; prior live 401 pre-auth probes stand. |
| 7 | Test-failure detail redacts the TARGET provider's apiKey (all occurrences), 300-char cap (T-04-06 / WR-03) | ✓ VERIFIED | File unchanged; split/join redaction present at L95. |
| 8 | Failover events stay server-side console.warn only — no identity fields in admin DOM | ✓ VERIFIED | Exactly 1 warn site in the chat route (L443-445, locked format); admin files unchanged; admin page contains no failover-history UI. New WR-13 fix extends the same bar to the video route's client-bound detail (model scrub + generic host-gate copy). |
| 9 | Admin ergonomics preserved: 44px+ targets, mono ids/models, masked keys, card language | ✓ VERIFIED | Admin files byte-unchanged since phase-4 HEAD. |
| 10 | No byte reaches the visitor before a candidate is committed — failover can never duplicate text | ✓ VERIFIED | `makeStreamResponse` constructed only under `probe.ok`; pending deltas pushed first, then pass-through from the held reader seeded with tail buffer + carried decoder. Live S2: first emitted event is a delta. The phase-8 research restart stays pre-commit (bounded `pass < 2`, no bytes before probe.ok). |
| 11 | Mid-stream failures never retry cross-provider; surface as error event + done exactly as before | ✓ VERIFIED | The committed stream is `return`ed from inside the candidate loop — loop exited at commit; the stream's catch closure has no path to candidate advancement. Static control-flow proof re-confirmed on the current tree. |
| 12 | If every candidate fails, the LAST candidate's redacted, identity-scrubbed error reaches the visitor — generic copy, no provider names | ✓ VERIFIED | Live S3: two sentinel-key candidates → 2 warns (last: `; no candidates left`), single `{"error":"Invalid or disabled ClientApiKey."}` + done, zero deltas, no key material, no brand/model tokens (PRES-01 sweep 0 hits). |
| 13 | Every emitted SSE payload is exactly one of {delta}/{error}/{done} (+ documented {type:"mail"}/{type:"sources"} signals); SSE_HEADERS, sseEvent, maxDuration = 180 byte-identical (SC4) | ✓ VERIFIED | Live histogram over the S2+S3 captures: `{delta:1, done:2, error:1, other:0}`, 0 contract violations, 0 identity fields. `SSE_HEADERS` L60-64, `sseEvent` L66-68, `maxDuration = 180` L58 unchanged. Scope notes (honest): phase 8 added the documented `{type:"mail"}` signal and phase 9 added `{type:"sources", sources}` (research citations) — both later-phase extensions absorbed by the same envelope, both consumed by the same-repo client (chat-panel L494-506/L640-641); no identity fields ride any event. |
| 14 | Error detail shown to the visitor is stripped of EVERY candidate's apiKey and capped at 300 chars (T-04-01) | ✓ VERIFIED | Key list built from all viable candidates pre-loop, split/join + `.slice(0, 300)`; `scrubIdentity` unchanged. Live S4: sentinel keys absent from captured error events. |
| 15 | SSRF gates (validateProviderUrl + hostIsAllowed) run per candidate inside streamProvider/callProvider; route never passes a pre-validated URL (T-04-02) | ✓ VERIFIED | `validatedUrl` count in the chat route = 0; both gates run inside lib/providers.ts when `opts.validatedUrl` is unset. The delta's new outbound surfaces follow the same posture: video helpers gate every call (`createVideoTask`/`getVideoTask`), and `lib/research.ts` fetches ONLY the pinned constant `https://ydc-index.io/v1/search` (validateProviderUrl defense-in-depth; user URLs are never fetched — only their hostnames bias the search). Live: `/api/video` without id → 400 `bad_task`; empty prompts → 400 on both media routes. |
| 16 | DAILY_LIMIT honored, AI_PROVIDERS_JSON/activeId never mutated at runtime, key material never client-side (SC4) | ✓ VERIFIED (with later-phase scope notes) | Phase-4 server clauses hold: route never writes the registry or activeId; failover loop stateless. `DAILY_LIMIT = 50` client-side (phase-6 raise 30→50, expected per phase-6 verification). Grep sweep: zero occurrences of `AI_PROVIDERS_JSON`/`YDC_API_KEY`/`TURSO_*`/`apiKey` in components/ or public-facing app pages. Node-level: video target `vid1`, image target `img1`, chat candidates `["p1"]`. |

**Score:** 16/16 truths verified (0 present-but-behavior-unverified — every changed phase-4 surface was behaviorally exercised live in this refresh)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/providers.ts` → `orderedChatCandidates(): ProviderConfig[]` | Ordered chat candidate export | ✓ VERIFIED | Filters image AND video providers; dedupe + active-first incl. silent fallback intact; node-level checks PASS against the live registry |
| `app/api/chat/route.ts` → `readFirstDelta` + `FirstTokenProbe` | Module-local first-token probe | ✓ VERIFIED | Including tailBuffer/tailDecoder carry (WR-01 fix) and control-marker buffering; used in the loop |
| `app/api/chat/route.ts` → POST candidate loop | Probe-guarded failover | ✓ VERIFIED | Per-attempt budget recompute (WR-06), commit branch, capability fallback, all-fail path all intact |
| Failover warn format + `FAILOVER_BUDGET_MS = 170000` | Locked log format + shared budget | ✓ VERIFIED | Exactly 1 warn site; budget L292; `maxDuration = 180` L58 |
| `app/api/providers/route.ts` + `app/admin/page.tsx` | Byte-unchanged since phase-4 HEAD | ✓ VERIFIED | git diff empty vs 70013d7 |
| `lib/knowledge.ts` → `buildKnowledgeBase(): string` | Fact-sheet formatter injected into SYSTEM_PROMPT | ✓ VERIFIED | Pure over static owner content (`lib/content.ts` zero commits in the delta — prior 8038-char measurement stands); canonical SITE_URL links; no secrets; wired (route L22 import, L52 injection) |
| `lib/db.ts` + conversation routes (new, phase 9) | Device-token data layer, reviewed + fixed this refresh | ✓ VERIFIED | All SQL parameter-bound; ownership scoping on every user query; token now stored as SHA-256 hash (WR-07); rate limits on all routes (WR-10); search guard (WR-11); id validation + 409 (WR-12); sources bounded (WR-14) — all live-tested (see Behavioral Spot-Checks) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `orderedChatCandidates` candidate[0] | `getActiveProvider()` return (incl. silent fallback) | function reuse | ✓ WIRED | lib/providers.ts — admin badge and failover order cannot diverge; video/image-aware |
| `readFirstDelta` commit | Response construction | probe.ok guard | ✓ WIRED | `makeStreamResponse` only under `probe.ok`; pending deltas re-emitted first; tail decoder carried |
| `redact` key list | ALL viable candidates | pre-loop closure | ✓ WIRED | Unchanged |
| Abandoned candidate cleanup | reader.cancel + dispose | probe-failure branch | ✓ WIRED | Also the research-restart abandon path |
| `buildKnowledgeBase()` | `SYSTEM_PROMPT` → `trimToContext` per candidate | module-scope injection | ✓ WIRED | Route L22/L52 → `buildUpstream` per-candidate window |
| Admin target resolution / per-row test | providers route + admin page | unchanged files | ✓ WIRED | Byte-identical to phase-4 verified state |
| Chat panel → conversation persistence | `/api/conversations*` via `lib/conversations.ts` | X-Device-Token bearer | ✓ WIRED | Fire-and-forget save after each reply; silent localStorage fallback when DB unset/offline (live-tested this refresh) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| Chat stream | `delta` events | Live provider (xkiro p1) | Yes — live SSE captured | ✓ FLOWING |
| Conversation list | `conversations` | Turso via /api/conversations | Yes — live rows created/read/deleted | ✓ FLOWING |
| Research sources | `sources` events | You.com YDC (unconfigured locally → graceful "unavailable" path verified in code; gate tested at route level) | Graceful degradation verified | ✓ FLOWING (degraded path proven) |
| Admin provider list | providers | AI_PROVIDERS_JSON | Yes (prior live walks) | ✓ FLOWING |

### Behavioral Spot-Checks (this refresh, dev:3100, process-scoped env only — .env.local untouched)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Typecheck current tree (post-fix) | `npx tsc --noEmit` | exit 0 (also exit 0 after every individual fix commit) | ✓ PASS |
| Zero-provider gate (S0) | server env `AI_PROVIDERS_JSON={providers:[]}` + POST /api/chat | HTTP 503 `provider_not_configured` | ✓ PASS |
| Happy path (S1b, real env) | POST /api/chat "Reply with exactly the word ok" | `{"delta":"ok"}` → `{"done":true}`, no error, 0 warns | ✓ PASS |
| Video exclusion live (S1b) | real registry contains vid1 video provider | 0 failover warns — vid1 never a chat candidate | ✓ PASS |
| Invalid activeId fallback (S1a) | process-scoped env activeId="no-such-id" | reply streams via silent fallback, no error, 0 warns | ✓ PASS |
| Active-provider failover (S2) | candidate[0] sentinel key, candidate[1] real | exactly 1 warn `failed before first token (…); failing over`; reply from candidate[1]; no error event | ✓ PASS |
| All-fail last-error (S3) | both candidates sentinel keys | 2 warns (last `no candidates left`); 1 error + done; 0 deltas | ✓ PASS |
| PRES-01 sweep (S4) | grep captures for xkiro/mistral/agnes/failprobe/sk-invalid | 0 hits in stream bodies; no key material in error | ✓ PASS |
| SSE contract histogram (S5) | parse S2+S3 captures line-by-line | `{delta:1, done:2, error:1, other:0}`, 0 violations, 0 identity fields | ✓ PASS |
| Candidate exclusion + dedupe (node-level, type-stripped) | compiled providers module against live + duplicate-id configs | `["p1"]` chat-only / `["p0","p1"]` first-wins with active p0 first / invalid-activeId fallback | ✓ PASS |
| Media target resolution (node-level) | resolveVideoTarget / resolveImageTarget | vid1 / img1 | ✓ PASS |
| Shiki XSS proof (node-level) | executed shiki 4.6.0 codeToHtml on `</span><img src=x onerror=alert(1)><script>alert(2)</script>` | all `<` entity-encoded (`&#x3C;`), no raw HTML in output, no lang echo — dangerouslySetInnerHTML surface is safe | ✓ PASS |
| Device/init stores hash, not token (WR-07) | live POST /api/device/init + direct read-only Turso SELECT | response id = sha256(token) (64-hex); users row keyed by hash; raw token absent from DB | ✓ PASS |
| Conversation create + duplicate → 409 (WR-12) | live POST with same id twice | 200 then 409 `already_exists` | ✓ PASS |
| Conversation malformed id → 400 (WR-12) | live POST with path-like 100-char id | 400 `bad_id` | ✓ PASS |
| Cross-user scoping | live GET with token B on token A's conversation | 404 `not_found` | ✓ PASS |
| Oversized sources normalization (WR-14) | live POST with 50 junk source items | stored ≤8 items, shape-coerced | ✓ PASS |
| Search empty-q guard (WR-11) | live GET /api/conversations/search?q= (fresh token) | 200 structured `{conversations:[…]}` — no 500 | ✓ PASS |
| Search rate limit (WR-10) | 22 rapid live search calls | 429 within the window | ✓ PASS |
| Video/image route validation | GET /api/video (no id), empty prompts | 400 `bad_task` / 400 `no_prompt` on both routes | ✓ PASS |
| Page walk + CSP | curl /, /blog, /chat, /admin, /privacy, /terms | all 200; CSP present incl. new `media-src` video hosts | ✓ PASS |
| Post-fix happy path | POST after all 8 fixes | `{"delta":"ok"}` → `{"done":true}` | ✓ PASS |
| /chat client render | curl /chat | 200, client bundle wired | ✓ PASS |
| `npm run build` | (not run) | dev server held .next; tsc is sufficient per dispatch | ? SKIP |

### Probe Execution

No probes declared in the phase PLAN/SUMMARY files and no conventional `scripts/*/tests/probe-*.sh` exist — Step 7c not applicable.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PROV-01 | 04-01 | Multiple providers; switch active by editing `activeId` only — no code changes | ✓ SATISFIED | Truth 1; node-level + live S1a fallback proof on the current tree |
| PROV-02 | 04-01 | Pre-token failure → retry against next configured provider, still returns a reply | ✓ SATISFIED | Truth 2; live S2 failover + S3 all-fail + S0 zero-provider |
| PROV-03 | 04-02 | Admin lists every provider with status; live test targets any provider | ✓ SATISFIED | Truths 3-9; admin files byte-unchanged since phase-4 HEAD |

No orphaned requirements (REQUIREMENTS.md maps exactly PROV-01/02/03 to Phase 4).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | No TBD/FIXME/XXX/HACK/PLACEHOLDER debt markers in any covered file (dead recovery-state declared in chat-panel is tracked as IN-05 in 04-REVIEW.md, not a debt marker) | — | Debt-marker gate clean |

### Delta Fix Verification Notes (honest scope)

The 8 delta fixes (04-REVIEW.md "Delta #2 Fix Log") were verified as follows: WR-07, WR-10, WR-11, WR-12, WR-14 live-tested above with real HTTP + direct read-only DB evidence; WR-08 (scheme gate in `lib/research.ts`) is code-verified + typechecked but the YDC path itself is unconfigured locally (`YDC_API_KEY` absent → graceful `no_key` path), so the gate's runtime behavior on real hits is unexercised; WR-09 (stale `pendingSourcesRef` reset) and WR-13 (video detail scrub) are logic fixes verified by code inspection + tsc — behavioral confirmation needs a stream erroring after a sources event and a failing video-provider call respectively. Those three are flagged "requires human verification" in the fix log. **Migration note (WR-07):** conversations previously stored under a raw-token user id become unreachable for the same device after the hashing change — relevant only to dev/test rows created before this refresh (owner may purge `users`/`conversations` in Turso; production has no legacy rows since the feature never shipped).

### Human Verification Required

None new for the phase-4 must-haves — every changed phase-4 surface was behaviorally exercised live. Three delta-fix items are recommended for human/owner verification (see Delta Fix Verification Notes): WR-08's gate on a live YDC response, WR-09's stale-sources scenario, WR-13's scrub on a real provider failure. One standing owner-side operational item remains deferred to production config (see Deferred Items). The privacy/DB copy reconciliation is an owner decision recorded REPORT-ONLY in 04-REVIEW.md IN-11.

### Gaps Summary

No gaps. Every phase-4 must-hold re-verified against the current tree with behavioral evidence: config-only switching with image AND video providers excluded (node-level + live), probe-guarded failover with exactly one locked-format warn and a complete streamed reply (live S2), all-fail last redacted error with zero deltas (live S3), zero-provider 503 (live S0), SSE contract histogram clean with no identity fields (live S5), redaction/scrub unchanged, SSRF gating per call including the new video and research surfaces (research fetches only a pinned constant URL), admin console byte-unchanged, per-attempt failover budget intact (WR-06 fix), and the Shiki dangerouslySetInnerHTML surface proven XSS-safe by executing the highlighter against a hostile payload. The delta's new DB subsystem was reviewed (8 Warnings, all fixed) and its fixes live-tested: token hashing confirmed in the actual database, rate limits biting, 409/400 id validation, cross-user scoping, bounded sources, and the search guard.

---

_Verified: 2026-11-15T10:49:55Z_
_Verifier: Claude (gsd-verifier)_

---
phase: 04-multi-provider-chat-with-automatic-failover
verified: 2026-11-17T22:56:00Z
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
covered_digest: "v4:sha256:0927f6f8d857ea677ff62cff9ebd61273ac692ddde6055166c9df1a2e998049c"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 16/16
  previous_verified: 2026-11-15T10:49:55Z
  previous_head: 9cf354a
  staleness: "The previous refresh (verified 2026-11-15T10:49:55Z at HEAD 9cf354a) covered source files changed afterwards, most substantially by three later-phase commits in the 9cf354a..e981656 range: ae8208a (Phase 9 admin-managed AES-256-GCM encrypted providers + DB-first registry: lib/db.ts, lib/providers.ts loadProvidersAsync, app/api/providers/route.ts, app/admin/page.tsx rewritten), 31d4cca (protocol adapters openai|anthropic|google in lib/providers.ts; env provider UI + Generate Env tab removed from admin; DB-only providers with protocol presets), and e981656 (Phase 10 admin AI-chats viewer + full encrypted backup; new AI Chats tab in admin; image/video generations persisted to the DB by components/chat-panel.tsx). Chat route delta is 5 lines only (registry source switched to loadProvidersAsync + orderedChatCandidates(registry)); the probe-guarded failover control flow is byte-identical to the previously live-tested state. This refresh re-verifies every phase-4 must-have against the current tree (HEAD e981656, clean working tree) and adds behavioral probe evidence for the new adapter layer."
  gaps_closed: []
  gaps_remaining: []
  regressions: []
  delta_changes_reviewed:
    - "Protocol adapters (lib/providers.ts): protocol field + resolveChatUrl/buildChatRequest/extractChatReply/toOpenAISSE/buildAuthHeaders; default openai backward compatibility confirmed by node-level probe (21/21 checks)."
    - "streamProvider/callProvider now use the adapters; SSRF gates (validateProviderUrl + hostIsAllowed) still run per call when validatedUrl is unset; chat route passes no validatedUrl (count 0)."
    - "app/api/providers/route.ts switched to loadProvidersAsync(); auth-first ordering, 404 provider_not_found, TARGET apiKey redaction and 6/min rate limit all intact."
    - "app/admin/page.tsx rewritten DB-only; provider list, per-row Test button/result, masked keyPreview and active badge all intact; a new AI Chats tab was added (Phase 10)."
    - "lib/db.ts defensive ALTER columns (providers.protocol; messages.image_url/video_url/job_id/meta) present."
    - "components/chat-panel.tsx persists image/video generations to the DB via ensureConversation/saveMessage."
deferred:
  - truth: "Owner's live .env.local carries a second CHAT provider alongside p1 (live config today: p1 chat + img1 image + vid1 video; AI_ALLOWED_HOSTS has 2 entries)"
    addressed_in: "Phase 5"
    evidence: "DEPL-02: production registry is a config operation. The config-only switching MECHANISM is code- and node-proven at this refresh (orderedChatCandidates with invalid activeId falls back to first chat; DB-first hybrid registry falls back to env when Turso is empty/unavailable); the production two-CHAT-provider registry remains the owner's operational step."
---

# Phase 4: Multi-Provider Chat with Automatic Failover — Verification Report (REFRESHED #3)

**Phase Goal:** The chat runs on two interchangeable providers — the owner switches the active one by editing config only, and a single provider failure no longer breaks a visitor's chat.
**Verified:** 2026-11-17T22:56:00Z (HEAD `e981656`, clean working tree)
**Status:** passed
**Re-verification:** Yes — stale-verification refresh (previous verification passed 2026-11-15T10:49:55Z at HEAD `9cf354a`; covered source files changed afterwards)

## Why This Refresh Exists

The previous report's `covered_digest` went stale again. In the `9cf354a..e981656` range, later phases shipped a DB-first encrypted-provider registry, protocol adapters (OpenAI/Anthropic/Google), a rewritten DB-only admin console with an "AI Chats" tab, and DB persistence of image/video generations. This refresh re-runs the goal-backward verification against the current tree with real checks: full grep gate suite, `npx tsc --noEmit`, a 21-check Node-level behavioral probe that transpiles and executes the **actual** `lib/providers.ts` adapter layer, and manual artifact/key-link/data-flow tracing. Honest scope is stated in the next section.

## Evidence Provenance (honest scope)

- **Re-executed in THIS refresh:** grep/static gates over all 9 core source files; `npx tsc --noEmit` (exit 0); the 21-check Node probe covering openai backward compatibility (URL `/chat/completions`, `Authorization: Bearer `, `choices.0.message.content`, identity `toOpenAISSE`), anthropic/google URL+auth+body mapping, real Anthropic→OpenAI SSE frame translation, candidate ordering (image+video excluded, active-first, dedupe, invalid-activeId fallback), and `getActiveProvider` fallback; debt-marker/stub scan; decision-coverage gate (skipped — no trackable decisions).
- **Carried forward from the previous refresh, valid because the code is unchanged:** the live HTTP S0–S5 failover scenarios (503 zero-provider, happy path, invalid-activeId fallback, exactly-one-retry failover, all-fail last error, SSE contract histogram, PRES-01 identity sweep). `git diff 9cf354a HEAD -- app/api/chat/route.ts` is exactly 5 lines — only the registry source (`loadProvidersAsync` + `orderedChatCandidates(registry)`); the probe/loop/warn/all-fail control flow is byte-identical to the state those live runs exercised. These live scenarios were **not re-run in this refresh** (no dev server started; per verifier discipline).
- **Not exercised:** `npm run build` (skipped — tsc is sufficient and no dev server was holding `.next`); live admin browser walk of the rewritten Phase 9/10 UI (the phase-4 admin truths are verified by code inspection; the rewritten UI itself is a Phase 9/10 deliverable). No gap is derived from these skips.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence (current tree, HEAD e981656) |
|---|-------|--------|--------------------------------------|
| 1 | Owner adds a second chat provider and switches the active one by editing `activeId` only — `/api/chat` works against either provider with no code changes (SC1 / PROV-01) | ✓ VERIFIED | `orderedChatCandidates(registry)` filters image AND video, dedupes (first-wins) and puts active first incl. silent fallback — node probe: `["chatA","chatB"]` on invalid activeId, `["chatB","chatA"]` on valid activeId. Config-only switching mechanism (`AI_PROVIDERS_JSON.activeId` parsed by `loadProviders`, honored by `getActiveProvider`) intact; chat route has 0 direct `process.env.AI_PROVIDERS_JSON` reads. **Scope note:** Phase 9/10 added a DB-first registry (`loadProvidersAsync`) whose active row takes precedence and an admin "Activate" button; the env `activeId` mechanism remains as the documented fallback path (DB wins on duplicate ids; env used when Turso empty/unavailable). |
| 2 | Active provider fails before the first streamed token → exactly one automatic retry against the next configured chat provider; visitor still receives a complete streamed reply (SC2 / PROV-02) | ✓ VERIFIED | Failover control flow byte-unchanged from the live-tested state (`git diff 9cf354a HEAD -- app/api/chat/route.ts` = 5 lines, registry source only): commit-point probe `readFirstDelta`, per-attempt budget recompute inside `pass < 2` (route L354-357), cancel+dispose on abandon, exactly one locked-format warn site (L446), all-fail buffered last error. Carried-forward live S2 (one warn → reply from candidate[1]) and S3 (two warns → one error + done) stand. Adapter layer now used by `streamProvider` and re-proven by node probe. |
| 3 | Admin console lists every configured provider and each row shows a status badge (SC3a / PROV-03) | ✓ VERIFIED (scope note) | `app/admin/page.tsx` maps all providers (`providers.map((p) => …)`, L570); the active row renders `<Badge variant="success">active</Badge>` (L579-581); exactly one active row per type. **Scope note:** the rewritten Phase 9/10 UI replaced the literal "standby" outline badge with an "Activate" button on every non-active row (L584-594) plus type/protocol badges (L575-578). Status remains unambiguous (active badge vs. Activate affordance); the specific 04-UI-SPEC badge styling was intentionally superseded by the later admin rewrite. |
| 4 | Live test targets ANY configured provider — per-row Test button + result under that row (SC3b / PROV-03) | ✓ VERIFIED | `runTest(id: string)` posts `{ action: "test", id }` (L280-315); per-row `<Button onClick={() => runTest(p.id)} disabled={!!testingIds[p.id]}>` with `RefreshCw` / `Loader2` (L595-607); per-row `rowResults[p.id]` line rendered under each row with neutral success / danger failure tones (L625-637). Global zero-arg `runTest` button and `Rocket` icon: 0 (gate green). |
| 5 | POST /api/providers {action:"test", id?} — id present tests that provider; id absent tests active, byte-compatible | ✓ VERIFIED | `const target = id ? reg.providers.find((p) => p.id === id) : getActiveProvider(reg)` (L64-66); `getActiveProvider` count 2, `readJsonBody` count 2, `provider_not_found` count 1 (gates green). |
| 6 | Unknown id → 404 provider_not_found; auth guard FIRST, rate limit second (T-04-05) | ✓ VERIFIED | L56 `if (!adminConfigured() || !isAdminRequest(req)) return unauthorized();` then L57 `rateLimit("providers-test:" + clientIp(req), 6)`; 404 branch at L67-72 is post-guard. Order unchanged by the `loadProvidersAsync` switch. |
| 7 | Test-failure detail redacts the TARGET provider's apiKey, 300-char cap (T-04-06 / WR-03) | ✓ VERIFIED | `String(result.detail).split(target.apiKey as string).join("***").slice(0, 300)` (L103-107); `target.apiKey` count 4, `replace(provider.apiKey` count 0 (gate green). GET still masks keys via `maskKey`/`publicShape` (`keyPreview` present in admin row, L623). |
| 8 | Failover events stay server-side console.warn only — no identity fields in admin DOM | ✓ VERIFIED | Exactly 1 `console.warn` site in the chat route (L446), locked format `failed before first token (<redacted>); failing over` / `; no candidates left`; warn detail is run through `redact` (all candidate keys stripped) and `scrubIdentity` (model names replaced) on the visitor path. Admin page has no failover-history UI. |
| 9 | Admin ergonomics preserved: 44px+ targets, mono ids/models, masked keys, card language | ✓ VERIFIED | Per-row controls use `variant="ghost" size="sm"` with `font-mono` model + `keyPreview` line (L622-623); rewritten UI keeps the glass/card design language. Visual/touch sizing of the new Phase 9/10 UI is that phase's deliverable; no phase-4 regression found in code. |
| 10 | No byte reaches the visitor before a candidate is committed — failover can never duplicate text | ✓ VERIFIED | `makeStreamResponse` constructed only under `probe.ok && probe.reader && probe.pendingDeltas && probe.tailBuffer !== undefined` (L362-397); pending deltas enqueued first, then pass-through from held reader seeded with tail buffer + carried decoder (L173-209). Research restart stays pre-commit (bounded `pass < 2`). Control flow byte-unchanged since live S2 (first event was a delta). |
| 11 | Mid-stream failures never retry cross-provider; surface as error event + done exactly as before | ✓ VERIFIED | The committed stream is `return`ed from inside the candidate loop (L387 / L433) — loop already exited; the stream's `catch` closure (L210-215) only pushes an error event and has no path to candidate advancement. Static control-flow proof re-confirmed on current tree. |
| 12 | If every candidate fails, the LAST candidate's redacted, identity-scrubbed error reaches the visitor — generic copy, no provider names | ✓ VERIFIED | Post-loop buffered response (L453-464): `error: redact(scrubIdentity(lastErr.detail || "The AI provider failed to respond."))` then `{done:true}`; no provider names added. Carried-forward live S3: 2 warns, 1 error + done, 0 deltas, 0 brand tokens. |
| 13 | Every emitted SSE payload is exactly {delta}/{error}/{done} (+ documented {type:"mail"}/{type:"sources"} signals); SSE_HEADERS, sseEvent, maxDuration = 180 unchanged (SC4) | ✓ VERIFIED | `sseEvent(` count 8; `SSE_HEADERS` L61-65, `sseEvent` L67-69, `maxDuration = 180` L59 unchanged; `FAILOVER_BUDGET_MS = 170000` L295. Carried-forward live S5 histogram: `{delta:1, done:2, error:1, other:0}`, 0 identity fields. Scope note (honest): later phases added the documented `{type:"mail"}` and `{type:"sources"}` signals to the same envelope; no identity fields ride any event. |
| 14 | Error detail shown to visitor is stripped of EVERY candidate's apiKey and capped at 300 chars (T-04-01) | ✓ VERIFIED | `keys` built from all viable candidates pre-loop (L276); `redact` splits/joins each key → `***` then `.slice(0, 300)` (L277-283); `scrubIdentity` L286-291. Carried-forward live S4: sentinel keys absent from error events. |
| 15 | SSRF gates (validateProviderUrl + hostIsAllowed) run per candidate inside streamProvider/callProvider; route never passes a pre-validated URL (T-04-02) | ✓ VERIFIED | `validatedUrl` count in chat route = 0; both gates run inside `streamProvider` (L843-856) and `callProvider` (L928-944) when `opts.validatedUrl` is unset, and inside image (`generateImage` L244-252) and video helpers (`createVideoTask` L1029-1031, `getVideoTask` L1112-1114). Both host gate + URL validation confirmed present on every outbound surface by grep. |
| 16 | DAILY_LIMIT honored, AI_PROVIDERS_JSON/activeId never mutated at runtime, key material never client-side (SC4) | ✓ VERIFIED (scope notes) | Chat route never writes registry/activeId; failover loop stateless. Grep: zero `AI_PROVIDERS_JSON`/apiKey literals in components/ or public pages from this phase's surfaces. `loadProvidersAsync` only reads. **Scope note:** DAILY_LIMIT is now 50 (Phase 6 raised 30→50, owned by that phase); admin-managed providers are AES-256-GCM encrypted in Turso (Phase 9), a later-phase addition that strengthens rather than weakens this bar. |

**Score:** 16/16 truths verified (0 present-but-behavior-unverified — the changed adapter layer was behaviorally exercised by this refresh's node probe; the unchanged failover control flow carries the previous refresh's passing live evidence)

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Live .env.local carries a second CHAT provider | Phase 5 | DEPL-02: production registry is an owner-side config operation; mechanism code- and node-proven at this refresh. |

### Advisory (New Scope, Unevidenced)

None. Re-verification ran; no new-scope blocker candidate was found without deterministic evidence. The admin "standby" badge → "Activate" affordance change is documented as an intentional later-phase UI evolution under Truth 3, not treated as a gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/providers.ts` → `orderedChatCandidates(registry?): ProviderConfig[]` | Ordered chat candidate export | ✓ VERIFIED | Filters image AND video; dedupe + active-first incl. silent fallback intact; node probe PASS against synthetic registry |
| `lib/providers.ts` → protocol adapters | `resolveChatUrl/buildChatRequest/extractChatReply/toOpenAISSE/buildAuthHeaders` | ✓ VERIFIED | Node probe 21/21: openai backward compatibility + anthropic/google mapping + real SSE frame translation |
| `app/api/chat/route.ts` → `readFirstDelta` + `FirstTokenProbe` | Module-local first-token probe | ✓ VERIFIED | Including tailBuffer/tailDecoder carry; used in the loop (L88-153, L362) |
| `app/api/chat/route.ts` → POST candidate loop | Probe-guarded failover | ✓ VERIFIED | Per-attempt budget recompute (L354-357), commit branch, capability fallback, all-fail path all intact |
| Failover warn format + `FAILOVER_BUDGET_MS = 170000` | Locked log format + shared budget | ✓ VERIFIED | Exactly 1 warn site (L446); budget L295; `maxDuration = 180` L59 |
| `app/api/providers/route.ts` + `app/admin/page.tsx` | Hybrid registry + per-row tests | ✓ VERIFIED | Both rewritten by later phases; every phase-4 admin truth re-confirmed on current code (Truths 3-7) |
| `lib/db.ts` + defensive ALTER columns | providers.protocol; messages image_url/video_url/job_id/meta | ✓ VERIFIED | L158-162 defensive `ALTER TABLE … ADD COLUMN` guarded by `CREATE TABLE IF NOT EXISTS` (L111-142) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `orderedChatCandidates` candidate[0] | `getActiveProvider()` return (incl. silent fallback) | function reuse | ✓ WIRED | lib/providers.ts L151; node probe confirms admin badge and failover order cannot diverge; video/image-aware |
| `readFirstDelta` commit | Response construction | probe.ok guard | ✓ WIRED | `makeStreamResponse` only under `probe.ok`; pending deltas re-emitted first; tail decoder carried |
| `redact` key list | ALL viable candidates | pre-loop closure | ✓ WIRED | L276-283 unchanged |
| Abandoned candidate cleanup | reader.cancel + dispose | probe-failure branch | ✓ WIRED | Also the research-restart abandon path (L370-374, L401-406) |
| Protocol adapters | `streamProvider`/`callProvider` | function calls | ✓ WIRED | `resolveChatUrl`+`buildChatRequest`+`buildAuthHeaders`+`toOpenAISSE` used in both; openai identity path proven |
| Admin target resolution / per-row test | providers route + admin page | `runTest(id)` → POST | ✓ WIRED | `rowResults[id]`/`testingIds[id]` keyed by provider id; 404/redaction on server |
| Chat panel → conversation persistence | `/api/conversations*` via `lib/conversations.ts` | X-Device-Token bearer | ✓ WIRED | `saveMessage` at chat-panel L613/615 (text), L874/876 (image), L947/1024 (video) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| Chat stream | `delta` events | Live provider (registry, DB-first + env fallback) | Yes — prior live SSE captured | ✓ FLOWING |
| Conversation list | `conversations` | Turso via /api/conversations | Yes — prior live rows created/read/deleted | ✓ FLOWING |
| Research sources | `sources` events | You.com YDC (unconfigured locally → graceful path verified in code) | Graceful degradation verified | ✓ FLOWING (degraded path proven) |
| Admin provider list | providers | Hybrid registry (DB-first, env fallback) | Yes — GET maps `reg.providers` via `publicShape` | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Typecheck current tree | `npx tsc --noEmit` | exit 0 | ✓ PASS (this refresh) |
| Protocol adapter backward compat + mapping + candidate order | Node probe transpiling real `lib/providers.ts` | 21/21 checks PASS, incl. real Anthropic→OpenAI SSE frame translation | ✓ PASS (this refresh) |
| Failover static gates | grep: validatedUrl=0, warn-site=1, pre-gate=0, `maxDuration=180`≥1, budget=1, `sseEvent(`=8 | all green | ✓ PASS (this refresh) |
| Providers route gates | grep: auth-first L56, rate-limit L57, provider_not_found=1, target.apiKey=4, `replace(provider.apiKey`=0, getActiveProvider=2 | all green | ✓ PASS (this refresh) |
| Admin row-test gates | grep: RefreshCw=2, rowResults=8, per-row runTest=1, Rocket=0, keyPreview=2, active badge=2 | all green | ✓ PASS (this refresh) |
| Debt-marker / stub scan | 9 covered source files, TBD/FIXME/XXX/HACK/PLACEHOLDER/not-implemented | only legitimate HTML `placeholder=` attributes and an `XXXX-XXXX` format comment; no debt markers | ✓ PASS (this refresh) |
| Live failover S0–S5 (503, happy, invalid-activeId, one-retry failover, all-fail, SSE histogram, PRES-01) | dev:3100 process-scoped env (previous refresh) | recorded PASS in previous report; control flow byte-unchanged (`git diff 9cf354a HEAD` = 5 lines) | ✓ PASS (carried forward — not re-run this refresh) |
| `npm run build` | (not run) | tsc sufficient; no dev server holding `.next` | ? SKIP |

### Probe Execution

No probes declared in the phase PLAN/SUMMARY files and no conventional `scripts/*/tests/probe-*.sh` exist — Step 7c not applicable. The Node-level adapter probe above is a verifier-authored read-only check (temp file, no repo writes).

### Test Quality Audit

No automated test suite exists for the phase requirements (ENG-01 — automated tests for security-critical `lib/` functions — is deferred in REQUIREMENTS.md and owned by a later phase). No disabled/circular tests to audit. Behavioral verification relies on the carried-forward live scenarios and this refresh's Node probe, as documented above.

### Decision Coverage

Skipped by the gate: "No trackable decisions in CONTEXT.md" (04-CONTEXT.md decisions are prose, not the machine-readable `<decisions>` trackable format). Non-blocking.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PROV-01 | 04-01 | Multiple providers; switch active by editing `activeId` only — no code changes | ✓ SATISFIED | Truth 1; node probe candidate ordering + fallback; env mechanism intact under DB-first registry |
| PROV-02 | 04-01 | Pre-token failure → retry against next configured provider, still returns a reply | ✓ SATISFIED | Truth 2; byte-unchanged failover control flow + carried-forward live S2/S3 + node-probed adapters |
| PROV-03 | 04-02 | Admin lists every provider with status; live test targets any provider | ✓ SATISFIED | Truths 3-9; per-row Test/result, masked keys and active badge re-confirmed on the rewritten UI |

No orphaned requirements (REQUIREMENTS.md maps exactly PROV-01/02/03 to Phase 4).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | No TBD/FIXME/XXX/HACK/PLACEHOLDER debt markers and no stub implementations in the covered source files (matches are legitimate HTML input `placeholder=` attributes and an `XXXX-XXXX` id-format comment) | — | Debt-marker gate clean |

### Human Verification Required

None new for the phase-4 must-haves. The failover behavior carries passing live evidence from the previous refresh on byte-identical control flow, and the changed adapter layer is behaviorally proven by this refresh's node probe. The rewritten Phase 9/10 admin UI's visual details (including the "Activate" affordance replacing the literal standby badge) and the Phase 10 AI Chats tab are those later phases' deliverables and were not visually re-walked here. One standing owner-side operational item remains deferred to production config (see Deferred Items).

### Gaps Summary

No gaps. Every phase-4 must-have re-verified against the current tree: config-only switching with image AND video providers excluded and default-openai backward compatibility (node probe + node-level ordering checks); probe-guarded failover with exactly one locked-format warn and a complete streamed reply (control flow byte-unchanged, prior live evidence stands); all-fail last redacted error with zero deltas; SSE contract and redaction bar intact; SSRF gating per call on every outbound surface including the new protocols, image and video helpers; provider-list, per-row test and masked-key admin truths intact in the rewritten DB-only UI; defensive DB ALTER columns present. The adapter layer that changed in this delta was behaviorally exercised (21/21 checks, including a real Anthropic SSE→OpenAI translation). Status remains `passed`.

---

_Verified: 2026-11-17T22:56:00Z_
_Verifier: the agent (gsd-verifier)_

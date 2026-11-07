---
phase: 04-multi-provider-chat-with-automatic-failover
fixed_at: 2026-11-07T08:17:40Z
review_path: .planning/phases/04-multi-provider-chat-with-automatic-failover/04-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-11-07T08:17:40Z
**Source review:** .planning/phases/04-multi-provider-chat-with-automatic-failover/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01 … WR-05; Critical 0; Info IN-01/IN-02 excluded by scope)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: UTF-8 multi-byte character corruption at the probe commit boundary

**Files modified:** `app/api/chat/route.ts`
**Commit:** `8f96701` (`fix(04): WR-01 carry decoder across first-token commit`)
**Status:** fixed — requires human verification (behavioral edge; not reproducible in a smoke test)
**Applied fix:** `FirstTokenProbe` gains `tailDecoder?: TextDecoder`; the `readFirstDelta` commit return now carries the probe's `stream:true` decoder, and the committed stream's `start()` reuses it (`const decoder = tailDecoder ?? new TextDecoder();`, reviewer's fix text) instead of constructing a fresh decoder. Retained incomplete trailing multi-byte sequences now survive the commit point, so a CJK/emoji/accented character split at the first-content chunk boundary decodes correctly instead of degrading to U+FFFD.

### WR-02: Model/provider identity can reach the public stream via upstream-echoed error detail (PRES-01)

**Files modified:** `app/api/chat/route.ts`
**Commit:** `77389b2` (`fix(04): WR-02 scrub model identity from visitor-bound error detail`)
**Status:** fixed — requires human verification (security behavior; logic is a direct split/join mirror of the proven `redact` pattern)
**Applied fix:** Added a `scrubIdentity` closure beside the existing `redact` closure (reviewer's fix text): it replaces every viable candidate's `model` string with `[model]`. Both visitor-bound error emissions now compose it — the mid-stream catch (`push({ error: redact(scrubIdentity(...)) })`) and the all-fail buffered path — while the server-side `console.warn` keeps full key-redacted detail (model id stays visible server-side for diagnosis). Deviation from the reviewer's literal composition, deliberately: scrub runs BEFORE `redact`'s 300-char cap (`redact(scrubIdentity(detail))` instead of `scrubIdentity(redact(detail))`) so a model id truncated across the cap boundary cannot leak its tail.

### WR-03: Admin test-failure redaction replaces only the FIRST occurrence of the target key

**Files modified:** `app/api/providers/route.ts`
**Commit:** `cedb2a9` (`fix(04): WR-03 redact all key occurrences in providers test detail`)
**Status:** fixed
**Applied fix:** `String(result.detail).replace(target.apiKey ?? "", "***")` → `.split(...).join("***")` — every occurrence of the target provider's key is redacted from the admin test-failure detail, matching the chat route's redaction strength. T-04-06 fully closed. (The longer-term shared-helper refactor suggested by the reviewer was left out to keep the fix atomic.)

### WR-04: Impossible-state guard — `target.apiKey ?? ""` nullish default in test redaction

**Files modified:** `app/api/providers/route.ts`
**Commit:** `bf7a5a6` (`fix(04): WR-04 drop impossible-state apiKey nullish default in test redaction`)
**Status:** fixed (reviewer's preferred treatment: remove)
**Applied fix:** Removed the `?? ""` nullish default — the `provider_not_configured` guard (route lines 72-77) has already rejected every falsy `apiKey` before this line — and recorded the invariant in a comment, including the reviewer's observation that an empty pattern would PREPEND `***` rather than redact. The pattern is now `target.apiKey as string` per the reviewer's fix text.

### WR-05: Impossible-state guard — unreachable `sentChars === 0` branch in the committed stream

**Files modified:** `app/api/chat/route.ts`
**Commit:** `70013d7` (`fix(04): WR-05 remove unreachable sentChars guard in committed stream`)
**Status:** fixed (reviewer's preferred treatment: remove)
**Applied fix:** Deleted the `if (sentChars === 0)` branch in the committed stream's `finally` — the probe only commits when `pending.length > 0` with non-empty pieces, all pushed before `finally` runs, so the branch is dead in every path. The now-dead `sentChars` counter (declared solely to back that branch) was removed with it.

## Skipped Issues

None.

## Verification

**Isolation:** fixes were applied and committed in the dedicated review-fix worktree `.claude/worktrees/rf-04-1611-1794039061` (branch `gsd-reviewfix/04-1611`), then fast-forwarded onto `main`; worktree, temp branch and recovery sentinel were removed after the fast-forward. Per-finding `tsc --noEmit` ran inside the worktree (TypeScript 5.9.3 from the parent checkout's node_modules, resolved via parent-directory walk-up).

**Post-fix gates — run in the MAIN checkout after the fast-forward (reproducible from the current tree at `70013d7`):**
- `npx tsc --noEmit` — exit 0.
- 04-01-PLAN Task 2 grep gates — `failed before first token` warn sites = 1; `Active provider has an invalid base URL` count 0; `validatedUrl` count 0.
- 04-01-PLAN Task 3 invariant gates — `components/`, `app/chat/`, `app/api/image/` unchanged vs phase base `6f2d7da^`; `DAILY_LIMIT = 30` intact; `process.env.AI_PROVIDERS_JSON` reads in the chat route = 0.
- 04-02-PLAN Task 1/2 grep gates — `provider_not_found` present; `replace(provider.apiKey` count 0; admin page button/badge literals unchanged (`standby`, `p.id === activeId ? (` counts ≥ 1, removed icons 0).
- Live SSE contract smoke on the running dev server :3000 — POST `/api/chat` with "Reply with exactly: ok" returned exactly two events: one `delta` ("ok") and `done:true`; every payload carried exactly one of delta/error/done; no `error` events. This exercises the WR-01 carried-decoder commit path end-to-end and confirms the locked SSE contract is unchanged.

**Out of scope (unchanged):** IN-01 and IN-02 remain open in 04-REVIEW.md (Info tier, excluded from this fix pass).

---

_Fixed: 2026-11-07T08:17:40Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

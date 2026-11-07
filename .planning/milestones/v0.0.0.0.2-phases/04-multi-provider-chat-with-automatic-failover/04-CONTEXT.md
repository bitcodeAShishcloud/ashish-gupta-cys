# Phase 4: Multi-Provider Chat with Automatic Failover - Context

**Gathered:** 2026-11-07
**Status:** Ready for planning

<domain>
## Phase Boundary

The chat runs on two interchangeable providers. `/api/chat` tries the active provider first; if it fails **before the first streamed token**, it retries exactly once against the next chat provider in `AI_PROVIDERS_JSON` order and still returns a complete streamed reply. The admin console lists every configured provider with an active/standby badge and can live-test any provider, not just the active one. Zero changes to the visitor experience: same SSE contract, name gate, 30/day limit, no provider/model identity in the public stream or DOM.

</domain>

<decisions>
## Implementation Decisions

### Failover trigger & retry policy
- Failover triggers on **every provider failure that happens before the first streamed token** — HTTP error, 120s timeout, non-streamable body, malformed/empty reply.
- **No cross-provider retry mid-stream** (after the first delta reached the visitor): the partial output is already shown, a retry would duplicate text. Mid-stream errors surface exactly as today (error box + rollback).
- **Exactly one retry** against the next chat provider in `AI_PROVIDERS_JSON` order.
- If every provider fails, the **last error is returned to the visitor** through the existing error path — no silent fallback.

### Provider selection & rotation
- Try order: **active provider (`activeId`) first, then the remaining chat providers in `AI_PROVIDERS_JSON` array order**.
- **Stateless per-request failover** — no in-memory circuit breaker (unreliable on serverless; `activeId` is the owner's manual switch).
- **`activeId` in `AI_PROVIDERS_JSON` is never modified** by failover; config stays the owner's manual control.
- A **429 rate-limit is treated as a provider failure** and triggers the retry.

### Admin console
- Existing "Configured providers" card is **extended**: each row gains a status badge (`active` / `standby`).
- **Per-provider "Test" button** on every row — targets that specific provider; the active row keeps its badge and is testable like any other.
- Test endpoint stays `POST /api/providers { action: "test" }` and gains an **optional `id`** — present → test that provider; absent → test the active one (backward-compatible). No new endpoint.
- Failover events appear only as **server-side `console.warn` lines** (provider id + short reason, no PII); no failover history in the admin UI.

### Visitor experience & logging
- **No provider or model identity anywhere in the public stream or DOM** (PRES-01, already shipped and locked).
- Visitor error copy when all providers fail stays the **existing generic message** — provider names are never shown.
- One `console.warn` per failover attempt; no PII.
- **Zero client-side changes** — the SSE contract, name gate, and 30/day limit are untouched; failover is entirely server-side.

### Claude's Discretion
Exact error-normalization helper structure, where the ordered provider list is built (route vs providers.ts), the warn-line format, and admin-row badge styling within the existing design language.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/providers.ts` — `loadProviders()`, `getActiveProvider()`, `streamProvider()`, `callProvider()`, `isImageProvider()`, `validateProviderUrl()` are all per-provider already; failover only needs an ordered candidate list + a loop in the route.
- `app/api/chat/route.ts` — SSE writer (`delta`/`error`/`done` events) is provider-agnostic; the route already falls back from `streamProvider` to `callProvider` for non-streamable providers (buffered fallback), which the retry loop must preserve.
- `app/api/providers/route.ts` — `GET` already returns `activeId` + all providers (keys masked); `POST {action:"test"}` tests the active provider and becomes the extension point for the optional `id`.
- `app/admin/page.tsx` — providers card already lists providers with name/model; add a badge and per-row Test.

### Established Patterns
- Route handlers never throw — they return `{ error, message }` JSON; SSE errors are emitted as `{"error":...}` events.
- Defensive parsing (`String(x ?? "")`, `Array.isArray`, try/catch) everywhere.
- SSRF gates (`validateProviderUrl` + `hostIsAllowed`) run before every outbound fetch and must run per candidate provider.
- `console.error` used for config problems; `console.warn` fits failover events.

### Integration Points
- `app/api/chat/route.ts` — the streaming path is the only place failover lives.
- `app/api/providers/route.ts` POST handler — test target override.
- `app/admin/page.tsx` providers card — badges + per-row test wiring.

</code_context>

<specifics>
## Specific Ideas

- PROV-02 wording is the contract: "retries once against the next configured provider and still returns a reply."
- The shipped SSE contract (`data: {"delta"}` / `{"error"}` / `{"done"}`) is verified in Phase 1 and must not change.
- Server routes never throw; they return structured JSON errors.
- The public chat must never reveal which provider answered.

</specifics>

<deferred>
## Deferred Ideas

- Provider health dashboard / failover history in admin — out of scope; console.log only.
- Automatic promotion of a healthy provider into `activeId` — rejected (manual config is the contract).
- Multi-provider failover for **image** generation — not in scope; chat only.

</deferred>

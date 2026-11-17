# Phase 9 Context: Admin-Managed Encrypted Providers

**Phase:** 9 — Admin-Managed Encrypted Providers (Phase 4 natural extension)
**Date:** 2026-11-18
**Input:** Owner direction: "is phase me ek or chiz jodo ki admin panel se providers ko jod sakte hai (vercel env ki jarurat nahi hai)" + "vo securely DB me save ho".

4 gray areas were asked and answered in one round. All locked below.

## Domain Boundary

The admin panel can create, edit, delete, set-active and live-test AI providers (chat / image / video) at runtime, with **no Vercel env-var edit or redeploy**. Provider API keys are encrypted at rest in Turso (AES-256-GCM), never stored in plain text, never sent to the browser in full. The public chat/failover path keeps working when the DB is unavailable via an env fallback. Zero change to the visitor experience or the SSE contract.

## Locked Decisions

| # | Area | Decision |
|---|------|----------|
| 1 | Encryption key | **`PROVIDER_ENCRYPTION_KEY`** env var (32-byte hex), set in `.env.local` + Vercel. Only this one master key lives in env; all provider keys encrypted in DB. |
| 2 | Source of truth | **Hybrid — DB priority, env fallback.** Admin-managed DB providers win; if DB is empty or unavailable, `AI_PROVIDERS_JSON` env is used. The current Turso 401 incident does NOT block implementation. |
| 3 | Active provider | **Per-type active flag** on each provider row (`chat` / `image` / `video` each have their own active provider). Matches existing `resolveImageTarget()` / `resolveVideoTarget()` separation. |
| 4 | Turso 401 sequencing | Continue with the fallback path; do not wait for the token fix. Feature works automatically once the token is corrected. |

## Technical Design (locked by the above)

### Encryption (`lib/crypto.ts` — new)
- AES-256-GCM via Node `crypto` (server-only).
- Random IV per encryption; format: `enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>`.
- `encryptKey(plain): string` / `decryptKey(stored): string` / `isEncrypted(s): boolean`.
- Plain values from env are accepted transparently (`isEncrypted` false → use as-is) so the hybrid fallback needs no migration.
- Master key read from `process.env.PROVIDER_ENCRYPTION_KEY` (accept 64-hex chars; derive via `createHash('sha256')` if not exactly 32 bytes).
- Any decrypt failure → treat provider as unusable, log server-side error (no key in log), never leak raw token to client.

### DB schema (extend `lib/db.ts` `ensureSchema`)
```sql
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,              -- enc:v1:... (encrypted)
  model TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'chat',  -- chat | image | video
  active INTEGER NOT NULL DEFAULT 0,
  context_window INTEGER,
  max_output INTEGER,
  endpoint TEXT, auth_header TEXT, auth_prefix TEXT, response_field TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_providers_type_active ON providers(type, active);
```
One active per type enforced in the PATCH/set-active handler (clear others of same type in a transaction/batch).

### Provider loading (`lib/providers.ts`)
- Add `loadProvidersAsync(): Promise<ProviderRegistry>` — DB first (decrypt keys), then merge env `AI_PROVIDERS_JSON` entries not present by id. DB entries win on id conflict. On any DB error, return env-only registry.
- Keep sync `loadProviders()` (env-only) for the failover research path and any callers that cannot await. Chat route switches to `loadProvidersAsync()` at request start and passes candidates through the existing loop.
- Short in-memory cache (~10s) keyed by nothing (global registry) to avoid a DB query per request; invalidated by admin mutations.
- `getActiveProvider()` / `orderedChatCandidates()` get async variants that accept an optional registry argument so no double DB read.

### Admin API routes (all behind `isAdminRequest` + `adminConfigured`)
| Route | Method | Purpose |
|---|---|---|
| `/api/admin/providers` | GET | list all (keys decrypted → masked via existing `maskKey`), active flags |
| `/api/admin/providers` | POST | add — validate `baseUrl` via `validateProviderUrl`, encrypt key before INSERT |
| `/api/admin/providers/[id]` | PATCH | edit fields / set active (clears same-type active) / re-encrypt |
| `/api/admin/providers/[id]` | DELETE | remove |
| existing `/api/providers {action:test}` | POST | already tests any provider by id — reuse unchanged |

Rate-limit all mutations via `rateLimit()` from `lib/chat-http.ts`. Never echo raw keys in errors.

### Admin UI (`app/admin/page.tsx`)
- Extend the existing **providers tab** (add/edit/delete/set-active per row) and keep the generate tab for env export.
- Form fields: id, name, baseUrl, apiKey, model, type, contextWindow, maxOutput; advanced: endpoint / authHeader / authPrefix / responseField (collapsible, like the current generate tab).
- Key display always masked (`sk-xt-c7…(56 chars)`); editing a key is optional (blank = keep existing).
- Test button per row already exists — wire to existing `/api/providers` test action.

### Security properties
- Keys encrypted at rest (AES-GCM authenticated → tamper detection).
- Master key only in env, never in DB.
- Full keys never in any API response to the browser; masked only.
- Admin auth + rate limits on all mutations.
- `validateProviderUrl` before saving (SSRF gate); `AI_ALLOWED_HOSTS` still governs outbound at call time for providers loaded from either source.
- DB dump without `PROVIDER_ENCRYPTION_KEY` yields no usable keys.

## Files In Scope

**New:** `lib/crypto.ts`, `app/api/admin/providers/route.ts`, `app/api/admin/providers/[id]/route.ts`
**Modified:** `lib/db.ts` (schema), `lib/providers.ts` (async hybrid loader + cache), `app/api/chat/route.ts` (use async loader), `app/admin/page.tsx` (UI), `.env.example` (document `PROVIDER_ENCRYPTION_KEY`), `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`

## Out of Scope
- Encrypting the existing env `AI_PROVIDERS_JSON` value (env is trusted platform config).
- Key rotation / re-encrypt-all UI (optional future).
- Provider health history or auto-promotion (Phase 4 locked decision: manual control only).
- Fixing the Turso 401 token itself (owner's operational step; fallback path handles it).

## Open Items
None. All 4 gray areas answered. Implementation can proceed on agent switch.

## Canonical Refs
- `.planning/milestones/v0.0.0.0.2-phases/04-multi-provider-chat-with-automatic-failover/04-CONTEXT.md` — Phase 4 failover contract (zero visitor impact, SSE unchanged)
- `lib/providers.ts`, `lib/db.ts`, `app/admin/page.tsx` — integration points

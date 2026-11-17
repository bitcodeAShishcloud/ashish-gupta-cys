# Phase 10 Context: Admin AI Chats Viewer + Full Backup

**Phase:** 10 — Admin AI Chats Viewer + Full Backup
**Date:** 2026-11-18
**Input:** "chat jo bhi ho rha hai vo nhi dikh rha admin me jitna bhi chat ka output aaye sab db se admin me dikha with all credential of that device (including image), ache se design banao and then fix kro" + earlier "full backup and also sare user ke chat with all info".

3 security-sensitive decisions were asked and answered. All locked below.

## Domain Boundary

The admin console gains a first-class **AI Chats** area that reads the whole Turso dataset — every device, every conversation, every message (text / image / video / mail drafts / sources) — with device metadata (name, token hash, user-agent, timestamps, counts). A **Full Backup** endpoint exports the entire DB as a JSON file with provider API keys still encrypted (`enc:v1:...`) and media as URLs + metadata (the server never fetches media — CSP-safe). No visitor-facing change; no new server-side visitor state.

## Locked Decisions

| # | Area | Decision |
|---|------|----------|
| 1 | Device credentials shown | **Device name + truncated SHA-256 token hash + metadata** (user-agent, created/last-seen, counts). Raw device token is NEVER stored or displayed — the DB only has the hash, so a DB leak cannot impersonate a visitor. |
| 2 | Backup provider keys | **Encrypted only** (`enc:v1:...`). Backup JSON contains ciphertext; restoring requires `PROVIDER_ENCRYPTION_KEY`. A leaked backup yields no usable keys. |
| 3 | Media in backup/admin | **URL + metadata only** (image/video URL, jobId, prompt, aspect, style, tier, seconds). Server never fetches provider media (CSP `connect-src 'self'`); browser renders previews directly. |

## Existing Assets (grounded in code)

- `app/api/admin/ai/users/route.ts` — already lists users with `device_name`, counts (id is the SHA-256 hash from `userIdForToken()`).
- `app/api/admin/ai/conversations/route.ts` — lists all conversations, optional `?userId` filter.
- `app/api/admin/ai/conversations/[id]/route.ts` — full messages for one conversation (role, content, kind, mail, sources, created_at).
- `app/admin/page.tsx` — existing Tabs (Providers / Generate Env); admin session guard.
- `lib/db.ts` — `users`, `conversations`, `messages`, `providers` tables; `getDb()`, `ensureSchema()`, `now()`, `newId()`.
- `lib/crypto.ts` — AES-256-GCM `encryptKey()` / `decryptKey()` / `isEncrypted()`.
- Message shape (`components/chat-panel.tsx`): `kind: text|image|video`, `image`, `videoUrl`, `jobId`, `meta{prompt,aspect,style,tier,seconds,revisedPrompt,createdAt}`, `mail`, `sources`.

## Gap Found (why admin shows no chats today)

`saveMessage()` in `lib/conversations.ts` persists only `role/content/kind/mail/sources` — it DROPS `image`, `videoUrl`, `jobId`, and `meta`. The admin API routes return `messages` without those columns. So even text chats may be missing from DB if not saved, and image/video outputs are invisible. Phase 10 must:

1. Extend `messages` table with `image_url`, `video_url`, `job_id`, `meta` (TEXT JSON).
2. Extend `saveMessage()` to accept and store those fields; call it from image/video completion paths in `chat-panel.tsx`.
3. Extend admin conversation API to return the new fields.
4. Build the admin UI (below).

## Implementation Plan

### 1. DB schema (`lib/db.ts`)
```sql
ALTER TABLE messages ADD COLUMN image_url TEXT;
ALTER TABLE messages ADD COLUMN video_url TEXT;
ALTER TABLE messages ADD COLUMN job_id TEXT;
ALTER TABLE messages ADD COLUMN meta TEXT;   -- JSON
```
Since `CREATE TABLE IF NOT EXISTS` won't alter existing tables, add a safe `ensureColumn()` that runs `PRAGMA table_info` + `ALTER TABLE ... ADD COLUMN` guarded (catch "duplicate column" silently).

### 2. Persistence (`lib/conversations.ts` + `chat-panel.tsx`)
- `saveMessage()` signature gains optional `imageUrl, videoUrl, jobId, meta`.
- `runGeneration()` (image) and video completion call `saveMessage()` with the URL/jobId/meta.
- `send()`/`sendFrom()` already save text — keep.

### 3. Admin APIs
- Update `app/api/admin/ai/conversations/[id]/route.ts` SELECT to include new columns + parse `meta` JSON.
- New `GET /api/admin/ai/backup` — admin-auth + rate limit. Returns:
```json
{
  "format": "ashish-portfolio-full-backup",
  "version": 1,
  "exportedAt": "...",
  "users": [{ id(hash), deviceName, createdAt, lastSeen, conversations: [
      { ...conv, messages: [{ role, content, kind, mail, sources, imageUrl, videoUrl, jobId, meta, createdAt }] }
  ]}],
  "providers": [{ ..., "apiKey": "enc:v1:..." }],
  "stats": { users, conversations, messages, providers }
}
```
Provider `api_key` values are copied raw from DB (already encrypted by Phase 9) — never decrypted in the backup path.

### 4. Admin UI (`app/admin/page.tsx`)
- New **"AI Chats"** tab (third tab) with a 3-pane layout:
  - **Pane 1 — Devices**: list of users (device name, truncated hash, last-seen, message count). Click to filter.
  - **Pane 2 — Conversations**: list for selected device (title, mode, message count, updated). Click to load.
  - **Pane 3 — Full chat view**: messages with text (markdown), image `<img>` preview + link, video `<video>` preview + link, mail badge, sources collapsible. Device header shows name + hash + metadata.
  - Mobile: single-pane drill-down (Devices → Conversations → Chat) with back buttons.
- **Backup button** in the tab header: "Download full backup (.json)" → fetches `/api/admin/ai/backup`, triggers client-side Blob download with timestamped filename.
- Design language: existing dark monochrome + green accent, glass cards, mono labels, 44px touch targets.

### 5. Rate limits + auth
- All new admin routes behind `isAdminRequest` + `adminConfigured` + `rateLimit()` (10/min for lists, 3/min for backup — large payload).

## Files In Scope

**New:** `app/api/admin/ai/backup/route.ts`
**Modified:** `lib/db.ts`, `lib/conversations.ts`, `components/chat-panel.tsx`, `app/api/admin/ai/conversations/[id]/route.ts`, `app/api/admin/page.tsx` (AI Chats tab), `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`

## Out of Scope
- Restoring from a backup file (export only this phase).
- Server-side media fetching/proxying (CSP-safe: URL + metadata only).
- Raw device token storage (locked design: hash only).
- Decrypted keys in backups (locked: encrypted only).

## Canonical Refs
- `.planning/phases/09-admin-managed-encrypted-providers/09-CONTEXT.md` — encryption at rest, no key leak
- `lib/db.ts`, `lib/conversations.ts`, `app/api/admin/ai/*` — integration points
- `app/admin/page.tsx` — existing admin tabs pattern

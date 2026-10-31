---
last_mapped_commit: c6d59afa6a73db72a398ade0755ad30bf0b68c86
last_mapped_at: 2026-10-31
---
# Concerns & Technical Debt

**Analysis Date:** 2026-10-31

## High Priority

### 1. Zero test coverage (Quality)

No test runner, no CI. All security-critical logic (`lib/providers.ts` SSRF gates, `lib/admin-auth.ts`, `lib/captcha.ts`) is verified only by manual review. A regression to `validateProviderUrl()` or the host whitelist would ship silently. See `TESTING.md`.

### 2. No CI pipeline (Process)

No GitHub Actions; `npm run build`/`lint` only run when someone remembers. Type errors could reach production deploys (Vercel auto-deploys from `main`).

### 3. `strict: false` TypeScript (Quality)

`tsconfig.json` disables strict mode, so null/undefined errors are caught only at runtime. The code compensates with defensive `String(x ?? "")` guards, but the compiler provides no net for future edits.

## Medium Priority

### 4. In-memory rate limiting is per-instance (Scalability/Security)

`rateLimit()` in `lib/chat-http.ts` keeps buckets in a module-level `Map`. On Vercel serverless this is per-lambda-instance: effective limits are a multiple of the configured rate and reset on cold starts. Acceptable for a portfolio; would not scale as a real control.

### 5. Derived session secret depends on password strength (Security)

`sessionSecret()` falls back to `SHA-256(ADMIN_PASSWORD + ":admin-session")` when `ADMIN_SESSION_SECRET` is unset. A weak admin password therefore also weakens the HMAC key for sessions and the captcha encryption key. Setting `ADMIN_SESSION_SECRET` explicitly is the documented-but-optional fix.

### 6. Dual input paths for content (Maintainability)

All blog/portfolio content is hard-coded in `lib/content.ts` (996 lines). Adding a post means a code edit + deploy; there is no CMS, and blog content embeds large markdown template literals with code blocks inside, which is error-prone to edit.

### 7. Client-side usage limit is advisory only (Security)

The 30-messages/day chat limit is enforced via localStorage in `components/chat-panel.tsx`; the server only applies a per-minute rate limit. A user can clear storage to reset the daily counter.

## Low Priority

### 8. CSP relies on `'unsafe-inline'` (Security)

Documented in `next.config.mjs`: RSC flight payload and next/font require inline scripts/styles, so `script-src 'unsafe-inline'` is unavoidable without a custom server. Frame-deny and other headers mitigate.

### 9. Single `.env.local` carries live provider API key (Ops)

The working `AI_PROVIDERS_JSON` with a real API key sits in the local env file (gitignored — correctly). Losing the file loses the key; there is no secrets manager.

### 10. Stale tooling artifacts in working tree (Hygiene)

`.next/`, `tsconfig.tsbuildinfo`, `.mimosa/`, `.kiro/` etc. exist locally; gitignore covers them, but the `.dist/` directory and `dev-server.mjs` reference (gitignored) hint at the abandoned static-site v1 build tool.

## Fragile Areas

- `components/chat-panel.tsx` (428 lines) — the most complex client component: name gate, localStorage schema, usage counters, streaming-less fetch flow. Schema changes here are backward-compatibility-sensitive for returning visitors.
- `lib/providers.ts` `callProvider()` — response-shape fallback chain (`choices.0.message.content` → `choices.0.text` → reply/response/answer/message → `responseField`) is provider-dependent; a new provider shape can silently produce `upstream_error`.
- `app/(site)/page.tsx` (488 lines) — every home section is inline in one file; edits to one section risk adjacent sections.

## No TODO/FIXME Debt

Grep for `TODO|FIXME|HACK|XXX` across `app/`, `components/`, `lib/` returns nothing — there is no annotated debt.

---
last_mapped_commit: c6d59afa6a73db72a398ade0755ad30bf0b68c86
last_mapped_at: 2026-10-31
---
# External Integrations

**Analysis Date:** 2026-10-31

## Summary

The only outbound integration is a server-side proxy call to one OpenAI-compatible AI provider. There is no database, no analytics, no third-party client-side SDK. The site is deliberately self-contained (CSP `connect-src 'self'`).

## AI Provider Proxy (primary integration)

- **Consumer:** `app/api/chat/route.ts` (public chat) and `app/api/providers/route.ts` (admin live test)
- **Engine:** `lib/providers.ts` — `callProvider()` performs the single outbound `fetch`
- **Configuration:** `AI_PROVIDERS_JSON` env var holds a registry: `{ activeId, providers[] }`; default endpoint `/chat/completions`, OpenAI-compatible response shape `choices.0.message.content` with fallbacks (`choices.0.text`, `reply`, `response`, `answer`, `message`), or a custom dotted `responseField`
- **Defaults injected by `providerDefaults()`:** maxOutput 100–196608 (default 900), contextWindow 2000–2000000 (default 32000), 60s AbortController timeout
- **SSRF posture:** `validateProviderUrl()` enforces https-only, rejects localhost/.local/.internal, cloud metadata endpoints (169.254.169.254, metadata.google.internal), and all private/reserved IPv4+IPv6 ranges (`isPrivateOrReservedIP`); `hostIsAllowed()` additionally enforces the `AI_ALLOWED_HOSTS` whitelist when set
- **Key handling:** API key never sent to browser; error details are key-redacted in both routes (`redact()` in chat route, `replace(provider.apiKey, "***")` in providers route)
- **Special case:** OpenRouter hosts get `HTTP-Referer`/`X-Title` headers from `PUBLIC_SITE_URL`

## Admin Authentication (internal service, env-backed)

- Credentials from `ADMIN_USERNAME`/`ADMIN_PASSWORD` only — compared as SHA-256 digests with `crypto.timingSafeEqual` (`lib/admin-auth.ts`)
- Sessions: HMAC-SHA256-signed token in an `HttpOnly; Secure; SameSite=Lax` cookie (`admin_session`), 1-hour TTL, no server-side session store
- Captcha: stateless AES-256-CTR-encrypted math challenge with HMAC signature (`lib/captcha.ts`), 5-minute TTL

## Outbound Data Points (read-only, non-API)

External URLs exist only as links/content rendered to the visitor:

- Social/contact links in `lib/content.ts` `PORTFOLIO.socials` (mailto, LinkedIn, GitHub, Google Docs resume)
- GitHub/live-demo links on project cards

## Storage

- **Server:** none. No database, no file writes, no KV. Rate limiting is an in-memory `Map` per instance (`lib/chat-http.ts` `rateLimit()`).
- **Client:** browser localStorage only, in `components/chat-panel.tsx` — chat name, history (last 50 turns) and daily usage counter (30/day limit). Nothing is sent to the server beyond the current message + sanitized history.

## Static Assets

Self-hosted fonts (`app/fonts/*.woff2` via next/font), images in `public/assets` and `public/blog-images` (all `.webp`), `public/hero-mesh.js` (canvas effect), `public/.well-known/security.txt`.

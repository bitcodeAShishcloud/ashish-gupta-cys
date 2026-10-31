---
last_mapped_commit: c6d59afa6a73db72a398ade0755ad30bf0b68c86
last_mapped_at: 2026-10-31
---
# Coding Conventions

**Analysis Date:** 2026-10-31

## TypeScript Style

- **Interfaces over types** for data shapes (`interface ProviderConfig`, `interface BlogPost`); inline object types for small unions
- **Explicit return types on exported functions** in `lib/` (`: boolean`, `: string | null`, `: Promise<ProviderCallResult>`)
- **Defensive parsing everywhere**: `String(x ?? "")`, `Number(x) || default`, `Array.isArray(x)` guards before property access — e.g. `loadProviders()` in `lib/providers.ts`, `readJsonBody()` in `lib/chat-http.ts`
- `strict: false` in `tsconfig.json` — null-safety discipline is by convention, not compiler-enforced
- Prefer pure functions in `lib/` so route handlers stay declarative (stated in `lib/chat-http.ts` header comment)

## Naming

- Files kebab-case; components PascalCase; functions/variables camelCase
- Constants UPPER_SNAKE at module scope (`SESSION_COOKIE`, `RATE_LIMIT`, `MAX_INPUT`, `BLOG_POSTS`)
- Env vars UPPER_SNAKE namespaced by domain (`AI_*`, `ADMIN_*`, `CHAT_*`)

## Error Handling

- **Route handlers**: no throwing — every failure returns `NextResponse.json({ error: "<snake_code>", message: "<human text>" }, { status })` with a stable machine code (`rate_limited`, `provider_not_configured`, `captcha_failed`, `unauthorized`)
- **Try/catch with typed narrow casts**: `const e = err as { name?: string; message?: string }` pattern (`lib/providers.ts` `callProvider`)
- **JSON parse guarded separately** from logic (`AI_PROVIDERS_JSON` parse failure logs and returns empty registry rather than crashing)
- Sensitive values (provider API key) redacted from any user-visible error before responding

## Security Patterns (the house style)

- Timing-safe comparisons via `crypto.timingSafeEqual` wrapped as `timingSafeEqualStr` (`lib/admin-auth.ts`)
- Secrets only in env vars; derived fallback keys hashed from other secrets (`sessionSecret()`)
- Statelessness for serverless: HMAC-signed tokens/captchas instead of server-side sessions or KV
- Allowlist over blocklist for outbound hosts (`AI_ALLOWED_HOSTS`), plus SSRF blocklist as defense-in-depth
- Markdown always rendered through `components/markdown.tsx` (react-markdown, no raw HTML) — never `dangerouslySetInnerHTML` for untrusted content

## React / Next.js Patterns

- Server Components by default; `"use client"` only where needed (chat panel, admin console, blog index search)
- Content passed as props from typed constants; pages compose sections inline
- shadcn/ui components in `components/ui/` used via their aliases; variants via `cva` + `cn()`
- CSS via Tailwind utility classes + HSL CSS-variable theme tokens; `scroll-mt-24` for anchored sections; monospace uppercase `SectionLabel` pattern for section headers
- Date stamps and headers in config files carry rationale comments explaining *why* (e.g. CSP notes in `next.config.mjs`)

## Comment Style

- Block comments at file top explaining the module's role and security model (see `lib/providers.ts`, `app/api/chat/route.ts`)
- Inline comments reserved for non-obvious constraints (rate-limit sweep logic in `lib/chat-http.ts`)

## Formatting

No Prettier/EditorConfig in repo; code follows 2-space indent, double quotes, semicolons (enforced only by consistency, not tooling).

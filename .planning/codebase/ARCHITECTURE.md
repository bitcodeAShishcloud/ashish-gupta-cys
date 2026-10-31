---
last_mapped_commit: c6d59afa6a73db72a398ade0755ad30bf0b68c86
last_mapped_at: 2026-10-31
---
# Architecture

**Analysis Date:** 2026-10-31

## Pattern

Next.js 14 App Router single-app architecture with route groups separating public chrome from the admin console, plus a small serverless-style API layer. No database layer, no state management library — server state is environment config, client state is React hooks + localStorage.

## Layers

1. **Routes / Pages** (`app/`) — Server Components by default; client components only where interactivity is needed (chat, admin panel, blog search)
2. **API handlers** (`app/api/**/route.ts`) — thin, declarative route handlers that delegate to `lib/` helpers; all marked `dynamic = "force-dynamic"`
3. **Domain/service helpers** (`lib/`) — pure-ish modules: provider proxy, auth, captcha, request helpers, static content
4. **UI components** (`components/`) — page-level composites + `components/ui/*` shadcn primitives
5. **Content layer** (`lib/content.ts`) — the entire portfolio dataset (blog posts, projects, skills, experience) as typed constants

## Route Map

Public (route group `(site)` shares `app/(site)/layout.tsx`: skip-link, Navbar, Footer, ChatWidget):

- `/` — portfolio home (`app/(site)/page.tsx`): hero, about, skills, projects, freelance, experience, certifications, blog preview, contact sections
- `/blog`, `/blog/[slug]` — index with client-side search/filters; static per-slug pre-render via `generateStaticParams` + `generateMetadata`
- `/chat` — full-page chat (same panel as the floating widget)
- `/privacy`, `/terms`, custom `not-found.tsx`

Admin (own layout `app/admin/layout.tsx`):

- `/admin/login` — captcha + credential login
- `/admin` — client component console: provider status, live provider test, `AI_PROVIDERS_JSON` generator

API (`app/api/`):

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Proxies to active AI provider; rate-limited, input/history sanitized, context-window trimming |
| `/api/providers` | GET/POST | Admin-only: list providers (keys masked) / live ping test |
| `/api/admin/captcha` | GET | Issues signed math captcha |
| `/api/admin/login` | POST | Captcha verify + timing-safe credential check + sets session cookie |
| `/api/admin/verify` | GET | Session validity check |
| `/api/admin/logout` | POST | Clears session cookie |

## Data Flow (chat request)

1. `POST /api/chat` → `rateLimit("chat:" + clientIp(req), CHAT_RATE_LIMIT)` (`lib/chat-http.ts`)
2. Body parsed by `readJsonBody`; message capped at 1000 chars; history capped to 24 turns × 2000 chars, roles forced to user/assistant
3. Active provider resolved from `AI_PROVIDERS_JSON` (`getActiveProvider`); base URL validated (`validateProviderUrl`)
4. `trimToContext()` budget-trims history to the provider context window
5. `callProvider()` enforces the `AI_ALLOWED_HOSTS` whitelist, then fetches the provider
6. Errors are key-redacted; reply returned as JSON `{ reply, model, provider }`

## Key Abstractions

- `ProviderConfig` / `callProvider` (`lib/providers.ts`) — the only outbound network abstraction
- `isAdminRequest(req)` (`lib/admin-auth.ts`) — single gate used by all admin API routes
- `rateLimit(key, limit)` (`lib/chat-http.ts`) — shared in-memory sliding 1-minute window for every route
- `PORTFOLIO` / `BLOG_POSTS` / `BLOG_CATEGORIES` (`lib/content.ts`) — single source of content truth for pages and the blog

## Entry Points

- `app/layout.tsx` — root layout: fonts, metadata/SEO, Person JSON-LD, `globals.css`
- `next.config.mjs` — security headers (CSP `default-src 'self'`, HSTS, frame-deny) applied to every route
- `app/sitemap.ts`, `app/robots.ts` — SEO endpoints

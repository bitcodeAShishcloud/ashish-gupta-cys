---
last_mapped_commit: c6d59afa6a73db72a398ade0755ad30bf0b68c86
last_mapped_at: 2026-10-31
---
# Technology Stack

**Analysis Date:** 2026-10-31

## Summary

Personal cybersecurity portfolio (v2) built as a single Next.js 14 App Router application. Server-rendered React pages, a small serverless-style API surface, and zero database — all state lives in environment variables (server) or localStorage (browser).

## Languages & Runtimes

- **TypeScript** (strict: false, ES2020 target) — all application code (`app/`, `components/`, `lib/`)
- **Node.js** runtime via Next.js server (API routes use `node:crypto`, `node:net`)
- **Python** — one standalone tooling script `tools/make-og-image.py` (not part of the app build)
- **CSS** — Tailwind CSS v3 with `app/globals.css` as the single stylesheet entry

## Framework & Core Dependencies

From `package.json` (name: `ashish-gupta-cyber-portfolio`, version 2.0.0):

| Package | Version | Role |
|---|---|---|
| next | 14.2.5 | App Router framework, routing, SSR/SSG, API routes, security headers |
| react / react-dom | 18.3.1 | UI runtime |
| tailwindcss | ^3.4.6 | Styling (config: `tailwind.config.ts`, dark mode: class) |
| @radix-ui/react-{avatar,dialog,label,separator,slot,tabs} | ^1.x | Headless primitives behind shadcn/ui |
| class-variance-authority | ^0.7.0 | Variant styling for `components/ui/*` |
| clsx + tailwind-merge | ^2.x | Class composition via `lib/utils.ts` `cn()` |
| lucide-react | ^0.424.0 | Icons |
| react-markdown + remark-gfm | ^9.1.0 / ^4.0.1 | XSS-safe markdown rendering (chat replies, blog posts) |
| tailwindcss-animate | ^1.0.7 | Animation utilities |

Dev tooling: `typescript ^5.5.4`, `@types/*`, `postcss` + `autoprefixer`. ESLint is configured only via `npm run lint` (next lint); no ESLint config file in repo root.

## Build & Scripts

- `npm run dev` — `next dev -p 3000`
- `npm run build` — `next build`
- `npm start` — `next start -p 3000`
- `npm run lint` — `next lint`
- No test runner is installed (no jest/vitest/playwright in dependencies)

## Configuration Files

- `next.config.mjs` — strict mode, `poweredByHeader: false`, and the security-header block (CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy) applied to `/:path*`
- `tailwind.config.ts` — new-york shadcn style, CSS-variable color tokens, self-hosted font families (Inter, JetBrains Mono, Space Grotesk via `app/fonts/*.woff2`)
- `components.json` — shadcn/ui schema (new-york, slate base color, aliases `@/components`, `@/lib`)
- `tsconfig.json` — bundler module resolution, path alias `@/* → ./*`
- `postcss.config.mjs` — tailwindcss + autoprefixer
- `vercel.json` — deploy region `iad1`

## Environment Variables

Read server-side only (`.env.local`, gitignored):

- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — admin credentials (`lib/admin-auth.ts`)
- `ADMIN_SESSION_SECRET` — optional HMAC key; derived from password hash when absent
- `AI_PROVIDERS_JSON` — active AI provider registry (baseUrl, apiKey, model, endpoint, authHeader, authPrefix, responseField, contextWindow, maxOutput) (`lib/providers.ts`)
- `AI_ALLOWED_HOSTS` — outbound host whitelist for the chat proxy
- `CHAT_RATE_LIMIT` — chat requests/min/IP (default 10)
- `PUBLIC_SITE_URL` — used for OpenRouter HTTP-Referer header

## Deployment

Vercel (auto-detected Next.js). No database, no blob storage; serverless-friendly (in-memory rate-limit buckets are per-instance).

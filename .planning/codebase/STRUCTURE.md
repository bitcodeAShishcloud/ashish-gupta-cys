---
last_mapped_commit: c6d59afa6a73db72a398ade0755ad30bf0b68c86
last_mapped_at: 2026-10-31
---
# Project Structure

**Analysis Date:** 2026-10-31

## Directory Layout

```text
app/
  layout.tsx                 # Root: fonts, metadata, JSON-LD, globals.css
  globals.css                # Tailwind entry + CSS-variable theme tokens
  not-found.tsx              # Root 404
  robots.ts / sitemap.ts     # SEO endpoints
  fonts/                     # Self-hosted .woff2 (Inter, JetBrains Mono, Space Grotesk)
  (site)/                    # PUBLIC route group (navbar + footer + chat widget chrome)
    layout.tsx
    page.tsx                 # Portfolio home (488 lines, all sections inline)
    blog/page.tsx            # Blog index (client-side search/filter)
    blog/[slug]/page.tsx     # Static per-slug markdown post
    chat/page.tsx            # Full-page chat
    privacy/page.tsx, terms/page.tsx
    not-found.tsx
  admin/
    layout.tsx               # Standalone console layout (outside public chrome)
    login/page.tsx           # Login form
    page.tsx                 # Provider console (client component)
  api/
    chat/route.ts            # AI proxy (public)
    providers/route.ts       # Provider list + live test (admin)
    admin/{captcha,login,logout,verify}/route.ts
components/
  ui/                        # shadcn/ui primitives (avatar, badge, button, card,
                             #   dialog, input, label, separator, tabs, textarea)
  navbar.tsx, footer.tsx     # Site chrome
  chat-widget.tsx            # Floating chat entry (97 lines)
  chat-panel.tsx             # Chat logic: localStorage, name gate, usage limit (428 lines)
  markdown.tsx               # react-markdown wrapper
  projects-section.tsx       # Projects grid
  hero-card.tsx, browser-frame.tsx, count-up.tsx, reveal.tsx  # Visual helpers
lib/
  content.ts                 # ALL portfolio/blog content (996 lines, typed constants)
  providers.ts               # AI provider registry + SSRF-safe outbound call
  admin-auth.ts              # Credentials, HMAC session, cookie helpers
  captcha.ts                 # Stateless signed math captcha
  chat-http.ts               # Body parsing, client IP, in-memory rate limiter
  utils.ts                   # cn() (clsx + tailwind-merge)
public/
  assets/                    # profile-photo, og-image, cert badges (.webp)
  blog-images/               # Post cover images (.webp)
  hero-mesh.js               # Canvas hero animation
  .well-known/security.txt
tools/
  make-og-image.py           # Standalone OG image generator (Python, not in build)
next.config.mjs              # Security headers (CSP etc.), strict mode
tailwind.config.ts, tsconfig.json, components.json, vercel.json
```

## Key Locations

- **Content edits** — almost everything user-visible lives in `lib/content.ts` (`BLOG_POSTS`, `PORTFOLIO`, `BLOG_CATEGORIES`)
- **Security-sensitive code** — `lib/providers.ts`, `lib/admin-auth.ts`, `lib/captcha.ts`, `next.config.mjs` (headers)
- **Chat UX** — `components/chat-panel.tsx` (shared by `/chat` page and `components/chat-widget.tsx`)
- **Theme** — HSL CSS variables in `app/globals.css`, mapped through `tailwind.config.ts`

## Naming Conventions

- Files: kebab-case (`chat-panel.tsx`, `admin-auth.ts`); shadcn primitives single-word (`button.tsx`)
- React components: PascalCase exports; hooks in component files, no `hooks/` directory yet (shadcn alias reserved)
- Routes: parenthesized route groups, bracket dynamic segments, `route.ts` for handlers
- Imports: `@/*` alias maps to repo root

## Ignored / Non-App Directories

`.kiro/`, `.mimosa/`, `.cursor/`, `.vscode/`, `.dist/`, `.zcode/`, `.next/` are gitignored tooling/artifact directories — never map or edit these.

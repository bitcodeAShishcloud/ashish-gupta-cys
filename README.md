# 🛡️ Ashish Gupta — Cyber Security Portfolio (v2 — React + Next.js)

<div align="center">

![Stack](https://img.shields.io/badge/Next.js%2014-React%2018-000000?style=for-the-badge&logo=next.js)
![UI](https://img.shields.io/badge/UI-shadcn%2Fui%20%2B%20Tailwind-00D4FF?style=for-the-badge&logo=tailwindcss)
![Status](https://img.shields.io/badge/Status-Available%20for%20Opportunities-brightgreen?style=for-the-badge)

**🎓 B.Tech CSE (Cyber Security) | NIET Greater Noida | 3rd Year**

[📧 Contact](mailto:agupta38160@gmail.com) • [💼 LinkedIn](https://www.linkedin.com/in/ashish-gupta-037973259/) • [🐙 GitHub](https://github.com/bitcodeAShishcloud) • [📄 Resume](https://docs.google.com/document/d/e/2PACX-1vRSxngFM1nfzOhgb7wWJaqsN7FS6lgv8Fdh0UUuuYAfLS4siboHQsTRL-bdKhMAl7VlqvKa9_uXfxyY/pub)

</div>

---

The complete rewrite of the old static portfolio as a **React + Node.js (Next.js App Router)** application with a **shadcn/ui** component system and a secure server-side AI chat.

## ✨ What's inside

| Page | Route | Notes |
|---|---|---|
| Portfolio home | `/` | Hero, about, education, skills, projects, internships, certifications, blog preview, contact |
| Blog | `/blog`, `/blog/[slug]` | Search + category filters, markdown articles (react-markdown, XSS-safe) |
| AI Chat | `/chat` | Name gate, suggestion chips, markdown replies, model badge, daily limit (30), **all data stays in the visitor's browser (localStorage)** |
| Admin login | `/admin/login` | Server-side credential check + signed math captcha |
| Admin panel | `/admin` | Provider status, **live provider test**, `AI_PROVIDERS_JSON` generator |
| API | `/api/*` | `chat`, `admin/captcha`, `admin/login`, `admin/verify`, `admin/logout`, `providers` |

## 🔐 Security model

- **Server-side admin auth** — credentials live only in env vars (`ADMIN_USERNAME` / `ADMIN_PASSWORD`), compared via SHA-256 + timing-safe equality. Sessions are HMAC-signed `HttpOnly` cookies (1 h). Login is protected by a signed math captcha and per-IP rate limiting.
- **SSRF-hardened chat proxy** — the only outbound request is to the active AI provider, pinned by the `AI_PROVIDERS_JSON` env var: https-only, loopback/private/reserved addresses rejected, and the host must be on the `AI_ALLOWED_HOSTS` whitelist.
- **API keys never reach the browser** — the chat endpoint proxies the provider server-side and redacts the key from error details.
- **XSS-safe markdown** — AI replies and blog posts render through react-markdown (no raw HTML).
- **No database, no tracking** — chat history, name and usage counters live in each visitor's `localStorage` only.

## 🚀 Getting started

```bash
npm install

# create .env.local (see below)
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

### Environment variables (`.env.local`)

```ini
# Admin login
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-to-a-long-random-string

# AI provider (OpenAI-compatible by default; advanced fields optional)
AI_PROVIDERS_JSON={"activeId":"p1","providers":[{"id":"p1","name":"XKiro","baseUrl":"https://api.xkiro.com/v1","apiKey":"sk-...","model":"qwen/qwen3.8-max:free","contextWindow":1000000,"maxOutput":65536}]}

# SSRF whitelist — the ONLY hosts the server may call
AI_ALLOWED_HOSTS=api.xkiro.com
```

`AI_PROVIDERS_JSON` optional per-provider fields: `endpoint` (default `/chat/completions`), `authHeader` (default `Authorization`), `authPrefix` (default `Bearer `), `responseField` (dotted path for non-OpenAI shapes), `contextWindow`, `maxOutput`. Generate a ready-to-paste value from **Admin → Generate Env**.

### Deploy (Vercel)

1. Import the repo — Vercel auto-detects Next.js.
2. Add the env vars above in **Settings → Environment Variables**.
3. Deploy. No database or blob storage needed.

## 🧱 Tech stack

Next.js 14 (App Router, TypeScript) · React 18 · Tailwind CSS + shadcn/ui (new-york) · Radix primitives · lucide-react · react-markdown + remark-gfm

---

© 2026 Ashish Gupta · Built with React + Next.js

# Phase 7 Context: Rich Markdown Rendering & Export

**Phase:** 7 — Rich Markdown Rendering & Export (chat + blog)
**Date:** 2026-11-10
**Input:** User direction (Hinglish, summarized): "text style and font ko aur customize karo taki jaisa bhi response aaye sab kaam kare; jab code aaye to copy-paste wala style me do (copy kar paye); mail format aur other formats bhi dena; kya kya jod sakte ho wo bhi batana; kuch clear karna ho to puch lena, apne se koi decision mat lena."

Follow-up: **"sab jodo"** (include all proposed items) + **"jahan style aaye, ek baar puch lena kaunsa jodna hai"** → 7 style questions asked and answered in one round.

## What This Phase Must Deliver

All 24 proposed items, in four groups. Full scope, no descoping.

### A. Typography / text & font customization
1. Visitor font-size control (A− / A+)
2. Font-family switch (Inter / Space Grotesk / JetBrains Mono / System)
3. Line-height / paragraph spacing / reading-width control
4. Robust rendering of every markdown content type (nested lists, tables, task lists, strikethrough, hr, footnotes, autolinks, headings)
5. Callouts / admonitions (Note / Warning / Tip / Danger)
6. Math / LaTeX (KaTeX) + Mermaid diagrams
7. Better heading hierarchy + section dividers
8. `SYSTEM_PROMPT` update so replies arrive in a consistent, well-structured format

### B. Code blocks (copy-paste)
9. Copy button on every block + "Copied!" feedback
10. Language label + filename/header bar
11. Line numbers
12. Syntax highlighting
13. Long-line wrap toggle
14. Download code as file
15. Expand / collapse for long blocks

### C. Formats / export
16. Copy as → Markdown / Plain text / HTML / JSON / Email-ready
17. Download as → `.md` / `.txt` / `.html` / `.pdf` / `.docx`
18. "Email this" → `mailto:` with subject + body
19. Print / Save as PDF (browser print)
20. Share (Web Share API, clipboard fallback)
21. Per-message AND whole-conversation export

### D. Message actions
22. Always-visible action bar under each assistant message (Copy / Share / Download / Regenerate)
23. Text-select copy
24. Per-message "Copy as…" dropdown

Applies to **both chat (`/chat` + widget) and blog articles** — the shared `components/markdown.tsx` renderer serves both. Message-level actions and header controls are chat-only; blog gets the rendering upgrades.

## Locked Decisions (user answered 7 style questions — DO NOT re-ask)

| # | Area | Decision | Rationale from user |
|---|------|----------|---------------------|
| 1 | Syntax highlighting theme | **Brand monochrome** — black bg, white/grey tokens, green accent only | Matches PROJECT.md black/white/green brand; no new colours |
| 2 | Callout look | **Brand monochrome** — left border + grey tint, no colour, icon + label | Extends existing blockquote; stays monochrome |
| 3 | Font controls placement | **Chat header toolbar** — compact A−/A+ + font dropdown, page and widget both | Always discoverable, no extra click |
| 4 | Code block chrome | **Header bar always visible** — language + line numbers + Copy + Download + Wrap | Most discoverable; mobile-safe (no hover) |
| 5 | Message action bar | **Always visible** under every assistant message | Mobile-friendly, no hover dependency |
| 6 | "Mail format" meaning | **All three** — Copy-as-email + `mailto:` share button + AI email-draft prompt template | User chose "Teeno" |
| 7 | New npm packages | **Yes, add all** — `shiki`, `katex`, `remark-math`, `rehype-katex`, `mermaid`, `jspdf`, `html2canvas`, `docx` | User chose "Haan, sab add karo" |

**Explicit user constraint:** "apne se koi decision mat lena" — any new ambiguity must be asked, not assumed. The 7 answers above are the only style decisions; everything else is implementation detail for the planner/researcher.

## Design Constraints (carried forward)

- **XSS safety is non-negotiable:** `react-markdown` stays with raw HTML disabled. No `dangerouslySetInnerHTML` with untrusted content. Mermaid/KaTeX output must be sanitized or rendered via their own DOM APIs.
- **CSP**: `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: https://cdn.xkiro.com`, `font-src 'self'`. All new libs must be bundled/self-hosted (no CDN links). KaTeX fonts must be served from `_next/static/media`, not a CDN.
- **No server-side state** (privacy model). All exports are client-side.
- **Streaming must not break**: chat replies stream token-by-token via SSE; the Markdown renderer re-parses partially-typed markdown on every delta. Code blocks, callouts and math must degrade gracefully mid-stream (show raw text, no crash).
- **Shared renderer**: `components/markdown.tsx` is used by chat AND blog. Chat-only features (message actions, header controls) must live in `chat-panel.tsx`, not in the renderer.
- **Mobile**: 44px touch targets, no hover-only affordances, `overflow-x-clip` already on blog containers.
- **Brand**: monochrome + `#00E5A8` green accent only. No blue/amber/red semantic colours anywhere.

## Files In Scope

- `components/markdown.tsx` — rewrite with custom component renderers
- `components/code-block.tsx` (new) — header bar, copy, line numbers, wrap, download, expand, monochrome highlight
- `components/message-actions.tsx` (new) — always-visible action bar + copy-as dropdown
- `components/chat-controls.tsx` (new) — header toolbar (font size / family / spacing / width)
- `lib/export-formats.ts` (new) — pure format converters + download/mailto/share/print helpers
- `components/chat-panel.tsx` — integrate controls + actions + regenerate
- `app/globals.css` — `.markdown-body` extensions, callouts, code chrome, katex overrides
- `app/api/chat/route.ts` — SYSTEM_PROMPT formatting guidance
- `app/(site)/blog/[slug]/page.tsx` — inherits renderer upgrades automatically
- `package.json` / `package-lock.json` — 8 new deps

## Out of Scope / Deferred

- Server-side rendering of exports / PDF generation on the server
- Cloud save, share links, or any network upload
- Editing/monaco/CodeMirror inside code blocks
- Custom user-uploaded fonts

## Security Note (flag, not a decision)

`npm audit` reports 1 critical + 2 high + 1 moderate, all **pre-existing in `next@14.2.5`** (and its `postcss` chain), NOT from the new packages. Fix available: `next@14.2.35`. User was not asked to decide this — flagged for a separate decision.

## Canonical Refs

- `.planning/PROJECT.md` — brand system, constraints, core value
- `.planning/REQUIREMENTS.md` — v0.0.0.0.2 requirements + traceability
- `.planning/ROADMAP.md` — Phase 7 entry
- `.planning/milestones/v0.0.0.0.1-phases/01-streaming-chat-de-branded-presentation/01-CONTEXT.md` — SSE contract, model identity removal
- `.planning/codebase/STACK.md`, `ARCHITECTURE.md`, `INTEGRATIONS.md` — stack, layers, CSP posture (maps dated 2026-10-31, pre-streaming; verify against live code)

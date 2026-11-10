# Phase 8 Context: Mail/Draft Replies, Send Action & Prospect Research

**Phase:** 8 — Mail/Draft Replies, Send Action & Prospect Research
**Date:** 2026-11-10
**Input:** Two screenshots + `/gsd:discuss-phase`.

- Screenshot 1: the Phase 7 action bar, with **Email / Print / Draft email** circled.
- Screenshot 2: a reference from another AI app — a Hinglish cold-email draft for a dental clinic
  ("The Dentist Multispeciality Dental Clinic", Dr. Nakul Motla) built from prospect research
  (Instagram @nakulmotla 362 followers, 841 reviews ⭐ 4.9, Practo / myUpchar / Eka Care /
  DocIndia / JustDial listings, no dedicated website). That reply had only **Copy** and
  **Open in Messages** buttons.

Owner gave 9 answers across two rounds. All decisions below are **LOCKED — do not re-ask**.
Standing constraint repeated by the owner: *"apne se koi decision mat lena"* — no unilateral
decisions. Everything not covered here goes back to the owner.

## Domain Boundary

Refine the assistant message action bar into **two context-aware bars**, replace the three
circled buttons with a single **Send** action backed by the Web Share API, and add the ability to
produce **research-backed, personalized outreach drafts** (like the reference). Chat only.
No visitor-visible change to chat content, streaming, or the blog renderer.

---

## Locked Decisions

### Round 1 — 5 answers

| # | Area | Decision |
|---|------|----------|
| 1 | Circled buttons | **Remove Email, Print, Draft email.** The bar becomes `Copy` + `Open in Messages` (renamed to `Send`, see #9) |
| 2 | "Open in Messages" target | **Native share sheet via Web Share API** (`navigator.share`), clipboard fallback when unavailable/cancelled |
| 3 | When the button shows | **Only on mail/draft replies.** Normal messages get a different bar. Model may signal mail type explicitly |
| 4 | Shared payload | **Email-ready text** — `Subject:` + greeting + body + sign-off (`toEmailText()`), not raw markdown |
| 5 | Prospect research | **Yes, in scope** — research-backed personalized drafts (screenshot 2 style) |

### Round 2 — 4 answers (the ambiguities)

| # | Area | Decision |
|---|------|----------|
| 6 | Exact bar split | **Two distinct bars.** Mail/draft reply → `Copy` + `Send`. Normal reply → `Copy`, `Copy as`, `Download`, `Share`, `Regenerate` (with Print/Email/Draft email removed) |
| 7 | Research data source | **Both auto + manual.** Server-side web search when possible, plus user-supplied link/paste as input. Server fetch reuses the existing SSRF gates |
| 8 | Mail-type signal | **Both.** Add a structured SSE signal (`data: {"type":"mail"}`) AND a content-based auto-detect fallback |
| 9 | Button label | **`Send`**, share-sheet title `Share email draft` |

### Derived consequences (locked by the above, not new decisions)

- `Print`, `Email` (mailto), and `Draft email` (composer-prompt) are **deleted** from the codebase —
  not hidden, not kept behind a flag.
- `Share` stays on the **normal** bar (it shares raw markdown via Web Share API). `Send` is the
  **mail** bar's equivalent (it shares email-ready text). They are different payloads, not duplicates.
- `Copy`, `Copy as`, `Download`, `Regenerate` stay on the normal bar unchanged.
- The mail bar has exactly two actions: `Copy` (raw markdown) and `Send`.
- `onDraftEmail` / `draftEmailFrom` in `chat-panel.tsx` become dead code → remove.
- `printHtml`, `mailtoLink`, `toEmailText` usage changes: `toEmailText` is now used by `Send`;
  `printHtml` and `mailtoLink` become unused (verify no other caller before deleting).

---

## Technical Constraints (carried forward)

- **CSP** `connect-src 'self'` — the browser cannot call any search API directly. All research
  fetching MUST go through a same-origin server route (e.g. `/api/research`), reusing
  `validateProviderUrl()` + `AI_ALLOWED_HOSTS` from `lib/providers.ts`.
- **SSE contract** is currently `data: {"delta"}`, `data: {"error"}`, `data: {"done"}`. Adding
  `{"type":"mail"}` must not break existing clients — unknown fields are ignored, and the
  content-based detector is the fallback so older cached history still works.
- **Streaming must not break**: the mail/normal bar decision is only needed once the message is
  complete. During streaming, show no bar (or the normal bar) — never flash between bars.
- **No server-side visitor state** (privacy model). Research results are ephemeral per request;
  nothing stored.
- **XSS**: react-markdown stays raw-HTML-off. Research-derived text is untrusted — it must be
  inserted as text/markdown, never via `dangerouslySetInnerHTML`.
- **Mobile**: 44px touch targets, no hover-only affordances. `navigator.share` is mobile-first;
  desktop falls back to clipboard with a visible "Copied" confirmation.
- **Brand monochrome** + `#00E5A8` green accent only. No new colours.
- **`SYSTEM_PROMPT`** already asks for consistent structured replies (Phase 7). Extend it so the
  model emits a mail-type signal when the reply is an email/draft.

## Files In Scope

- `components/message-actions.tsx` — split into two bars, remove 3 buttons, add `Send`
- `components/chat-panel.tsx` — mail detection + which bar to render, remove `draftEmailFrom`
- `app/api/chat/route.ts` — `SYSTEM_PROMPT` mail-signal instruction; emit `{"type":"mail"}`
- `app/api/research/route.ts` (new) — same-origin prospect research proxy, SSRF-gated
- `lib/export-formats.ts` — `toEmailText()` becomes the Send payload; drop `printHtml` /
  `mailtoLink` if unused
- `lib/content.ts` — optional: outreach/knowledge context if needed for drafts
- `app/globals.css` — `Send` button styling, no new visual language
- `next.config.mjs` — only if a new outbound host must be added to CSP (owner must approve)

## Out of Scope / Deferred Ideas

- Sending email directly from the app (no SMTP, no send-on-behalf) — `Send` only opens the
  share sheet
- Recipient address book, contact picker, CRM
- Scheduled / automated outreach sequences
- Storing research results or drafts server-side
- Any change to the blog action bar (blog has none)

## Open Items — ASK THE OWNER, DO NOT DECIDE

These surfaced while writing context and are **not** covered by the 9 answers:

1. **Research provider / API key** — "server-side web search" needs a provider (Brave / Tavily /
   Serper / provider-native browsing) and a new secret in Vercel env vars. Which one, and who
   supplies the key? (`config.json` has `tavily_search: true` for the GSD harness — that is NOT
   the app's runtime.)
2. **Search cost / rate limit** — per-call cost and a per-IP cap for `/api/research`. Needs a number.
3. **Manual input UX** — where does the user paste a link / prospect info? Composer text, a
   dedicated field, or a mode switch (like the existing Chat/Image/Video switch)?
4. **Auto-detect false positives** — what counts as "mail"? (`Subject:`, `Dear`, `Namaste`,
   sign-off). If a normal reply is misclassified, should the user be able to toggle the bar?
5. **Whether research should be automatic** — should every outbound-looking question trigger a
   search, or only when the user asks? Auto-search on every message could burn quota.

## Canonical Refs

- `.planning/PROJECT.md` — brand system, constraints, core value
- `.planning/REQUIREMENTS.md` — v0.0.0.0.2 / .0.3 requirements + traceability
- `.planning/ROADMAP.md` — Phase 8 entry
- `.planning/phases/07-rich-markdown-and-export/07-CONTEXT.md` — Phase 7 decisions (monochrome,
  always-visible bars, all-packages)
- `.planning/milestones/v0.0.0.0.1-phases/01-streaming-chat-de-branded-presentation/01-CONTEXT.md` — SSE contract
- `.planning/codebase/INTEGRATIONS.md`, `ARCHITECTURE.md` — SSRF posture, route map

# Roadmap: Ashish Gupta Cyber Security Portfolio

## Milestones

- ✅ **v0.0.0.0.1 Human-feel streaming chat** — Phases 1-3 (shipped 2026-11-02 — full details in [milestones/v0.0.0.0.1-ROADMAP.md](milestones/v0.0.0.0.1-ROADMAP.md))
- 🚧 **v0.0.0.0.2 Multi-provider chat + production deploy** — Phases 4-6 (in progress)

## Phases

**v0.0.0.0.2 — current milestone:**

- [x] **Phase 4: Multi-Provider Chat with Automatic Failover** - Two interchangeable providers with config-only switching, one-retry automatic failover, and a multi-provider admin console (completed 2026-11-07)
- [x] **Phase 5: Production Deploy on Vercel + Key Hygiene** - Site live on Vercel with every secret in env vars, image mode verified in production, keys rotated and kept out of the repo
- [x] **Phase 6: Chat Access Simplification** - Chat opens straight to the composer (no name gate) and the daily limit rises to 50 per device — all client-side, same approach as v0.0.0.0.1

<details>
<summary>✅ v0.0.0.0.1 Human-feel streaming chat (Phases 1-3) — SHIPPED 2026-11-02</summary>

**Delivered:** Streaming chat via same-origin SSE with de-branded presentation, a handcrafted-feel polish pass across the site, and a full image-generation mode (aspect/style pickers, async-job gateway, client-direct CDN rendering, same-origin downloads). All 15 requirements verified; UAT 8/8 passed; security review 0 open threats.

| Phase | Name | Outcome |
|-------|------|---------|
| 1 | Streaming Chat + De-branded Presentation | Replies stream token-by-token via same-origin SSE; model/provider identity removed from the public chat |
| 2 | Handcrafted Feel Polish Pass | Copy and chat chrome read as handcrafted, not AI-generated |
| 3 | Image Generation Mode in Chat | Image mode with aspect/style pickers, client-direct CDN rendering, same-origin downloads |

Full phase details: [milestones/v0.0.0.0.1-ROADMAP.md](milestones/v0.0.0.0.1-ROADMAP.md)

</details>

### 🚧 v0.0.0.0.2 Multi-provider chat + production deploy (In Progress)

**Milestone Goal:** Run the chat on two interchangeable AI providers with automatic failover, and ship the site live on Vercel with every secret configured.

### Phase 4: Multi-Provider Chat with Automatic Failover
**Goal**: The chat runs on two interchangeable providers — the owner switches the active one by editing config only, and a single provider failure no longer breaks a visitor's chat.
**Depends on**: Nothing (first phase of milestone; builds on the shipped v0.0.0.0.1 chat architecture)
**Requirements**: PROV-01, PROV-02, PROV-03
**Success Criteria** (what must be TRUE):
  1. Owner adds Top-Tools-AI alongside XKiro in `AI_PROVIDERS_JSON` and switches the active provider by editing `activeId` only — the chat works against either provider with no code changes
  2. When the active provider fails (HTTP error, timeout, malformed reply), a visitor's message still gets a complete streamed reply — `/api/chat` retried once against the next configured provider automatically
  3. Admin console lists every configured provider with its status, and the live provider test can target any configured provider — not just the active one
  4. With multiple providers configured, the visitor experience is unchanged: replies still stream via same-origin SSE, the name gate and 30/day limit still apply, and no provider/model identity appears in the public chat
**Plans**: 2/2 plans complete
Plans:
- [x] 04-01-PLAN.md — Server failover core: ordered candidate list + probe-guarded retry loop in /api/chat (PROV-01, PROV-02) — complete 2026-11-07
- [x] 04-02-PLAN.md — Multi-provider admin console: status badges + per-row live test via optional id (PROV-03) — complete 2026-11-07
**UI hint**: yes

### Phase 5: Production Deploy on Vercel + Key Hygiene
**Goal**: The site is live on Vercel with every secret configured and rotated — visitors use the real deployed site (chat and image mode both working) and no API key is exposed anywhere.
**Depends on**: Phase 4
**Requirements**: DEPL-01, DEPL-02, DEPL-03, SEC-01
**Success Criteria** (what must be TRUE):
  1. The site is live at the Vercel production URL and a visitor can stream a chat reply there — name gate and 30/day limit intact
  2. Image-generation mode works on the deployed site — client-direct CDN rendering and the download proxy both function with `AI_IMAGE_CSP_HOSTS` configured
  3. Every production secret lives only in Vercel env vars — `AI_PROVIDERS_JSON` (both providers), `AI_ALLOWED_HOSTS` (both hosts), `AI_IMAGE_CSP_HOSTS`, `ADMIN_USERNAME`/`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` — and the owner can log into the admin console on the deployed site
  4. No API key appears in the repo, planning docs, or chat transcripts; keys pasted into chat are rotated; `.env.local` stays gitignored
**Plans**: 1/1 plans complete
Plans:
- [x] 05-01-PLAN.md — Deploy readiness + key hygiene: leak audit, credential rotation, live production verification, owner runbook for the env-only multi-provider config (DEPL-01, DEPL-03, SEC-01; DEPL-02 owner steps via 05-OWNER-RUNBOOK.md) — complete 2026-11-07

### Phase 6: Chat Access Simplification
**Goal**: Visitors land straight in the chat — no name prompt — and get 50 chats per day per device, with every byte of visitor data still living only in the browser.
**Depends on**: Nothing (independent of Phases 4-5; touches only the chat client component)
**Requirements**: CHAT-04, CHAT-05
**Success Criteria** (what must be TRUE):
  1. Opening `/chat` or the floating widget goes straight to the composer — no name screen, no friction
  2. The daily limit is 50 per device (client-side localStorage counter) with the existing limit-reached state at 50
  3. Returning visitors who stored a name still see it used gracefully; history, erase-data flow and streaming behavior are unchanged; nothing server-side is added
**Plans**: 1/1 plans complete
Plans:
- [x] 06-PLAN — Chat access simplification: name gate removed, DAILY_LIMIT 30→50, stored names stay graceful (CHAT-04, CHAT-05) — complete 2026-11-07

## Progress

**Execution Order:**
Phases execute in numeric order: 4 → 5 → 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Streaming Chat + De-branded Presentation | v0.0.0.0.1 | 1/1 | Complete | 2026-11-02 |
| 2. Handcrafted Feel Polish Pass | v0.0.0.0.1 | 1/1 | Complete | 2026-11-02 |
| 3. Image Generation Mode in Chat | v0.0.0.0.1 | 1/1 | Complete | 2026-11-02 |
| 4. Multi-Provider Chat with Automatic Failover | v0.0.0.0.2 | 2/2 | Complete    | 2026-11-07 |
| 5. Production Deploy on Vercel + Key Hygiene | v0.0.0.0.2 | 1/1 | Complete    | 2026-11-07 |
| 6. Chat Access Simplification | v0.0.0.0.2 | 1/1 | Complete    | 2026-11-07 |
| 7. Rich Markdown Rendering & Export | v0.0.0.0.3 | 0/1 | In progress | - |
| 8. Mail/Draft Replies, Send Action & Prospect Research | v0.0.0.0.3 | 0/1 | Not started | - |

## v0.0.0.0.3 — Rich Markdown Rendering & Export

### Phase 7: Rich Markdown Rendering & Export
**Goal**: Any reply renders cleanly — code blocks are copy-paste ready, math/diagrams/callouts work, and every message can be copied, shared or downloaded in multiple formats — in chat and blog alike.
**Depends on**: Phase 6 (chat client)
**Requirements**: MD-01 … MD-08
**Decisions**: `.planning/phases/07-rich-markdown-and-export/07-CONTEXT.md` (7 style decisions locked by the owner)
**Success Criteria**:
  1. Code blocks show an always-visible header bar with language, line numbers, wrap, Copy, Download and Expand
  2. Note/Warning/Tip/Danger callouts, LaTeX math and Mermaid diagrams render in both chat and blog
  3. Every assistant message has an always-visible action bar: Copy, Copy-as (5 formats), Download (6 formats), Share, Email, Print, Draft email, Regenerate
  4. Chat header toolbar controls font size, font family, line spacing and reading width, persisted per device
  5. Whole-conversation export works; no server-side state added
  6. Streaming replies never break on partially-written code fences or math

### Phase 8: Mail/Draft Replies, Send Action & Prospect Research
**Goal**: Email/draft replies get a dedicated two-action bar (Copy + Send), normal replies keep their own bar, and the assistant can produce research-backed personalized outreach drafts.
**Depends on**: Phase 7 (action bar, SYSTEM_PROMPT)
**Requirements**: SEND-01 … SEND-06 (see REQUIREMENTS.md)
**Decisions**: `.planning/phases/08-mail-draft-and-send/08-CONTEXT.md` — all 16 owner answers locked across 4 rounds; no open design questions
**Success Criteria**:
  1. Mail/draft replies show only `Copy` + `Send`; normal replies show `Copy / Copy as / Download / Share / Regenerate`
  2. `Send` opens the native share sheet with Email-ready text (Subject + body + sign-off), clipboard fallback on desktop
  3. `Email`, `Print`, `Draft email` are removed from the codebase
  4. Mail type is signalled by a structured SSE event with a content-detection fallback; streaming never flashes between bars
  5. A same-origin, SSRF-gated research route can fetch prospect info; the assistant produces a personalized draft from it
  6. No visitor data stored server-side; no new colours or hover-only affordances

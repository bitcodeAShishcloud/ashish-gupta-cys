# Milestones

## v0.0.0.0.1 Human-feel streaming chat (Shipped: 2026-11-02)

**Delivered:** The portfolio's AI experience rebuilt end-to-end — streaming chat via same-origin SSE, a full image-generation mode with aspect/style pickers and client-direct CDN rendering, a Claude/Dribbble-grade chat UI on a standalone /chat page, and the same design language across the whole site.

**Phases completed:** 1-3 (3 inline plans)

**Key accomplishments:**
- Streaming chat: same-origin SSE with graceful fallback; model/provider identity removed from the public experience
- Image generation: async-job gateway support, 8 style previews with leading-clause prompts (preview = output), gateway-supported aspect sizes, fixed aspect-ratio result cards, eased progress bar
- Security: server-side fetch of provider URLs eliminated entirely (client-direct CDN + env-pinned download proxy) — SSRF sink class removed; key redaction + rate limits intact; security review 0 open threats
- Design: Dribbble-reference composer and pickers, glowing-orb hero on /chat and home, chat design language extended site-wide (pill navbar, slim footer, glow headers)
- Data: everything visitor-related stays in their browser (name, two histories, usage counter) — zero cookies/trackers/server storage

**Stats:**
- ~25 files created/modified across app/, components/, lib/, public/
- ~1,900 lines of TypeScript/TSX + 8 generated preview assets
- 3 phases, 3 plans, 20+ tasks
- 3 days from onboarding to ship (2026-10-31 → 2026-11-02)

**Git range:** `f7b1c79` (codebase map) → `c88b093`/`edba430` (chat UI + hero redesign)

**What's next:** TBD — candidates: generation cancel button, popover Escape handling, per-mode error memory, automated tests for lib/ security functions, CI pipeline.

---

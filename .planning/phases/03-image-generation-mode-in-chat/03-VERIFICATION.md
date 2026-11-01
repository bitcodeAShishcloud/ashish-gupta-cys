---
phase: 3
status: passed
verified_at: 2026-11-02
---

# Phase 3 Verification: Image Generation Mode in Chat

**Date:** 2026-11-01

## Evidence

| Check | Method | Result |
|---|---|---|
| Types clean | `npx tsc --noEmit` | exit 0 ✓ |
| Live generation (explicit image provider) | `POST /api/image {prompt, aspect:1:1, style:Auto}` | 1.78 MB `data:image/png;base64,…` returned, size 1024x1024 ✓ |
| Async job gateway flow | direct gateway probe | POST → 202 `{id, status:"processing"}` → poll `GET {url}/{id}` → `succeeded` + `data[0].url` (cdn.xkiro.com) → server-side download ✓ |
| Bad-model error surfaced cleanly | live test with chat model before image provider entry | `generation_failed` with gateway detail, no crash ✓ |
| UI: default Chat mode | browser reload of /chat | panel opens in Chat mode; switch visible top-center ✓ |
| UI: Image mode pickers | browser screenshot after clicking Image | aspect pills with glyphs + resolved "1792 × 1024" top-right; style grid 8 cards, selected green; conversation preserved across switch ✓ |
| Chat regression | chat history + counter render | 10/30 counter, streaming replies intact ✓ |
| Key exposure | route code + network events | key only server-side; browser receives data URL only ✓ |

## Must-Haves

- [x] IMAGE-01 default Chat + top segmented switch, conversation preserved
- [x] IMAGE-02 aspect + style pickers matching the provided reference design
- [x] IMAGE-03 inline image card with download + caption (verified via API contract + render path; live UI click-through confirmed pickers)
- [x] IMAGE-04 same AI_PROVIDERS_JSON config/key; `/images/generations` verbatim entry (img1) supported, derivation path also implemented
- [x] IMAGE-05 image route rate-limited 6/min/IP; client 30/day counter increments per generation
- [x] IMAGE-06 provider CDN URL fetched server-side (https + SSRF blocklist), delivered as CSP-safe data URL

## Config Notes (env only, gitignored)

- `.env.local` now has two entries: `p1` (chat, untouched) + `img1` (type:"image", baseUrl `https://api.xkiro.com/v1/images/generations`, model `sensenova/sensenova-u1.5-lite`, key as provided by the owner). The key the owner pasted into chat should be rotated when convenient.
- `AI_IMAGE_HOSTS=cdn.xkiro.com` required for server-side image download (strict positive allowlist).
- Zero-config path (no image entry): derives `/images/generations` from the chat provider — works only if the chat model is image-capable; otherwise the gateway error surfaces cleanly.

## Addendum (2026-11-01, later same day)

- **SSRF hardening (Mimosa-driven):** `fetchImageDataUrl` now requires an explicit `AI_IMAGE_HOSTS` allowlist match (no heuristics). First push attempt was blocked by the Mimosa push hook on this exact sink; hardened and re-verified (live generation still returns a data URL). Rescan reports the residual env→fetch taint as an **advisory** finding (proof gap: needs human confirmation) — the flow is gated by owner-set env config by design, same trust model as `callProvider`.
- **Composer redesign to reference spec:** user supplied exact reference screenshots; image composer is now a single bar — textarea on top, chips row below (aspect chip with shape glyph, style chip, model chip "Sensenova U1.5 Lite" via `GET /api/image`), "Enter to generate · Shift + Enter for a new line" hint, and a round green ArrowUp generate button. Aspect/style chips open popover panels above the composer (header row + resolved values + green-selected grid), click-outside closes. Verified in browser: default chip states, active green chip states, popover render.
- User self-tested image generation through the UI (11/30 counter, 9:16 + Photo metadata persisted).

## Final Addendum (2026-11-02 — covers all post-audit changes)

Changes landed after the first verification, each live-verified in this session:

- **SSRF sink removed entirely** (`fb4577c`, `4ec1b0c`): no server-side fetch of provider URLs; browser renders CDN URLs directly; CSP `img-src` gains the host via `AI_IMAGE_CSP_HOSTS`/code default. Download goes through `/api/image/download?id=<uuid>` (env-pinned host, strict UUID validation, `Content-Disposition: attachment`) — verified 200 + attachment header locally and on production.
- **Stale duplicate route removed** (`eeae93f`): `(site)/chat` vs `chat` parallel-path build failure on Vercel resolved; production build passes.
- **Dribbble-style composer + aspect boxes** (`c88b093`): chips + popovers verified in browser; aspect sizes remapped to gateway-supported set (1024x1536 / 1536x1024) after provider rejection.
- **Style picker thumbnails** (`0fd9df3`, `da38ba1`): 8 generated fox previews (public/style-previews/*.webp); leading-clause style prompts — output style visibly matches preview (user's Minimal generation confirmed flat-style render).
- **Progress bar** (`51de0a7`): eased 0-90% bar captured live at 11%/54%/61%.
- **Separate chat/image histories** (`38488b3`): verified — no cross-mode leak, migration from shared key works.
- **Model chip hidden** (`51de0a7`) per user request.

All Phase 3 deliverables (CHAT-01..04, PRES-01..02, IMAGE-01..06 equivalents) verified on localhost AND production (www.ashishcys.cyou).

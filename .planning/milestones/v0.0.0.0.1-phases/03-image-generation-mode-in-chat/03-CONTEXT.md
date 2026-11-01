# Phase 3 Context: Image Generation Mode in Chat

**Phase:** 3 — Image Generation Mode in Chat
**Date:** 2026-11-01
**Input:** User request (Hinglish, summarized): same chat me image generation ka option; default chat khule, upar switch ho; same API key; image endpoint `/images/generations` base_url me hi aata hai; user ko Aspect ratio + Style choose karne mile (reference screenshots diye); overall UI/UX advanced aur better banani hai ("abhi wala bahut bekar lag raha hai").

Reference screenshots: dark pill-based **Aspect ratio** picker (shape glyphs, selected = green border/label, resolved pixel dims shown top-right) and a **Style** card grid (Auto, Photo, Anime, 3D, Oil paint, Watercolor, Pixel art, Minimal; selected card green-bordered, selected name shown top-right).

## Decisions

| Area | Decision | Rationale |
|---|---|---|
| Mode switch | Segmented pill control (Chat / Image) below the header, inside the panel; one shared conversation thread — mode changes only the composer + controls | "default chat khule, uper switch ho"; single thread is better UX than two histories |
| Provider config | `ProviderConfig` gains optional `type?: "chat" \| "image"`. Image route: (1) use provider with `type:"image"` or baseUrl containing `/images/` **verbatim as full URL** (no endpoint appended); (2) else derive from the active chat provider: base ending `/chat/completions` → swap to `/images/generations`, else append `/images/generations` | User's "IMPORTANT: /images/generations in base_url" + "same api key" — zero-config path reuses the XKiro key on the same host |
| Generation request | OpenAI-images shape: `POST {model, prompt, n:1, size}`; parse response `data[0].url` / `data[0].b64_json` plus common fallbacks (`image_url`, `image`, `base64`, top-level string) | Gateway is OpenAI-compatible per existing chat integration; robust parsing covers aggregator shapes |
| Image delivery | Server fetches any provider-returned URL itself (https, SSRF blocklist via `validateProviderUrl`) and returns a **data URL** in JSON; b64 responses wrapped directly | Site CSP is `img-src 'self' data:` — external image hosts would be blocked by the browser; server-side fetch keeps the key and the fetch server-side |
| Aspect ratio → size | 9:16→1024x1792, 3:4→1024x1365, 1:1→1024x1024, 4:3→1365x1024, 16:9→1792x1024 (matches the reference screenshot's "1792 × 1024") | Standard OpenAI-images pixel sizes; provider clamps if unsupported |
| Style → prompt | Non-Auto styles append ", in {style} style" to the prompt server-side | Image APIs take a prompt; style presets are a prompt-side concern |
| Rate limit / usage | `POST /api/image` rate-limited 6/min/IP; each generation increments the same client-side 30/day counter | Consistent with existing chat limits |
| History | Image messages persist prompt + aspect + style but NOT the data URL (localStorage 5MB limit) — on reload a placeholder says the image isn't saved | Data URLs are ~1MB+ each; two would choke storage |
| UI/UX upgrade | Reference-matching pickers: aspect pills with shape glyphs + resolved "W × H" top-right; style card grid with selected name top-right; selected = `success` green border/label; image result as rounded card with download; generating state = shimmer card; image-mode suggestion chips | Directly addresses "abhi wala bahut bekar lag raha hai" while staying inside the existing dark theme |

## Security Notes

- The user pasted a live API key into chat — it is NOT embedded anywhere in source; image mode reads keys from `AI_PROVIDERS_JSON` env only. Advise rotating the shared key.
- Outbound image URL passes `validateProviderUrl` (https-only, no private/loopback/reserved) and the `AI_ALLOWED_HOSTS` whitelist; provider-returned image URLs get https+blocklist validation before server-side fetch.

## Out of Scope

- Image editing/variations, multi-image output (n>1), image history re-render after reload
- Admin console changes (image provider entries appear there automatically via existing publicShape)

# Phase 3 Plan: Image Generation Mode in Chat

**Phase:** 3 | **Date:** 2026-11-01 | **Mode:** autonomous inline execution
**Context:** `.planning/phases/03-image-generation-mode-in-chat/03-CONTEXT.md`

## Tasks

### Task 1 — Provider layer (`lib/providers.ts`)
- `ProviderConfig.type?: string`; helper `isImageProvider(p)` (type==="image" or baseUrl contains `/images/`)
- `resolveImageTarget(): { provider, url } | null` — explicit image provider verbatim; else derive `/images/generations` from active chat provider
- `generateImage(provider, url, prompt, size, opts): Promise<ImageResult>` — same auth header resolution (`providerDefaults`), `validateProviderUrl` + `hostIsAllowed` gates, 120s timeout, robust response parse (b64 → data URL; url → validate https/blocklist → fetch bytes → data URL)

### Task 2 — Image route (`app/api/image/route.ts`, new)
- `POST { prompt, aspect, style }` — rate limit 6/min/IP, prompt sanitized (≤1000 chars), aspect whitelist-mapped to size, style whitelist appended to prompt, `force-dynamic`
- Returns `{ image: "data:image/png;base64,…" }` or `{ error, message, detail }` (key-redacted)

### Task 3 — Chat panel UI (`components/chat-panel.tsx`)
- `mode` state ("chat" default); segmented Chat/Image switch in header (lucide `MessageSquare`/`ImageIcon`, active = white/10 pill)
- Image-mode controls above composer: aspect pills (shape glyphs + labels, selected green) with resolved "W × H" top-right; style grid (8 cards, selected green) with selected name top-right; both match reference screenshots
- Image-mode composer: same textarea, `Sparkles` generate button; image-mode suggestion chips when empty
- New msg kind `image` (image dataUrl, prompt, meta) rendered as figure card with download; generating = shimmer card; history persists meta without dataUrl (placeholder on reload)
- Usage counter + daily limit shared; error box reused

## Verification

- `npx tsc --noEmit`; live `POST /api/image` against the dev server (real provider); `/chat` page 200 + screenshot of both modes; regression: chat streaming still works

## Must-Haves

- [ ] IMAGE-01 default chat + top switch, conversation preserved
- [ ] IMAGE-02 aspect + style pickers matching reference
- [ ] IMAGE-03 inline image card with download, caption
- [ ] IMAGE-04 same key/config; /images/generations derived or verbatim
- [ ] IMAGE-05 rate limit + daily counter
- [ ] IMAGE-06 server-side image fetch, CSP-safe data URL, no key in browser

# Spec: Agnes Image Feature Pack (post-v0.0.0.0.2 work item)

**Decided:** 2026-11-07, via /gsd:discuss-phase-style discussion. User picked: Core pack + img2img.
**Scope:** image mode only. Chat streaming untouched. No new npm deps.

## Locked features

1. **Native ratio + size tiers** — provider config gains `sizeMode: "ratio-tiers"`. When set, the
   server sends `{model, prompt, size: <tier>, ratio, return_base64: true}` instead of legacy exact
   sizes. Legacy providers keep the current behavior byte-for-byte.
2. **Resolution picker** — 1K / 2K / 4K in the image composer (3K omitted from UI; API supports it).
   Dynamic timeout per tier: 1K 120s, 2K 240s, 3K/4K 295s (route maxDuration 300).
3. **Three new aspects** — 2:3, 3:2, 21:9 (8 total). Legacy providers still restricted to the
   original 5 (server validates per mode).
4. **revised_prompt display** — Agnes returns `data[].revised_prompt`; shown as a small mono line
   under the generated image.
5. **Download via b64** — tier-mode requests set `return_base64: true`; data-URL images download
   natively (`<a download>`), no jobId needed.
6. **img2img / reference images** — up to 3 reference images. Client resizes to ≤1024px JPEG
   (canvas) and sends data URIs; server validates (≤3 items, ≤3.5MB each, data URI or public
   https URL — localhost/private rejected) and forwards as the Agnes `image` array. No storage;
   refs are not persisted in history.

## API capabilities deliberately NOT built (no API support per docs)

n (multiple images), seed, negative prompt, watermark options, webhooks.

## Acceptance

- tsc clean; build clean; dev smoke: t2i 1K + 2K (data URL renders + downloads), img2img with a
  reference image, revised_prompt visible; legacy behavior unchanged (style fragments, aspect map).
- No key material in any tracked file; .env.local only.

# UI Review: Phase 03 — Image Generation Mode in Chat

**Audited:** 2026-11-01 | **Method:** inline 6-pillar audit (subagent blocked by provider) — code inspection + live browser captures (chat mode, image mode, style popover, generating state, result cards, slim footer)

## Scores — Overall: 23/24

| Pillar | Score | Notes |
|--------|-------|-------|
| Copywriting | 4/4 | Human voice throughout: "What should I call you?", "Hey {name} — what are you curious about?", "online · replies instantly", "Not sure where to start?", "Let's go", "Clear this chat?" No AI-assistant tells in visitor copy. |
| Visuals | 4/4 | Reference-matching pickers (shape glyphs, thumbnail cards), fixed aspect-ratio cards, gradient caption overlays, generated style thumbnails visibly differ per style. |
| Color | 4/4 | Theme tokens everywhere; success-green = selected/progress; danger/warning reserved for errors/limits; caption gradient (black/85→transparent) keeps white text readable on any image. |
| Typography | 4/4 | Deliberate micro-scale: 10px hints, 11px chips/captions, tabular-nums for percentages; font-display headings, mono accents. |
| Spacing | 4/4 | space-y-5 threads, gap-2.5 avatar rows, p-3 popovers, gap-1.5 grids; hint hidden below lg prevents widget crowding. |
| Experience Design | 3/4 | Strong flows (separate histories, outside-click popovers, focus management, eased progress, graceful fallbacks). Gap: no cancel while generating. |

## Findings Fixed During This Review (applied)

1. **Image load flash** — generated `<img>` showed alt text while the CDN loaded. Fix: `animate-fade-in` (new keyframe) + `loading="lazy"`.
2. **Dead generating box** — fixed box showed only a pulse overlay; added a centered pulsing image glyph + restored "usually a few seconds" microcopy in the top row.
3. **Suggestion affordance** — image-mode suggestions filled the input silently; now they also focus the textarea so the affordance is obvious.

## Remaining Recommendations (not blocking)

1. **Cancel button while generating** — the request is bounded (≤2 min server timeout, ~15-25s typical), but an explicit abort would help on slow networks. Needs an AbortController wired from the client to the route.
2. **Error visibility across modes** — the error box renders in the active mode's thread only; switching modes hides context of a failed generation. Consider per-mode error memory.
3. **a11y: popover focus trap** — style/aspect popovers close on outside click but don't trap focus or respond to Escape (Escape closes the widget itself). Add `onKeyDown` Escape → close popover.

## Pillar Evidence

- Chat copy pass (Phase 2) applied to every visitor-facing string incl. dialog + aria labels
- Style picker verified with 8 real generated previews (fox subject) — visibly distinct styles (flat/minimal render confirmed in a live generation)
- Aspect boxes measured in browser: 191×340 (9:16) and 340×191 (16:9), exact
- Streaming chat regression-checked after every image change

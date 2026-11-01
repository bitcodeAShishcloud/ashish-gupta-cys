# Phase 1 Context: Streaming Chat + De-branded Presentation

**Phase:** 1 of 2 — Streaming Chat + De-branded Presentation
**Date:** 2026-10-31
**Input:** User's explicit design direction (Hinglish, summarized): "stream: true rkho chat wale section me; model ka name display mat krao; chat/UI sab kuch aisa banao ki AI-generated na lage."

## What This Phase Must Deliver

1. **Streaming replies** — the assistant's answer must appear progressively in the chat (page variant AND widget variant). Same-origin SSE from `POST /api/chat`, proxying the upstream OpenAI-compatible stream. CSP allows only `connect-src 'self'`, so no direct provider calls from the browser.
2. **Graceful fallback** — if the upstream can't stream (non-SSE response or stream disabled), buffer the full reply and deliver it as one event; the chat must never break.
3. **No model identity in public UI** — remove the `modelInfo` header line ("model @ provider") from `components/chat-panel.tsx`. The admin console (`/admin`, `/api/providers`) is admin-only and keeps its model visibility.
4. **Preserve all existing behavior** — name gate, 30/day localStorage limit, erase-data dialog, history persistence, rate limiting, error display, key redaction.

## Design Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Transport | SSE via `fetch` + ReadableStream reader on the client | Same-origin, works through CSP, trivial to parse line-by-line; no EventSource needed (POST body required) |
| API contract | Keep `POST /api/chat`; response becomes `text/event-stream` with `data: {"delta": "..."}` chunks and a final `data: {"done": true}`; errors as `data: {"error": "..."}` then close | Client already POSTs JSON; minimal contract change, single endpoint |
| Upstream | Add streaming to the provider layer: request `stream: true` on `/chat/completions`, parse upstream SSE, forward deltas; on non-SSE upstream response, fall back to buffered mode | Provider is OpenAI-compatible per `lib/providers.ts`; fallback keeps CHAT-03 |
| Rendering | Streamed assistant message rendered through the same `Markdown` component as final text | Consistent XSS-safe rendering; markdown evolves as tokens arrive |
| Model info | Server still knows the model; it just stops sending it to the browser. Usage counting increments on stream completion client-side | PRES-01 + keeps client-side limit logic |

## Files In Scope

- `lib/providers.ts` — add streaming provider call (reusing existing URL validation, host whitelist, defaults)
- `app/api/chat/route.ts` — convert to SSE response, keep rate limit + sanitization + redaction
- `components/chat-panel.tsx` — consume the stream, drop `modelInfo`, replace dots-on-waiting with streaming text behavior

## Grey Areas (resolved for autonomous run)

- **Dots before first token:** keep the three-dot indicator only until the first delta arrives, then show streaming text — matches CHAT-02.
- **Where does the stream state live:** a `streaming` boolean + mutating the last assistant message in `messages` state; history saved only on completion, exactly as today.
- **Abort:** if the visitor closes the widget mid-stream, the browser aborts the fetch; server side the upstream request ends naturally (60s timeout already bounded).

## Out of Scope for This Phase

- Copy/visual polish (Phase 2)
- Admin console changes
- Any storage or auth changes

# Phase 1 Plan: Streaming Chat + De-branded Presentation

**Phase:** 1 | **Date:** 2026-10-31 | **Mode:** autonomous inline execution
**Context:** `.planning/phases/01-streaming-chat-de-branded-presentation/01-CONTEXT.md`

## Goal

Assistant replies stream progressively through a same-origin SSE proxy; public chat UI exposes no model/provider identity; all existing chat behaviors preserved with a graceful non-streaming fallback.

## Tasks

### Task 1 — Streaming provider call (`lib/providers.ts`)
- Add `streamProvider(provider, messages, opts)` next to `callProvider`:
  - Reuse `providerDefaults`, `validateProviderUrl`, `hostIsAllowed`, `normalizeBaseUrl` — same SSRF gates as before, validated URL required.
  - POST with `stream: true`, `Accept: text/event-stream`.
  - Return type: `{ ok: true, stream: ReadableStream<Uint8Array> }` on success, or `{ ok: false, status, detail }` on failure (mirrors `ProviderCallResult`).
  - If the upstream responds 200 but NOT as an SSE body (no `data:` lines / JSON body), signal fallback via `{ ok: true, stream, buffered: true }`-style detection — simplest: check `content-type` header; if `application/json`, return `{ ok: false, status: 502, detail, notStreamable: true }` so the route can retry buffered.
- Keep `callProvider` unchanged (admin test route + fallback path still use it).

### Task 2 — SSE route (`app/api/chat/route.ts`)
- Keep: rate limit, body sanitization, provider validation, context trimming, key redaction.
- Attempt `streamProvider`; if it reports not-streamable or fails with a recoverable error, fall back to `callProvider` and emit the whole reply as one delta.
- On success: respond `text/event-stream; charset=utf-8`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`; pipe upstream SSE `choices[0].delta.content` (and `choices[0].message.content` for safety) as `data: {"delta": "…"}\n\n`; end with `data: {"done": true}\n\n`.
- Errors mid-stream: emit `data: {"error": "…"}` (redacted) then `data: {"done": true}` and close.
- Do NOT send model/provider fields in any event (PRES-01).

### Task 3 — Streaming client (`components/chat-panel.tsx`)
- Read the response body with `getReader()`, split on `\n\n`, parse `data:` JSON events.
- Append the user message, create an empty assistant message, mutate its content as deltas arrive; keep the three-dot indicator only while `sending && no tokens yet`.
- On `done`: persist history + usage exactly as before; on `error` event or network failure: current error handling (drop pending user msg, show error box).
- Remove `modelInfo` state and the header line showing it (PRES-01); keep the green status dot with static "Ashish's assistant" text pending Phase 2 copy pass.
- Works for both `page` and `widget` variants (shared component — no variant branching needed).

## Verification Plan

1. `npx tsc --noEmit` type-checks.
2. `npm run build` succeeds.
3. Runtime check with dev server: POST `/api/chat` with curl shows SSE events streaming (`data: {"delta": ...}` lines arriving progressively, terminating with `{"done": true}`), and no `model`/`provider` fields anywhere in the stream.
4. UI check on localhost:3000 `/chat` and widget: reply text builds up progressively; no model name shown; error path still shows the red box (e.g. without provider configured).

## Must-Haves

- [ ] CHAT-01 progressive reply rendering
- [ ] CHAT-02 dots only before first token
- [ ] CHAT-03 buffered fallback works
- [ ] CHAT-04 name gate / limit / erase / history intact
- [ ] PRES-01 no model/provider in public UI or API events
- [ ] PRES-02 admin providers route untouched

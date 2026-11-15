# Implicit State Machines — Full Audit

**Scanned:** 2026-11-12 · HEAD `104678b`+ · `components/chat-panel.tsx` (2,407 lines, 19+ useState, 15+ effects), `lib/db.ts`, `lib/conversations.ts`, `lib/mail.ts`, `lib/providers.ts`, `app/api/*`, `components/message-actions.tsx`

An "implicit state machine" is state + transitions that exist only in the
interactions between variables and effects — never declared anywhere. Three
shipped bugs came from exactly this class: the hooks-order crash (React #310),
the sidebar "No conversations yet" race, and the runaway poll loop. This map
exists so the next change checks the machine it touches before touching it.

---

## SM-1 · Chat mode machine (chat / image / video)

- **State:** `mode` — `chat | image | video`
- **Transitions:** `setMode` from the pill switcher; `switchConversation` (auto-switch to the conversation's mode); `newConversation` (resets to `chat`)
- **Coupled state:** `visible = mode === chat ? chatHistory : mode === video ? videoHistory : imageHistory`
- **Invariant broken before:** switching a conversation did not switch the mode → a chat conversation opened inside Image mode (fixed: `switchConversation` now sets the mode)
- **Risk:** adding a fourth mode touches the switcher, `visible`, the composer ternary, suggestion pills, and sync — all manual

## SM-2 · Conversation lifecycle machine

- **State:** `activeConvId: string | null` + `conversations: Summary[]`
- **Transitions:** `null → id` (ensureConversation on first message; "+ New chat" now also resets to null WITHOUT creating a row); `id → id'` (switchConversation from the sidebar); `id → null` (newConversation)
- **Invariants:** a conversation row must exist in Turso before saveMessage; the sidebar list must re-sync after create/save (was the "No conversations yet" bug); the load-conversation fetch must never wipe a live thread (empty-fetch guard added)
- **Risk:** `newConversation` is now a pure local reset — any code assuming an active row after "+ New chat" will silently skip persistence

## SM-3 · Chat send/stream machine

- **State:** `sending`, `firstToken`, `error`, plus the rollback closure over `history`
- **Transitions:** idle → guard (`!message || sending || generating || limited`) → user bubble appended → SSE reader (delta chunks mutate the last assistant bubble in place; `mail` flag; `sources` parked in `pendingSourcesRef`) → `done` → finalHistory set → usage/DB persist → sending=false
- **Error path:** throw → pop the user bubble → error box → sending=false
- **Invariant:** the user bubble rollback must match what was appended (was the "abort deletes messages" bug class); sources reset at send start (WR-09)
- **Risk:** two entry points (`send`, `sendFrom`, `regenerate`) must keep identical guard ordering

## SM-4 · Image generation machine

- **State:** `generating` + `refImages` (cleared at send start)
- **Transitions:** runGeneration(prompt, settings) → ensureConversation → saveMessage ×2 → localStorage
- **Settings machine:** `aspect` (8) × `imgTier` (1K/2K/4K) × `imgStyle` (8) — the tier ratio only applies when the provider has `sizeMode: "ratio-tiers"`
- **Risk:** settings are read at call time — a lightbox regenerate passes its own settings object; the composer pickers are NOT updated by it (deliberate)

## SM-5 · Video task machine (the most complex one)

- **State:** message-embedded: `jobId`, `progress`, `videoUrl`, `failed` + `meta.createdAt`
- **Transitions:** generateVideo → POST /api/video → pending message appended → poll effect (2.5s interval, guarded by `hasPending`) → status: pending (progress update, skipped when unchanged) / completed (URL set, persisted, usage counted) / failed (marked)
- **Hard caps (added after the runaway-poll bug):** 12 consecutive failed fetches → failed; 30-minute age deadline → failed; persist-before-count (usage counted only when the completion stuck)
- **Risk:** the poll effect re-arms on every `videoHistory` change — any new state update inside the tick re-arms it (by design); adding state updates without a terminal path recreates the infinite loop

## SM-6 · Daily usage machine

- **State:** `USAGE_KEY = { date, count }` + `limited` boolean
- **Transitions:** count increments ONLY on success (chat stream done, image persisted, video URL landed); `limited` flips at ≥ DAILY_LIMIT (50); date key resets daily
- **Bugs already caused:** counted inside a setState updater (multiplied); counted before persist (recounted on reload) — both fixed
- **Invariant:** count and persist must happen together, outside any setState updater

## SM-7 · Sync/offline machine (Turso vs localStorage)

- **State:** `isOffline` + which store is the authority
- **Transitions:** mount → fetchConversations (server) → non-empty = online (sidebar = server, fresh landing) / empty or throw = offline (localStorage history loads, isOffline=true)
- **Fallback paths:** saveMessage/createConversation return null on failure → localStorage
- **Risk:** two authorities — a conversation created online then edited offline (or the reverse) diverges silently; the privacy page documents the server side

## SM-8 · Lightbox machine

- **State:** `lightbox: {image, jobId, meta} | null`, `editPrompt: string | null`
- **Transitions:** image click → open (editPrompt=null) → "Edit prompt" → editing → Regenerate (runGeneration with the ORIGINAL settings) → close; Esc/backdrop → close
- **Risk:** the regenerate closure captures `lightbox.meta` — closing mid-flight is safe (runGeneration owns the thread updates)

## SM-9 · Overlay/picker machines (independent, similar shape)

- `openPanel: "aspect"|"style"|"tier"|"vAspect"|"vSeconds"|null` — composer pickers; outside-click + picker-select close
- `eraseOpen` (confirm dialog), `cmdOpen` (command palette, Ctrl+K), `searchOpen` + `searchIdx` (in-thread search), `recoveryOpen`, `deviceNameOpen`, `lightbox`
- **Invariant:** each closes on outside-click/Escape; only one `openPanel` at a time
- **Risk:** the widget binds Escape on window — an overlay Escape can close both (known, accepted)

## SM-10 · Admin session machine

- **State:** server-signed HMAC cookie (1h) + `checking` client gate
- **Transitions:** mount → /api/admin/verify → authed | login; login POST (captcha + rate limit) → session; logout → cookie cleared
- **Risk:** stale sessions fall back to the login screen silently

## SM-11 · Navbar machines

- **Scrollspy:** `activeSection` — scroll position → section id (array order = document order, fixed after the Freelance reorder)
- **Drawer:** `open` — mobile menu; scroll-locked while open
- **Risk:** adding a home section requires updating BOTH the links array and the scrollspy ids array (the Freelance reorder bug)

## SM-12 · Module singletons (invisible but real machines)

- **Shiki highlighter:** `shikiPromise` (one highlighter) + `htmlCache` Map (≤200 entries, keyed by lang+code) — streaming renders plain, settles after
- **DB client:** `_client` singleton + `_schemaReady` (ensureSchema once per process) + the retry proxy (one reconnect on connect-timeout)
- **Risk:** a second getDb()-style singleton (e.g. for a second provider) must share the retry wrapper

## SM-13 · DB conversation records (server-side machine)

- **State:** Turso rows — conversations (id/user/title/mode/pinned) + messages (role/content/kind/mail/sources)
- **Transitions:** create on ensureConversation → messages appended → PATCH (title/pin) → DELETE
- **Invariants:** every query scoped by `user_id = sha256(device token)`; ids validated; LIKE wildcards escaped (IN-09 — fix blocked by the security scanner, manual); token stored hashed only (WR-07)

## SM-14 · Recovery/device-identity machine (partial, mostly dormant)

- **State:** `device_token_v1`, `recovery_code_v1` (now CSPRNG), `device_name_v1` in localStorage
- **Transitions:** token generated on first visit (never rotated); recovery flow declared but unwired (IN-05)
- **Risk:** clearing browser storage = a new identity; old server rows become permanently unreachable

---

## The three rules that would have prevented every shipped bug

1. **Hooks are a machine** — no conditional return above the last hook (React #310 came from exactly this).
2. **Persistence and counters are not setState updaters** — side effects live in the event handler, never inside a state updater (the usage-multiplier bug).
3. **Every poll needs a terminal path** — failure caps and deadlines, or the machine never halts (the runaway poll).

## Highest-risk next changes (check the machine first)

- Adding a 4th mode → SM-1/SM-5 style sweep across switcher, visible, composer, sync
- Wiring the recovery flow → SM-14 + IN-05's CSPRNG fix must survive
- Any new auto-load effect in ChatPanel → check SM-2's races (the auto-select removal was deliberate — do not re-add it)

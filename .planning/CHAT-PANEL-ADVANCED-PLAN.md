# Chat Panel — "Real AI Client" Upgrade

**Status:** PLAN ONLY. No source file has been modified.
**Date:** 2026-11-06
**Goal:** Make `components/chat-panel.tsx` behave and feel like a serious AI client (Claude / ChatGPT / Mistral) without breaking a single shipped flow, and give it a handcrafted, human typographic voice.
**Governing rule:** shipped behavior is the contract. Every phase ends at a verified, working state. One phase at a time.

---

## 0. What "real AI panel" means here

Real AI clients are not defined by their model picker. They are defined by **control over the conversation**: stop a reply, copy it, regenerate it, edit a prompt, keep many threads, read code comfortably, and never lose your place while scrolling.

| Affordance | Claude / ChatGPT / Mistral | Decision here | Why |
|---|---|---|---|
| Token streaming | yes | **Already shipped**, preserve exactly | `POST /api/chat` same-origin SSE (`delta` / `error` / `done`) |
| Stop / cancel generation | yes | **Adopt** | Biggest missing control |
| Copy message / copy code block | yes | **Adopt** | Missing entirely |
| Regenerate last reply | yes | **Adopt** | Pure client-side; no server change |
| Edit & resend a prompt | yes | **Adopt** | Pure client-side; truncate + resend |
| Multiple conversations + sidebar | yes | **Adopt, isolated phase** | Highest-risk change (localStorage migration) |
| Auto-growing composer | yes | **Adopt** | Current `rows={1}` scrolls internally — a real defect |
| Scroll anchoring / "jump to latest" | yes | **Adopt** | Current effect force-scrolls on every token |
| Code blocks with language + copy | yes | **Adopt (chat only)** | Blog markdown must stay byte-identical in appearance |
| Hover timestamps, message grouping | yes | **Adopt** | Cheap, high perceived quality |
| Model / provider selector | yes | **REJECT — hard rule** | `PRES-01` de-branded presentation; `/api/chat` intentionally never sends model identity to the browser. Adding one would require a server contract change and break a shipped requirement. |
| Attachments / file upload / vision | yes | **Reject** | Text-only provider, no storage, CSP `connect-src 'self'`, privacy model forbids server-side state |
| Server-side history / sync | yes | **Reject** | "All visitor data stays in the browser" is a product promise, not an implementation detail |
| Auto-generated thread titles (LLM) | yes | **Reject** | Would burn a provider call per thread, hit rate limits, and leak prompts. Derive title from the first user message instead. |
| Syntax-highlighting library | sometimes | **Reject** | New dependency + bundle weight; plain mono + copy button is enough and keeps the bundle lean |

---

## 1. Verified current state (evidence, not assumptions)

Read in full: `components/chat-panel.tsx` (993 lines), both API routes, `lib/providers.ts`, `lib/content.ts`, `app/globals.css`, `app/layout.tsx`, `next.config.mjs`, `components/markdown.tsx`, `components/chat-widget.tsx`, all of `.planning/`.

Confirmed by search on 2026-11-06:

- **No `AbortController` / `abort()` / `signal:` anywhere in `components/`** — generation cannot be stopped.
- **No `navigator.clipboard`, no copy action, no `aria-live`, no `role="log"`** in `chat-panel.tsx`.
- **No `scrollHeight`-based textarea autosize.** Both composers use `rows={1}` + `max-h-32` + `resize-none` (lines 875, 903) with no height sync — multi-line input scrolls inside a one-row box.
- `Markdown` is consumed by **two** places: `chat-panel.tsx:696` and `app/(site)/blog/[slug]/page.tsx:142`. Any change to it hits the blog.
- `react-markdown` is **9.1.0**. The v9 `components.code` **`inline` prop was removed** — block-code detection must be done differently (see Phase A.5). This is the single most likely place to introduce a bug.
- `globals.css` `.markdown-body` (lines 205–240) styles both blog and chat. Typography changes must be scoped, not global.
- `chat-widget.tsx:27–34` binds **Escape on `window`** to close the widget. A Stop-on-Escape handler will conflict.

Shipped state from `.planning/`: v0.0.0.0.1 shipped 2026-11-02 (8/8 UAT, 0 open high threats). v0.0.0.0.2 (multi-provider failover, deploy, name-gate removal) is at 0% and **is not part of this plan**.

---

## 2. Non-negotiable invariants ("koi flow na tute")

Each item has a code anchor and the specific way a careless edit breaks it.

| # | Invariant | Anchor | How it breaks |
|---|---|---|---|
| I-1 | SSE contract unchanged: `POST /api/chat {message, history}` → `data: {"delta"}` / `{"error"}` / `{"done"}` | `app/api/chat/route.ts:43–51, 114–192`; `chat-panel.tsx:239–294` | Changing event names or parsing split (`"\n\n"`) silently kills streaming |
| I-2 | **Zero edits to `app/api/**` and `lib/providers.ts`** in this plan | — | Server is security-reviewed; any change re-opens SSRF/key-redaction/rate-limit verification |
| I-3 | No model or provider identity in the public chat DOM or stream | `PRES-01` | A model chip or "powered by" line breaks a shipped requirement |
| I-4 | Name gate, `DAILY_LIMIT = 30`, erase-data flow, and client-side usage counting survive | `chat-panel.tsx:36–40, 152–185, 302–312, 379–396, 406–465` | Migration that drops `chat_user_name` or `chat_usage` logs returning visitors out or resets their quota |
| I-5 | Image mode is untouched semantically: separate history, 5 aspects, 8 styles, progress, CDN rendering, `/api/image/download?id=` | `chat-panel.tsx:327–377, 632–685, 725–759, 890–955` | A unified message array would leak chat messages into image mode (regression already fixed once, commit `38488b3`) |
| I-6 | `variant: "page" \| "widget"` prop contract unchanged; widget is 400×560 | `chat-widget.tsx:39–45`; `chat-panel.tsx:122–126` | A desktop sidebar that isn't conditionally hidden makes the widget unusable |
| I-7 | All visitor state in `localStorage` only; no DB, no cookies, no server state | `privacy/page.tsx`, `terms/page.tsx` | Legal copy would become false |
| I-8 | Blog markdown rendering stays visually identical | `app/(site)/blog/[slug]/page.tsx:142`, `globals.css:205–240` | Editing `.markdown-body` globally restyles every blog post |
| I-9 | Backward-compatible storage: returning visitors keep name, both histories, and usage | `CONCERNS.md` "Fragile Areas" | A v2 schema that ignores v1 keys loses real user data |
| I-10 | No new npm dependencies, no new font files, no new network origins | `package.json`, `next.config.mjs` | CSP `connect-src 'self'`, `font-src 'self'`, `img-src 'self' data: <CDN>` — external assets are blocked |
| I-11 | Admin routes, legal pages, sitemap, security headers untouched | — | Out of scope |

---

## 3. Hard technical boundaries

- **CSP** (`next.config.mjs`): `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: <AI_IMAGE_CSP_HOSTS>`, `font-src 'self'`, `connect-src 'self'`. Inline styles for textarea autosize are allowed; clipboard API is fine (not a network call); **no external font/script/CDN**.
- **Self-hosted fonts, only four files**: Inter 400/600, Space Grotesk 700, JetBrains Mono 500 (`app/fonts/`, ~60KB total, loaded via `next/font/local` in `app/layout.tsx`). Humanizer typography must be achieved with CSS only — adding a weight means shipping a new `.woff2`, which is out of scope.
- **Available UI primitives**: Radix `avatar, dialog, label, separator, slot, tabs` only. **No tooltip, no dropdown-menu, no scroll-area.** Message actions = plain `<button>` with `aria-label` + `title`.
- `navigator.clipboard` needs a secure context (localhost + Vercel HTTPS are fine); provide a silent fallback so a failed copy never throws into the error box.
- **Build discipline** (`.planning/STATE.md`): never run `npm run build` while `next dev` is live against the same `.next` — it corrupted the build once. Order: `npx tsc --noEmit` → stop dev → `npm run build` → restart.
- `strict: false` in `tsconfig.json`: the compiler will not catch null/undefined mistakes. Defensive guards are mandatory, especially in migration code.

---

## 4. Gap analysis → prioritized feature list

**P0 — defects / missing basics (Phase A)**
1. Stop generation (`AbortController`).
2. Auto-growing composer (both modes).
3. Scroll anchoring + "Jump to latest".
4. Copy message; copy code block with language label.
5. Regenerate last reply; edit & resend a user prompt.
6. Accessibility: `role="log"`, `aria-live` status, focus-visible, 44px targets, reduced-motion.
7. Optional `ts` timestamps + hover-reveal meta + role grouping.

**P1 — real-client structure (Phase B)**
8. Multiple conversations with new / switch / rename / delete.
9. Left rail on the page variant; compact equivalent in the widget.
10. v1 → v2 storage migration with **no deletion of v1 keys** (rollback-safe).
11. Erase-data extended to purge v2 **and** v1 keys (privacy promise).

**P2 — humanizer (Phase C)**
12. Scoped `.chat-prose` typography system (no global `.markdown-body` edits).
13. Quiet, precise visual language: flat surfaces, one signal-green accent, no glow in chat chrome.
14. Copy pass, motion pass, micro-details.

---

## 5. Target information architecture

**Page variant (`/chat`)** — `app/chat/layout.tsx` header stays; height stays `h-[calc(100vh-56px)]`.

```
┌─────────────────────────────────────────────────────────────┐
│ [favicon] Ashish_Gupta                    (existing header)  │
├──────────────┬──────────────────────────────────────────────┤
│ + New chat   │  Hey {name} — what are you curious about?     │
│              │  ● online            [clear]  [Chat | Image]  │
│ Today        │ ──────────────────────────────────────────── │
│  ▸ Poppit AI │  user bubble                    [copy][edit] │
│  ▸ QLoRA …   │  ◉ assistant reply (markdown, .chat-prose)    │
│ Yesterday    │                       [copy][regenerate]      │
│  ▸ Certs …   │  code block ┌ rust ................ [copy] ┐   │
│              │             └──────────────────────────────┘   │
│              │ ──────────────────────────────────────────── │
│              │  [Jump to latest ↓]   (only when scrolled up)  │
│              │  ┌ composer (auto-grows) ─────────── [Stop] ┐  │
│              │  └──────────────────────────────────────────┘  │
│              │  12/30 today · stays on your device            │
└──────────────┴──────────────────────────────────────────────┘
```

Rail is **collapsible**, `w-60`, hidden below `lg`. In the **widget** (400px), the rail is replaced by a `+ New chat` icon button in the existing top row plus a compact "Recent" popover reusing the already-shipped popover pattern (`chat-panel.tsx:777–858`). Nothing about `ChatWidget` sizing changes.

**State model:** keep the existing `mode: "chat" | "image"` switch. A conversation holds **both** arrays; `visible` becomes `conversations[activeId][mode]` instead of `mode === "chat" ? chatHistory : imageHistory`. This keeps I-5 intact structurally.

---

## 6. Storage & migration — highest-risk part of the plan

Existing keys (unchanged in v1): `chat_user_name`, `chat_history_v1`, `chat_image_history_v1`, `chat_usage`.

New key, added only in Phase B:

```ts
// localStorage: "chat_conversations_v2"
type StoredMsg = {
  role: "user" | "assistant";
  content: string;
  kind?: "text" | "image";
  image?: string;
  jobId?: string;
  meta?: { prompt: string; aspect: string; style: string };
  ts?: number;        // new, optional → old records still valid
  stopped?: boolean;  // new, optional → aborted reply marker
};
type Conversation = {
  id: string; title: string; createdAt: number; updatedAt: number;
  chat: StoredMsg[]; image: StoredMsg[];
};
type StoreV2 = { version: 2; activeId: string; conversations: Conversation[] };
```

**Migration algorithm (pure function in `lib/chat-storage.ts`, unit-reviewable):**
1. If `chat_conversations_v2` parses and has `version === 2` → use it.
2. Else read `chat_history_v1` + `chat_image_history_v1` with the **same `valid()` predicate** the component uses today (`chat-panel.tsx:159–162`), split any image entries out of the legacy chat array (the existing code already does this at lines 167–170), build exactly **one** conversation, title = first user message truncated to 40 chars, else `"Earlier chat"`.
3. **Do not delete or overwrite v1 keys.** They remain a rollback path.
4. If neither v1 nor v2 exists → one empty conversation.
5. Every read is `try/catch`-wrapped; corrupt JSON falls back to a fresh store rather than crashing the panel (matches current `catch { /* storage unavailable */ }` behavior).
6. Cap each conversation at 50 messages and the list at 30 conversations, oldest-first pruning; keeps `localStorage` under 5MB. `persistable()` (line 114) still strips inline `data:` images.
7. `chat_user_name` and `chat_usage` stay **global and unchanged** — the 30/day limit is per device, not per conversation. `eraseData()` removes all six keys including v2.

**Why this is safe:** v1 stays readable, so if Phase B is reverted the original single-thread code still finds its data. Nothing is destructively rewritten.

---

## 7. Humanizer spec — typography and "many more things"

The project's core value (`.planning/PROJECT.md`) is that the chat feels **handcrafted by Ashish, not generated by a tool**. "Humanizer" here means quiet precision, not decoration.

**Font roles (existing four files only — no new assets):**

| Role | Family / weight | Size / line-height | Notes |
|---|---|---|---|
| Assistant prose | Inter 400 | 15px / 1.72, measure `max-width: 68ch` | `text-wrap: pretty`, `font-feature-settings` already on `body` (`cv02/03/04/11`) |
| User message | Inter 400 | 14.5px / 1.65 | `whitespace-pre-wrap`, slightly tighter tracking |
| Empty-state hero | Space Grotesk 700 | 24–30px, `tracking-tight` | Only display-font moment in the thread |
| Meta / timestamps / counters / code | JetBrains Mono 500 | 11–13px | `tabular-nums`, `letter-spacing: .02em` for caps-labels |
| Section eyebrow | JetBrains Mono | 11px, sentence case | Keep the `//` signature mark; drop the `tracking-[0.25em]` uppercase inside chat only |

**Scope rule:** all of the above live under a new `.chat-prose` / `.chat-meta` scope in `globals.css`. `.markdown-body` is **not touched** → blog is byte-identical (I-8).

**Color & surface:** near-black `#05070A` surfaces, 96% white headings / 62% grey body, white hairlines. `--success` (#00E5A8) reserved for the single live status LED and one active state. **No gradients, no box-shadow glows, no blurred blobs in chat chrome** — this matches the direction already recorded in `.zcode/plans/plan-sess_7c84…md` (`/unslop`), but is deliberately scoped to chat only so public pages don't change.

**Motion:** one easing `cubic-bezier(0.22, 1, 0.36, 1)`; 120–180ms feedback, 300ms entrance; no `animate-pulse` on non-live elements; `prefers-reduced-motion` disables all of it (global rule at `globals.css:87–94` already exists).

**Micro-details:** hover-revealed message actions (always visible on touch / focus), timestamps on hover, consecutive same-role messages grouped with reduced gap, `tabular-nums` on `12/30`, focus ring hugging the hairline, 44px hit targets, branded `::selection`, assistant avatar 20px retained.

**Copy pass (small, optional, reviewable — the current copy was deliberately humanized in Phase 2):**

| Current | Proposed | Note |
|---|---|---|
| `online · replies instantly` | `online · usually a few seconds` | Removes an unverifiable claim |
| `Hey, I'm {name}. How can I help you today?` | `Ask about projects, internships or certs — or anything security.` | Names what it actually answers; keep `{name}` in the small greeting instead |
| `Usually a few seconds` (progress) | `Generating…` | Shorter, no promise |
| `Type your question…` | keep | Already good |

---

## 8. Phased implementation

### Phase A — Real-client fundamentals (no storage changes, lowest risk)
**Files:** `components/chat-panel.tsx`, `components/markdown.tsx` (opt-in prop), `app/globals.css` (new scoped classes only).

1. **AbortController + Stop.** `abortRef = useRef<AbortController | null>(null)`; pass `signal` to the `/api/chat` fetch (line 239); while `sending`, the Send button becomes a square Stop button. In the `catch` (line 313) detect `e.name === "AbortError"` **before** the rollback logic: keep the partial assistant text, mark it `stopped: true`, persist, show no red error, do not increment usage (decision D-2). Clear `abortRef` in `finally`. Note: the browser abort ends the SSE read; the server-side upstream request may finish on its own 120s timer — this is bounded and needs no server change.
2. **Autosize both composers.** On `input` change and after clearing, `el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 128) + "px"`. Apply to both textareas (lines 862, 892).
3. **Scroll anchoring.** Add `onScroll` to `scrollRef`, track `distanceFromBottom < 80` in `pinnedRef`; gate the effect at line 187 on `pinnedRef.current`. Use `behavior: "auto"` for per-token updates and `smooth` only when the user sends a message. Render a "Jump to latest" pill when unpinned.
4. **Message actions.** Plain buttons (no Radix tooltip — not installed): Copy (whole message via `navigator.clipboard` with silent fallback), Regenerate (re-send with history truncated before the last assistant turn), Edit (put user text into composer, truncate history from that turn, resend). Regenerate counts as a new request and increments usage on success, exactly like a normal send.
5. **Code-block copy — the v9 trap.** Add `codeCopy?: boolean` to `Markdown`, **default `false`** so the blog is unchanged (I-8). In react-markdown 9.1.0 `components.code` no longer receives `inline`. Detect block code by `className` containing `language-` **and** override `components.pre` to wrap the block with a header (language label + copy button). Extract the code text with a small recursive React-children text walker — do **not** rely on `children` being a string. Keep GFM tables scrollable (`.markdown-body table` rule stays).
6. **A11y + timestamps.** `role="log"` + `aria-label` on the thread, an `aria-live="polite"` sr-only status ("Replying…" / "Reply stopped"), optional `ts` on new messages rendered in mono on hover, focus-visible rings, reduced-motion already handled globally. **Do not** bind Escape globally — see Risk R-4.
7. **Verify Phase A** (matrix §10, subset: streaming, stop, copy, regenerate, edit, scroll, both variants, blog unchanged), then commit.

### Phase B — Conversations (isolated; storage migration only here)
**Files:** new `lib/chat-storage.ts`, `components/chat-panel.tsx`, `components/chat-widget.tsx` (only if the widget needs the extra icon).

1. Extract pure load/migrate/save/prune functions per §6; no React, no I/O beyond `localStorage`, fully reviewable.
2. Replace `chatHistory` / `imageHistory` state with `store` + `activeId`; `visible = active[mode]`. Keep every other state variable and both `send()` / `generate()` bodies intact apart from where they read/write history.
3. Add rail (page) and `+ New chat` / Recent popover (widget). Rename = inline input; Delete = reuse the existing `Dialog` with a destructive confirm. Title derives from the first user message.
4. Extend `eraseData()` to remove all six keys; update the dialog copy to say "all conversations".
5. **Verify migration explicitly with a seeded v1 localStorage payload** before touching anything else. Rollback = delete only `chat_conversations_v2`; v1 keys are untouched.

### Phase C — Humanizer / polish
**Files:** `app/globals.css` (new `.chat-*` classes), `components/chat-panel.tsx` (copy + classNames), `components/markdown.tsx` (chat scope only).

Apply §7. No structural changes. Re-run the full verification matrix.

---

## 9. Risk register

| ID | Risk | Sev | Mitigation | Detection |
|---|---|---|---|---|
| R-1 | v2 migration loses returning visitors' history | High | Keep v1 keys, same `valid()` predicate, seed-and-test before shipping | Seeded-v1 test in §10 |
| R-2 | Abort path trips the existing rollback (`chat-panel.tsx:313–319`) and deletes messages | High | `AbortError` branch **before** rollback; dedicated test | Stop mid-stream, reload, confirm both messages persist |
| R-3 | react-markdown v9 `inline` removal breaks code rendering in chat **and** blog | High | Opt-in prop default `false`; `pre` override + recursive text extraction | Open a blog post with a fenced code block + a chat reply with one |
| R-4 | Escape-to-stop conflicts with `chat-widget.tsx:29–31` Escape-to-close | Med | **Do not add a global Escape handler.** Bind Escape only on the textarea's `onKeyDown` and `stopPropagation()` there; the visible Stop button works everywhere. Revisit only if explicitly requested. | Open widget, start a reply, press Escape |
| R-5 | Unified message array leaks chat into image mode (regression from `38488b3`) | High | Conversation keeps separate `chat` / `image` arrays; `visible` indexes by mode | Switch modes across two conversations |
| R-6 | Per-token smooth scroll fights reading | Med | `pinnedRef` + `behavior: "auto"` while streaming | Scroll up mid-stream, confirm no snap-back |
| R-7 | Copy button injects raw HTML / breaks CSP | Med | No `dangerouslySetInnerHTML`; clipboard only; all new CSS is compiled Tailwind / scoped classes | Console CSP check |
| R-8 | New glow/gradient removal alters public pages | Med | Scope all visual changes to `.chat-*`; never edit `.grad-*` or `.bg-grid` | Diff review: only chat files changed |
| R-9 | `strict: false` lets a null `activeId` crash the panel | Med | Defensive guards in `lib/chat-storage.ts`; every JSON read in `try/catch`; always return a valid store | Corrupt-JSON test |
| R-10 | `npm run build` while `next dev` corrupts `.next` | Low | STATE.md rule: typecheck → stop dev → build → restart | — |

---

## 10. Verification matrix (run after every phase)

**Commands**
```
npx tsc --noEmit
# stop `next dev` FIRST, then:
npm run build
# restart dev, then browser-check
```

**Every shipped flow, re-checked**

- [ ] First visit → name gate → enter name → greeting; reload keeps name
- [ ] Returning visitor with **v1-only** localStorage → name + both histories + `12/30` counter restored (Phase B)
- [ ] Streaming chat: progressive `delta` events then `done`; no `model` / `provider` anywhere in stream or DOM
- [ ] Provider error / empty response → red box + fallback path; pending user message rolled back
- [ ] **Stop mid-stream** → partial reply kept, no red box, no crash, persists across reload
- [ ] Copy message, copy code block (with language label), regenerate, edit & resend
- [ ] Scroll up during streaming → no snap-back → "Jump to latest" appears and works
- [ ] Composer grows to ~128px then scrolls; Enter sends, Shift+Enter newlines (both modes)
- [ ] Daily limit 30 shared between chat and image; limit banner; counter increments only on success
- [ ] Image mode: 5 aspects, 8 styles, pickers close on outside click, progress bar, CDN image renders, download proxy returns `Content-Disposition: attachment`, malformed `id` → 400
- [ ] Chat/image histories stay separate; switch modes; reload persistence; inline `data:` images stripped
- [ ] Erase data → name, both histories, usage, **and** v2 store gone
- [ ] `/chat` page **and** floating widget (400px), at 360 / 768 / 1024 / 1440px
- [ ] Blog post with headings, table, list, link, fenced code → visually unchanged
- [ ] `/admin/login`, `/admin`, `/api/providers`, `/privacy`, `/terms`, `/blog`, 404 → untouched
- [ ] Console: zero CSP violations, zero external network requests, `prefers-reduced-motion` disables animation
- [ ] `grep` public chat DOM for `model` / `provider` / `XKiro` → zero matches

**Gate:** a phase is complete only when every applicable box above is ticked. No phase starts before the previous one is green.

---

## 11. Explicitly out of scope

Server routes, `lib/providers.ts`, provider failover (v0.0.0.0.2 Phase 4), Vercel deploy / key rotation (Phase 5), name-gate removal + 50/day limit (Phase 6), model picker, attachments/vision, server-side history, syntax-highlighting dependency, new font files, public-site visual changes, admin console changes, automated test/CI setup (tracked separately as `ENG-01`/`ENG-02`).

---

## 12. Open decisions — defaults are set, no blocking questions

| ID | Decision | Default | Flip if you want |
|---|---|---|---|
| D-1 | Keep the name gate? | **Keep.** Removing it is Phase 6, a separate change | Say "remove name gate" and it becomes part of Phase A |
| D-2 | Does a stopped reply count against 30/day? | **No** (matches today's "count on successful completion") | "Count stopped replies too" |
| D-3 | Conversations inside the 400px widget? | **`+ New chat` + compact Recent popover** | "Widget: new chat only" (simpler) |
| D-4 | Strip glow/gradients from chat chrome? | **Yes, chat-scoped only** | "Keep the current glow" |

**Next action on `go`:** implement Phase A only, typecheck, walk the Phase A subset of the verification matrix, then report before Phase B.

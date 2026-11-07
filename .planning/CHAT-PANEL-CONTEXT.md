# Chat Panel Advanced — Context

**Gathered:** 2026-11-06
**Status:** Ready for planning / implementation
**Note:** This work is **not yet a numbered ROADMAP phase**. It is an unnumbered, self-contained client-only pass. File naming uses `CHAT-PANEL-*` instead of `{padded_phase}-*` until it is added to the roadmap.

<domain>
## Phase Boundary

Make `components/chat-panel.tsx` behave like a serious AI client (Claude / ChatGPT / Mistral) **without breaking a single shipped flow**, and give it a handcrafted human typographic voice.

**Locked scope = "Tier 1 only"**: Stop/cancel generation, auto-growing composer (both modes), scroll anchoring + jump-to-latest, copy message + copy code block, regenerate + edit & resend, accessibility (`role="log"`, `aria-live`, focus), and scoped humanizer typography. One pass. **No storage/schema changes, no server edits, no new dependencies, no new font files.**

Explicitly excluded: Plan Phase B (multiple conversations + sidebar + localStorage v2 migration), Plan Phase C extras (timestamps, grouping, copy rewrite, glow removal), and all hard rejects listed below.
</domain>

<decisions>
## Implementation Decisions

### Build scope
- **D-01:** Build **Tier 1 only** (one pass, then verify). Plan Phases B and C are **not** in this pass. — **Reversibility:** reversible — deferring them leaves all storage keys and the server contract intact, so they can be added later without migration.
- **D-02:** Zero edits to `app/api/**`, `lib/providers.ts`, `package.json`, `next.config.mjs`, `app/layout.tsx`, `components/chat-widget.tsx`, and `lib/content.ts`. The SSE contract `POST /api/chat {message, history}` → `data: {"delta"}` / `{"error"}` / `{"done"}` is unchanged. — **Reversibility:** one-way — this is the published client/server contract verified in Phase 1 (`01-VERIFICATION.md`) and the security review (`03-SECURITY.md`); changing it requires re-running UAT and the threat register.

### Stop behavior
- **D-03:** On Stop, keep the user message **and** the partial assistant reply, mark it `stopped: true`, persist it, show **no red error box**, and **do not increment** the 30/day usage counter. The `AbortError` branch must be handled **before** the existing rollback at `chat-panel.tsx:313`, or both pending messages get deleted. — **Reversibility:** reversible — a local branch and one optional `Msg` field.
- **D-04:** Stop applies to **chat streaming only** in Tier 1. Image mode has no cancel button yet (single POST, progress bar, bounded ~15–25s). Deferred to Tier 2.
- **D-05:** Server side: the browser abort ends the SSE read; the upstream provider request may continue to its own 120s timer. Accept as bounded — no server change, no cancel endpoint.

### Humanizer depth
- **D-06:** **Typography + 2 copy fixes only.** New scoped `.chat-*` / `.chat-prose` classes in `app/globals.css`: Inter 400 prose at 15px/1.72 with a 68ch measure, `text-wrap: pretty`, JetBrains Mono 500 for meta with `tabular-nums`, one easing curve `cubic-bezier(0.22, 1, 0.36, 1)`, 120–180ms feedback, honours `prefers-reduced-motion`. **No new font files** — only the four existing self-hosted `.woff2` (Inter 400/600, Space Grotesk 700, JetBrains Mono 500).
- **D-07:** Fix exactly two unverifiable claims: `online · replies instantly` and `usually a few seconds`. **No broad copy rewrite** — Phase 2 (`02-CONTEXT.md`) deliberately humanized every visitor-facing string; rewriting again would undo shipped work.
- **D-08:** **No glow removal** in this pass. Composer shadows, orb pulse and blurred blobs stay. The `.zcode/plans/` `/unslop` direction is a separate visual pass that also changes the 400px widget.
- **D-09:** Never edit `.markdown-body` globally — it styles both chat and blog (`app/(site)/blog/[slug]/page.tsx:142`). Blog rendering must stay visually identical. — **Reversibility:** costly — a global change would restyle all 15 blog posts and require re-verifying them.

### Name gate + daily limit
- **D-10:** **Keep the name gate and `DAILY_LIMIT = 30` unchanged.** Do not fold in ROADMAP Phase 6 (no gate / 50 per day). Two behavior changes in the same pass as the biggest UI change makes a regression hard to isolate; Phase 6 stays a small isolated edit later and `STATE.md` / `REQUIREMENTS.md` need no updates now.

### Conversations
- **D-11:** **Defer multiple conversations entirely.** No rail, no thread list, no widget popover, no `chat_conversations_v2` key, no v1→v2 migration, no "New chat" button. Rationale: it appears in no requirements doc, it carries the plan's highest regression risk, it crowds a 400px widget, and ChatGPT/Claude sidebars exist because those products have accounts + server-side history — this site deliberately has neither.
- **D-12:** Reason the minimal "New chat" was also cut: the existing trash button (`chat-panel.tsx:500`) already performs a full erase (name, both histories, usage) and returns to the name gate. A second similar reset control in the top row would be confusing.

### Hard rejects (unchanged from the plan)
- **D-13:** No model/provider selector — `PRES-01` de-branded presentation; `/api/chat` never sends model identity to the browser. — **Reversibility:** one-way — would break a shipped, UAT-verified requirement and require a server contract change.
- **D-14:** No attachments/vision, no server-side history or sync, no LLM-generated thread titles, no syntax-highlighting dependency, no new network origins (CSP `connect-src 'self'`, `font-src 'self'`).

### Carry-forward constraints (already decided in earlier phases — do not re-ask)
- Phase 1: SSE contract, name gate, 30/day, erase-data, history persistence, key redaction, no model/provider identity in public UI.
- Phase 2: human-voice copy, 20px assistant avatar beside replies.
- Phase 3: separate `chat_history_v1` / `chat_image_history_v1`, client-direct CDN image rendering, env-pinned same-origin download proxy, aspect/style pickers, progress bar.
- Build discipline (`STATE.md`): `npx tsc --noEmit` → **stop `next dev`** → `npm run build` → restart. Never build while dev is live against the same `.next`.
- `strict: false` in `tsconfig.json`: defensive guards are mandatory; the compiler will not catch null/undefined.

### Claude's Discretion
Exact CSS values within the D-06 spec, component/helper structure, button placement and icons, `Msg` field naming, verification order, and whether to extract small helpers into the same file. The user accepted all four recommended defaults without specifying these.

### Folded Todos
- **CHAT-01 — "Generation cancel button while streaming"** (`REQUIREMENTS.md` v2 backlog, also `STATE.md` Deferred Items and `03-UI-REVIEW.md` remaining recommendation #1). Folded into scope as the Stop button. GSD's `todo.match-phase` returned 0 matches because these are tracked as markdown backlog items rather than GSD todo files.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and decision source
- `.planning/CHAT-PANEL-ADVANCED-PLAN.md` — the full plan; §0 affordance table, §2 invariants, §8 Phase A (the locked build), §9 risk register, §10 verification matrix. Phase B and §7's copy/glow parts are **out of scope** per D-01/D-08.
- `.planning/CHAT-PANEL-CONTEXT.md` — this file (decisions).
- `.planning/CHAT-PANEL-DISCUSSION-LOG.md` — audit trail only, not an agent input.

### Project state and roadmap
- `.planning/ROADMAP.md` — Phase 6 (Chat Access Simplification) touches this same file and is deliberately **not** folded in (D-10); Phases 4–5 at 0% and untouched.
- `.planning/REQUIREMENTS.md` — CHAT-01 folded; CHAT-02/03 remain deferred; v0.0.0.0.2 requirements out of scope.
- `.planning/STATE.md` — build/dev rule, deferred items, current milestone.
- `.planning/PROJECT.md` — core value: the chat must feel handcrafted by Ashish, not generated by a tool.
- `.planning/MILESTONES.md` — v0.0.0.0.1 shipped 2026-11-02, 8/8 UAT, 0 open high threats.

### Prior phase decisions
- `.planning/milestones/v0.0.0.0.1-phases/01-streaming-chat-de-branded-presentation/01-CONTEXT.md` — SSE transport, `PRES-01`.
- `.planning/milestones/v0.0.0.0.1-phases/02-handcrafted-feel-polish-pass/02-CONTEXT.md` — the exact copy before/after table that D-07 protects.
- `.planning/milestones/v0.0.0.0.1-phases/03-image-generation-mode-in-chat/03-CONTEXT.md` — separate histories, image mode.
- `.planning/milestones/v0.0.0.0.1-phases/03-image-generation-mode-in-chat/03-UI-REVIEW.md` — remaining recommendations (cancel button, error memory, popover Escape).
- `.planning/milestones/v0.0.0.0.1-phases/03-image-generation-mode-in-chat/03-SECURITY.md` — threat register; must stay closed.

### Codebase maps and conventions
- `.planning/codebase/CONCERNS.md` — `chat-panel.tsx` is the fragile area; client-side limit advisory only.
- `.planning/codebase/CONVENTIONS.md` — defensive parsing, `cn()`, no throwing in routes, block comments with rationale.
- `.planning/codebase/ARCHITECTURE.md` — route map and chat request data flow.
- `.claude/CLAUDE.md` — GSD workflow enforcement note (this work is outside a numbered GSD phase).
- `next.config.mjs` — CSP source of truth; `connect-src 'self'`, `font-src 'self'`, `img-src 'self' data: <CDN>`.

### Code to change (allowlist)
- `components/chat-panel.tsx` — primary file.
- `components/markdown.tsx` — add opt-in `codeCopy` prop, default `false`.
- `app/globals.css` — append `.chat-*` / `.chat-prose` classes only.

### Code to read but not change
- `app/api/chat/route.ts` — SSE event contract.
- `lib/providers.ts` — `streamProvider` / `callProvider`, 120s abort timers.
- `components/chat-widget.tsx` — widget sizing (400×560) and the `window` Escape listener.
- `app/layout.tsx` — the four self-hosted fonts.
- `tailwind.config.ts`, `components.json` — token and shadcn setup.

### Deferred visual direction (do not implement now)
- `.zcode/plans/plan-sess_7c84fe05-21b4-4c88-943d-16060db32ff3.md` — the `/unslop` nine-pass plan that wants all glows/gradients removed (D-08 defers it).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Markdown` (`components/markdown.tsx`) — react-markdown **9.1.0** + remark-gfm; consumed by chat (`chat-panel.tsx:696`) and blog (`app/(site)/blog/[slug]/page.tsx:142`). Add an opt-in prop; **the v9 `components.code` `inline` prop was removed** — detect block code via `className="language-*"` and override `components.pre`, extracting text with a recursive React-children walker.
- `Dialog` / `DialogContent` / `DialogTitle` etc. (`components/ui/dialog.tsx`) — already used in chat panel for erase-data; reuse for any confirm needed.
- `Button`, `Badge`, `Input`, `Textarea` — shadcn primitives; use plain `<button>` with `aria-label` + `title` for message actions (no Radix tooltip / dropdown-menu / scroll-area installed).
- `cn()` from `lib/utils.ts` — class composition.
- `lucide-react` §0.424.0 — icons already available (`Square`, `Copy`, `RefreshCw`, `Pencil`, `ChevronDown`, `Check`).
- `persistable()` (`chat-panel.tsx:114`) — strips inline `data:` images before saving; reuse for any new persistence path.
- `globals.css` `.chat-scroll`, `::selection`, `:focus-visible`, and the `prefers-reduced-motion` block (lines 87–94) — reuse as-is.
- `AbortSignal` / `ReadableStream.getReader()` — browser-native; no library needed for Stop.

### Established Patterns
- `"use client"` + hooks + `localStorage` in `chat-panel.tsx`; server components elsewhere.
- Defensive parsing everywhere: `String(x ?? "")`, `Array.isArray()`, `try/catch` around every `localStorage` read/write.
- Tailwind utility classes + HSL CSS-variable theme tokens; near-black surfaces, white hairlines, `--success` green reserved for live status and active state.
- `variant: "page" | "widget"` prop drives all layout branching; widget is 400×560.
- Route handlers never throw — they return `{ error: "snake_code", message }` (untouched here).
- All visitor state is browser-only: `chat_user_name`, `chat_history_v1`, `chat_image_history_v1`, `chat_usage` (all preserved).

### Integration Points
- `chat-panel.tsx:227–325` `send()` — add `AbortController` to the fetch, an `AbortError` branch **before** the rollback, `stopped` flag, and Stop/Send button swap.
- `chat-panel.tsx:187–190` scroll effect — gate on a `pinnedRef` set by an `onScroll` handler; use `behavior: "auto"` for per-token updates.
- `chat-panel.tsx:862–889` and `892–955` — both textareas need height sync (`style.height = "auto"` → `min(scrollHeight, 128)px`), reset on clear.
- `chat-panel.tsx:625–701` message render map — attach Copy / Regenerate / Edit actions; Regenerate re-calls `send()` with history truncated before the last assistant turn; Edit puts text in the composer and truncates from that turn.
- `components/markdown.tsx` — new optional prop; blog invocation stays `<Markdown>{post.content}</Markdown>` unchanged.
- `app/globals.css` — append scoped classes at the end; do not touch `.markdown-body` (lines 205–240).
- **No changes** to `app/api/**`, `lib/providers.ts`, `components/chat-widget.tsx`, `package.json`, `next.config.mjs`, `app/layout.tsx`, `lib/content.ts`, `public/*`.
</code_context>

<specifics>
## Specific Ideas

- "Like Claude / ChatGPT / Mistral" — meaning **control over the conversation**, not a model picker. The user explicitly wants a real AI client feel while preserving the de-branded presentation (`PRES-01`).
- "Humanizer type using font and many more things" — handcrafted, quiet precision: Inter prose with a proper measure, JetBrains Mono for meta/timestamps/counters, one easing curve, no glow, no generic AI-assistant phrasing. Achieved with **CSS only** because only four font files exist and CSP forbids external fonts.
- Governing instruction from the user: **"koi aur flow nahi tutna chahiye"** (no other flow may break) and **"do not make any more mistakes"** — this is why the pass is one self-contained client-only change with a verification gate after it.
</specifics>

<deferred>
## Deferred Ideas

- **Multiple conversations / sidebar / localStorage v2 migration** (Plan Phase B) — cut by D-11; highest regression risk, conflicts with the privacy model and the 400px widget.
- **Minimal "New chat" reset button** — cut by D-12 (duplicate-looking control next to the existing trash button).
- **Tier 2 pass**: hover timestamps, message grouping, broad copy rewrite, glow removal, popover Escape handling (**CHAT-02**), per-mode error memory (**CHAT-03**), image-generation cancel button (D-04).
- **ROADMAP Phase 6**: remove name gate, raise daily limit to 50 (D-10 keeps both).
- **ROADMAP Phase 4/5**: multi-provider failover and Vercel deploy + key rotation — untouched, still 0%.
- **Hard rejects (not deferred, will not be built)**: model/provider picker, attachments/vision, server-side history/sync, LLM-generated thread titles, syntax-highlighting dependency, any server-route edit, new fonts or npm dependencies.
- **`/unslop` site-wide visual direction** (`.zcode/plans/plan-sess_7c84fe05-…md`) — separate visual pass, needs the user's eyes in a browser first.

### Reviewed Todos (not folded)
- **CHAT-02** — popover Escape-key handling. Conflicts with `chat-widget.tsx:27–34` (`window` Escape closes the widget); needs a coordinated decision.
- **CHAT-03** — per-mode error memory. Small fix but separate concern from Tier 1.
- GSD `todo.match-phase "chat"` returned 0 matches; backlog items live in `REQUIREMENTS.md` / `STATE.md` as markdown.
</deferred>

---

*Work item: Chat Panel Advanced (Tier 1) — unnumbered, not yet in ROADMAP.md*
*Context gathered: 2026-11-06*

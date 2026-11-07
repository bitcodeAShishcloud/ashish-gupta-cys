# Chat Panel Advanced — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `CHAT-PANEL-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-11-06
**Work item:** Chat Panel Advanced (unnumbered, not yet in ROADMAP.md)
**Areas discussed:** Build scope, Stop behavior, Humanizer depth, Name gate + daily limit, Conversations cut

---

## Round 1 — Build scope

| Option | Description | Selected |
|--------|-------------|----------|
| Tier 1 only | Stop, autosize, scroll anchoring, copy message/code, regenerate + edit, a11y, scoped humanizer typography. One pass, no storage/schema changes, no server edits, no new deps or fonts. | ✓ |
| Tier 1 + Tier 2 | Also timestamps, grouping, copy rewrite, glow removal and popover Escape as a second pass. | |
| Also build conversations | Adds multi-thread rail + localStorage v2 migration. Highest regression risk. | |
| Everything in the plan | All three phases, largest surface area. | |

**User's choice:** Tier 1 only (Recommended).
**Notes:** User asked "ishme se koin koin sa banana shi rhega??" — which items are actually right to build. Recommendation was to cut Plan Phase B (conversations) entirely because it appears in no requirements doc, carries the highest migration risk, and ChatGPT/Claude sidebars exist due to accounts + server history that this project deliberately lacks.

---

## Round 2 — Stop behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Keep partial, no quota | Keep user message + partial reply marked `stopped`, persist, no red error, no usage increment. Matches today's count-on-success rule. | ✓ |
| Keep partial, count it | A provider request was consumed, so increment like ChatGPT. | |
| Roll back silently | Remove both pending messages with no error box. | |

**User's choice:** Keep partial, no quota (Recommended).
**Notes:** `chat-panel.tsx:313` catches everything and rolls back both pending messages with a red error box; `AbortError` needs a dedicated branch first. Server-side upstream request may run to its 120s timer after the browser abort — accepted as bounded. Image mode cancel deferred to Tier 2.

---

## Round 3 — Humanizer depth

| Option | Description | Selected |
|--------|-------------|----------|
| Typography + 2 copy fixes | Scoped `.chat-*` classes, 68ch Inter prose, mono meta with tabular-nums, one easing curve; fix only "replies instantly" and "usually a few seconds". | ✓ |
| Add glow removal | Also strip composer shadows, orb pulse and blurred blobs from chat chrome. | |
| Add full copy rewrite | Also rewrite greetings, status and suggestions. | |
| All three | Typography + copy rewrite + glow removal in one pass. | |

**User's choice:** Typography + 2 copy fixes (Recommended).
**Notes:** Phase 2 (`02-CONTEXT.md`) already humanized all visitor-facing strings deliberately. `.markdown-body` is shared with the blog, so typography must be scoped. Only four self-hosted font files exist; no new fonts or dependencies.

---

## Round 4 — Name gate + daily limit

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both | Keep name gate + 30/day. Zero behavior change; Phase 6 stays a small isolated edit. | ✓ |
| Fold Phase 6 in now | Remove name gate, raise limit to 50. | |
| Keep gate, raise to 50 | Half of Phase 6. | |
| Remove gate, keep 30 | Splits Phase 6 the other way. | |

**User's choice:** Keep both (Recommended).
**Notes:** ROADMAP Phase 6 (0%) edits this same file; doing both behavior changes at once would make a regression hard to isolate.

---

## Round 5 — Conversations cut

| Option | Description | Selected |
|--------|-------------|----------|
| Defer entirely | No new buttons, no storage keys, no migration, no risk. | ✓ |
| Minimal New chat + rename | One button clears only the current thread; rename trash to "Erase all data". | |
| Minimal New chat, no rename | Adds the button but leaves two similar reset controls. | |

**User's choice:** Defer entirely (Recommended).
**Notes:** Insight surfaced during discussion — the existing trash button (`chat-panel.tsx:500`) already performs a full erase (name, both histories, usage) and returns to the name gate, so a minimal "New chat" would duplicate a near-identical control.

---

## Claude's Discretion

Exact CSS values within the typography spec, component/helper structure, button placement and icons, `Msg` field naming, and verification order. The user accepted all recommended defaults without specifying these.

## Deferred Ideas

- Multiple conversations / sidebar / localStorage v2 migration (Plan Phase B).
- Minimal "New chat" reset button.
- Tier 2: hover timestamps, grouping, broad copy rewrite, glow removal, popover Escape (CHAT-02), per-mode error memory (CHAT-03), image-generation cancel.
- ROADMAP Phase 6 (no name gate, 50/day), Phase 4 (multi-provider failover), Phase 5 (Vercel deploy + key rotation).
- `/unslop` site-wide glow/gradient removal (`.zcode/plans/plan-sess_7c84fe05-…md`).
- Hard rejects, never to be built: model/provider picker, attachments/vision, server-side history, LLM thread titles, syntax-highlighting dependency, server-route edits, new fonts or deps.

# Phase 2 Plan: Handcrafted Feel Polish Pass

**Phase:** 2 | **Date:** 2026-10-31 | **Mode:** autonomous inline execution
**Context:** `.planning/phases/02-handcrafted-feel-polish-pass/02-CONTEXT.md`

## Tasks

1. `components/chat-panel.tsx` — name-gate copy, greeting, status line, suggestions, placeholders, counter, erase dialog copy; add 20px favicon avatar beside assistant replies
2. `components/chat-widget.tsx` — widget title + aria-label
3. `app/(site)/chat/page.tsx` — metadata description
4. `app/(site)/page.tsx` — hero "Ask the AI" button, contact section copy + button

## Verification

- `npx tsc --noEmit` clean; pages 200; no "AI assistant"/"Ask the AI"/"Chat with AI" strings left in visitor-facing copy; streaming still works (regression check)

## Must-Haves

- [ ] FEEL-01 chat microcopy human voice
- [ ] FEEL-02 avatar beside assistant replies, no other visual churn
- [ ] FEEL-03 home/chat visible copy de-AI-ified

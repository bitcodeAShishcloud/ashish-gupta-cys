# Roadmap: Ashish Gupta Cyber Security Portfolio

**Milestone:** v1 — Human-feel streaming chat
**Created:** 2026-10-31
**Mode:** Vertical MVP (coarse granularity)

## Overview

Two phases: first make the chat stream and stop exposing model identity, then a focused polish pass so the chat and public copy feel handcrafted rather than AI-generated.

## Phases

### Phase 1: Streaming Chat + De-branded Presentation
**Goal:** Assistant replies stream progressively into the chat UI (same-origin SSE proxied through `/api/chat`), with graceful fallback to a single response, and no model/provider name is shown anywhere in the public chat experience.
**Mode:** mvp
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, PRES-01, PRES-02
**Success Criteria**:
1. Sending a message shows the assistant reply building up progressively (visible partial text) rather than appearing all at once
2. No waiting-dots indicator remains once the reply text starts arriving
3. The public chat (page + widget) shows no model name or provider name anywhere, including after a completed reply
4. With a non-streaming provider response, the full reply still renders and history/limit/erase flows keep working
5. Admin console still shows provider and model details after login

### Phase 2: Handcrafted Feel Polish Pass
**Goal:** Chat microcopy and message presentation, plus a focused public-page copy pass, read and feel handcrafted — removing obvious AI-generated tells without a redesign.
**Mode:** mvp
**Requirements**: FEEL-01, FEEL-02, FEEL-03
**Success Criteria**:
1. Chat microcopy (greeting, suggestions, empty state, counter/limit lines) reads naturally and personally, with no generic assistant phrasing
2. Message bubbles, spacing, and streaming motion in the chat look deliberate and consistent with the site theme
3. Public pages (home, chat, footer, widget) contain no boilerplate AI-generated phrasing in visible copy
4. Existing functionality unchanged: name gate, streaming, limits, admin flows

## Coverage Check

| Requirement | Phase |
|-------------|-------|
| CHAT-01 | 1 |
| CHAT-02 | 1 |
| CHAT-03 | 1 |
| CHAT-04 | 1 |
| PRES-01 | 1 |
| PRES-02 | 1 |
| FEEL-01 | 2 |
| FEEL-02 | 2 |
| FEEL-03 | 2 |

All 9 v1 requirements mapped ✓

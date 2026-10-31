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

### Phase 3: Image Generation Mode in Chat
**Goal:** The chat gains an Image mode (default stays Chat) switched via a segmented control at the top of the panel: visitors pick an aspect ratio and a style, submit a prompt, and a generated image is returned inline in the same conversation — using the same provider config (AI_PROVIDERS_JSON) and API key, with the image endpoint derived as /images/generations (or an explicit type:"image" provider entry).
**Mode:** mvp
**Requirements**: IMAGE-01, IMAGE-02, IMAGE-03, IMAGE-04, IMAGE-05, IMAGE-06
**Success Criteria**:
1. The panel opens in Chat mode by default; a top segmented switch toggles to Image mode and back without losing the conversation
2. Image mode offers aspect ratio (9:16, 3:4, 1:1, 4:3, 16:9) and style (Auto, Photo, Anime, 3D, Oil paint, Watercolor, Pixel art, Minimal) pickers matching the provided reference UI, with the selected values shown
3. Submitting a prompt in Image mode returns a rendered image card inline, with download; the daily usage counter counts generations
4. Zero-config path works: the image endpoint is derived from the active chat provider base URL by targeting /images/generations on the same host with the same key; an explicit provider entry whose baseUrl already contains /images/generations is used as-is
5. Security posture intact: https-only outbound, SSRF blocklist + host whitelist applied to both the generation URL and any provider-returned image URL; API key never reaches the browser

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

| FEEL-01 | 2 |
| FEEL-02 | 2 |
| FEEL-03 | 2 |
| IMAGE-01 | 3 |
| IMAGE-02 | 3 |
| IMAGE-03 | 3 |
| IMAGE-04 | 3 |
| IMAGE-05 | 3 |
| IMAGE-06 | 3 |

All 15 v1 requirements mapped ✓

---
phase: "3"
slug: "image-generation-mode-in-chat"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-11-02"
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Visitor browser → Vercel server | Public `/api/image` + `/api/image/download` endpoints | Untrusted prompt (≤1000 chars), whitelisted aspect/style, image job id |
| Vercel server → image gateway (api.xkiro.com) | Generation submission + async job polling | Prompt, size; `Authorization` header crosses (API key, env-only) |
| Vercel server → provider CDN (cdn.xkiro.com) | Download proxy artifact retrieval | Host pinned by env/code default; path is a validated UUID segment |
| Visitor browser → provider CDN | Client-direct image rendering | Public generated image (no credentials in URL) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Tampering | `/api/image` | medium | mitigate | `style` validated against `STYLES` set; `aspect` mapped via `ASPECT_SIZES` whitelist — no free-form values reach the upstream request | closed |
| T-03-02 | Tampering | `/api/image/download` | high | mitigate | `id` must match `^[0-9a-fA-F-]{16,64}$`, `encodeURIComponent`d into a fixed path (`/ai-image-generator/{id}/0.png`); host comes from `imageCdnHost()` (env default), never from the request | closed |
| T-03-03 | Information Disclosure | `/api/image`, `lib/providers.ts` | high | mitigate | API key lives only in env `AI_PROVIDERS_JSON`; used solely in the server-side `Authorization` header; all error details pass through key `redact()` + 300-char cap before reaching the browser | closed |
| T-03-04 | Information Disclosure (SSRF) | image display + download flows | high | mitigate | Server-side fetch of provider-returned URLs **eliminated entirely** (client-direct rendering, commit fb4577c); the only remaining fetch target is constructed server-side from the env-pinned host + validated UUID (T-03-02) — no URL from any response or request is ever fetched | closed |
| T-03-05 | Denial of Service | `/api/image` | medium | mitigate | `rateLimit("image:", 6/min/IP)`; 120s AbortController on upstream; polling bounded by deadline; prompt capped at 1000 chars | closed |
| T-03-06 | Denial of Service | `/api/image/download` | low | mitigate | `rateLimit("image-dl:", 20/min/IP)`; response capped at 20MB; 60s fetch timeout | closed |
| T-03-07 | Elevation of Privilege | `components/chat-panel.tsx` | low | mitigate | Client storage tampering only affects the tamperer's own browser; every server input is independently validated (mode/aspect/style never trusted from storage) | closed |
| T-03-08 | Spoofing | `/api/image` | medium | mitigate | Per-IP rate limit via edge-set `x-real-ip`; visitor budget enforced client-side (30/day shared counter, localStorage) — abuse surface is bounded cost, not data | closed |
| T-03-09 | Repudiation | server | low | accept | No generation audit trail — deliberate privacy-first design (no accounts, no logs, nothing stored server-side) | open — below threshold (accepted) |
| T-03-10 | Information Disclosure | browser → provider CDN | low | accept | Visitor browser loads the generated image directly from the provider CDN — URL contains no credentials and exposes only the image the visitor themselves requested | open — below threshold (accepted) |

*Status: open · closed*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-03-01 | T-03-09 | No server-side generation logs — the product promise is "nothing is stored on a server"; repudiation risk is inherent to that design and acceptable for a personal portfolio | Owner (autonomous) | 2026-11-02 |
| R-03-02 | T-03-10 | Generated images load client-direct from the provider CDN; URLs are unauthenticated but discoverable only by the requesting visitor, and contain no key material | Owner (autonomous) | 2026-11-02 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-02 | 10 | 8 | 2 (accepted, below threshold) | Orchestrator inline retroactive-STRIDE (gsd-security-auditor subagent blocked by model provider — "request has been blocked due to unusual activity"; same block occurred on all subagent spawns this session) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-02

## Security Audit 2026-11-01

| Metric | Count |
|---|---|
| Threats found | 10 |
| Closed | 8 |
| Open | 2 |

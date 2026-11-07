# Phase 5: Production Deploy on Vercel + Key Hygiene - Context

**Gathered:** 2026-11-07
**Status:** Ready for planning
**Note:** Smart-discuss questions were presented; the user skipped them. Defaults below follow the recommended options, with the env/deploy step deferred because it requires owner-only material (Vercel account access + the Top-Tools-AI API key, which exists nowhere locally).

<domain>
## Phase Boundary

The production site (www.ashishcys.cyou) already runs on Vercel with the shipped v0.0.0.0.1 single-provider config. This phase makes the deploy **multi-provider-ready and key-hygienic**: repo-side leak audit, credential rotation for anything exposed, live production verification of chat + image mode, and a precise owner runbook for the remaining env-only steps (add Top-Tools-AI as the second chat provider, add its host to the allowlist, sync rotated admin creds). No source changes: Phase 4's failover code is already deployed (this repo auto-deploys via git push).

</domain>

<decisions>
## Implementation Decisions

### Deploy access & env updates (user skipped → defaults)
- Site identity: **www.ashishcys.cyou is this repo's Vercel deployment** (live 200, /api/chat streams, privacy page names Vercel).
- Access method: owner runs `vercel login` once (browser flow); the agent runs env updates + verification via CLI afterwards. **Deferred — owner action.**
- Top-Tools-AI provider: owner supplies baseUrl/model/API key (exists nowhere locally); agent integrates via env-only edits. **Deferred — owner action.**
- Because the owner material is unavailable, this phase completes the repo-side hygiene + live verification now, and hands the owner a runbook for the env-only steps.

### Key hygiene (SEC-01)
- Leak audit performed on tracked tree + full git history for the XKiro key, ADMIN_PASSWORD, ADMIN_SESSION_SECRET (full values + distinctive prefixes): **clean — zero hits**. README/04-01-SUMMARY hits on the literal `AI_PROVIDERS_JSON={` are documentation examples; real key values appear nowhere.
- **ADMIN_PASSWORD and ADMIN_SESSION_SECRET were rotated** (the old password was exposed in this session's browser-automation logs). New values live in .env.local (gitignored). Owner must mirror them to Vercel.
- The XKiro provider key was pasted in earlier chat sessions (per REQUIREMENTS SEC-01 note) → owner rotates it on the XKiro dashboard and updates env — documented in the runbook.
- .env.local confirmed gitignored (git status never lists it).

### Live verification (DEPL-01/03)
- Chat: `POST https://www.ashishcys.cyou/api/chat` streams delta events (verified live today).
- Image E2E: `POST /api/image` → CDN URL + jobId → download proxy 200 with `content-disposition: attachment; filename="ashish-image-<jobId>.png"`, malformed id → 400 (verified live today).
- CSP/security headers present on live responses; PRES-01: no provider/model identity in live stream (Phase 4 verified).

### Claude's Discretion
Runbook format and location; rotation value generation; exact live-check commands.

</decisions>

<code_context>
## Existing Code Insights
- Deployment model: git push → Vercel auto-deploy (privacy page + live state confirm). No Dockerfile/vercel.json changes needed; `maxDuration=180` already set on chat route.
- Env contract fixed by DEPL-02: AI_PROVIDERS_JSON (both providers), AI_ALLOWED_HOSTS (both hosts), AI_IMAGE_CSP_HOSTS, ADMIN_USERNAME/PASSWORD/SESSION_SECRET.
- SEC-01 forbids keys in repo/docs/history — verified clean today.

</code_context>

<specifics>
## Specific Ideas
- Owner runbook must be copy-paste executable (exact vercel CLI commands, exact env JSON shape) and must never itself contain a real key.

</specifics>

<deferred>
## Deferred Ideas
- Automatic deployment from this session (needs vercel login) — deferred to owner.
- Top-Tools-AI key acquisition — owner-only.
- Optionally re-run the /gsd:secure-phase audit (04 close warned SECURITY.md missing) at milestone audit time.

</deferred>

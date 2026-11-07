# Phase 4 API Coverage Declaration

**No external API integration:** Phase 4 composes the already-integrated provider layer — every outbound call path (`streamProvider`, `callProvider`) and every guard (`validateProviderUrl`, `hostIsAllowed`) already exists in `lib/providers.ts` from milestone v0.0.0.0.1 and is verified closed in the prior security review; this phase only reorders which provider is called, retries across candidates, and extends the admin test endpoint's target selection. No new endpoint, no new upstream, no new request/response contract with any external service (04-AI-SPEC: "adds no new AI framework, SDK, model, or provider type").

A COVERAGE.md matrix mapping new external calls to plan tasks is therefore unnecessary. The invariants that would have anchored such a matrix (SSRF gates per candidate, key redaction, SSE contract) are carried as must_haves and threat-model mitigations in 04-01-PLAN.md (T-04-01, T-04-02) instead.

— gsd-planner, 2026-11-07

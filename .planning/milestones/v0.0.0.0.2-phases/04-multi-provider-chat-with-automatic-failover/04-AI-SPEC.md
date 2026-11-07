# AI-SPEC — Phase 4: Multi-Provider Chat with Automatic Failover

> Compact spec. This phase adds **no new AI framework, SDK, model, or provider type** — it adds server-side failover on top of the shipped, security-reviewed provider layer (`lib/providers.ts`). The full framework-selection / doc-research / domain-research flow was not run because there is nothing to select or research: the integration surface is unchanged.

## System classification
LLM-backed chat feature on an existing in-house OpenAI-compatible provider abstraction. Client (Next.js chat panel) → same-origin `/api/chat` → one of N configured providers. No new external dependency.

## Framework / model decisions
- **Framework:** none new — `lib/providers.ts` stays the only provider abstraction. `streamProvider()` / `callProvider()` are used per-candidate in a retry loop.
- **Models:** unchanged. Providers/models are configured at deploy time via `AI_PROVIDERS_JSON`; nothing is hardcoded.
- **Alternatives considered:** none applicable — introducing an orchestration library (LangChain etc.) would violate I-10 (no new dependencies) and the shipped security review.

## Implementation guidance (locked by prior phases)
- SSE contract unchanged: `POST /api/chat {message, history}` → `data: {"delta"}` / `{"error"}` / `{"done"}`.
- SSRF gates (`validateProviderUrl` + `hostIsAllowed`) run **per candidate provider** inside the loop, not once.
- The existing stream→buffered fallback (`notStreamable` → `callProvider`) is preserved per candidate.
- `console.warn` on each failover (provider id + short reason, no PII). Routes never throw.
- `strict: false` — defensive guards (`String(x ?? "")`, `Array.isArray`, try/catch) mandatory.

## Evaluation strategy
| Dimension | Method |
|---|---|
| Failover correctness | Force active provider to fail (bad `activeId`, bad baseUrl host) → verify reply still streams from the next provider; verify one retry max; verify all-fail → last error surfaces via existing error path |
| Contract safety | Stream still emits only `delta`/`error`/`done`; no provider/model identity in stream or DOM (grep public DOM for `model`/`provider`) |
| Visitor parity | Name gate, 30/day limit, streaming, image mode — unchanged (walk the shipped flows) |
| Admin parity | Providers list shows all + status badge; per-provider test works for active and standby; masked keys stay masked |
| Regression | `npx tsc --noEmit`, full page walk (home/blog/chat/admin), console CSP clean |

Guardrails: visitor error copy stays generic; no failover state in the DOM; config (`AI_PROVIDERS_JSON`) is never mutated by the server at runtime.

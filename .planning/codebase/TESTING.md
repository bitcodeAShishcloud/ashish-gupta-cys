---
last_mapped_commit: c6d59afa6a73db72a398ade0755ad30bf0b68c86
last_mapped_at: 2026-10-31
---
# Testing

**Analysis Date:** 2026-10-31

## Summary

**There is no automated testing infrastructure.** No test runner is installed, no test files exist, no CI pipeline exists.

## Current State

- No test framework in `package.json` (no jest, vitest, mocha, playwright, cypress)
- No `__tests__/`, `*.test.*`, or `*.spec.*` files anywhere in the repo
- No test script (`package.json` scripts: dev, build, start, lint only)
- No GitHub Actions / CI configuration (no `.github/` directory)
- No coverage tooling

## Existing Verification Practices (manual)

- `npm run lint` — Next.js ESLint pass (no ESLint config file at root; relies on Next defaults)
- `npm run build` — TypeScript compile + Next.js build as a type-level smoke test
- Manual checks referenced in README: provider live test in the admin panel (`/admin` → live provider test hits `POST /api/providers { action: "test" }`)
- Local verification: `npm run dev` on port 3000 against `.env.local`

## Risk Areas If Tests Are Added

The security-critical pure functions in `lib/` are highly unit-testable (no I/O):

- `lib/providers.ts` — `validateProviderUrl()`, `isPrivateOrReservedIP()`, `hostIsAllowed()`, `normalizeEndpoint()`, `trimToContext()`, `resolvePath()` (SSRF gates are the highest-value targets)
- `lib/captcha.ts` — `issueCaptcha()` / `verifyCaptcha()` round-trip, expiry, tamper rejection
- `lib/admin-auth.ts` — `checkCredentials()`, `createSessionToken()` / `verifySessionToken()` expiry and tampering
- `lib/chat-http.ts` — `rateLimit()` window/sweep behavior

## Gaps

- No E2E coverage of the chat flow, admin login flow, or blog rendering
- No contract tests for the provider response-shape fallbacks in `callProvider()`
- No CI gate preventing regressions to the security headers in `next.config.mjs`

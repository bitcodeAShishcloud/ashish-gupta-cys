# UI-SPEC — Phase 4: Multi-Provider Chat with Automatic failover

**Scope:** `/admin` Providers tab only. Public site untouched (PRES-01: no provider/model identity in public chat).

**Screens touched:** one card in `app/admin/page.tsx` — the "Configured providers" card.

## Design contract

**Providers card — rows:**
- Each provider row: `rounded-lg border border-border bg-muted/40 p-4` (existing flat card language), flex row: name (font-medium) + model (font-mono text-xs text-muted-foreground) + status badge.
- **Status badge** per row: active → `<Badge variant="success">active</Badge>`; standby → `<Badge variant="outline" className="font-mono text-[10px]">standby</Badge> ` (muted mono, not colored — only the active row carries color).
- **Per-row Test button:** small outline button, `h-8 px-3 text-xs`, mono, with `RefreshCw h-3.5 w-3.5` icon; disabled state while that row's test runs (per-row `testing` state, not global); result line appears **under that row** (per-row result, not a shared one) — `Connected to {name} ({model}) — replied: "…"` or the failure detail; success line `text-success`? No — keep neutral `text-muted-foreground`; failure keeps the danger copy as today.
- The old single global Test button + shared result line is **replaced** by per-row tests (avoid two controls doing the same thing).
- Keep: existing 44px+ hit targets, `min-h-[44px]` touch rows on mobile, `font-mono` for ids/models, masked keys (never rendered).

## Behavior contracts
- `POST /api/providers { action: "test", id? }` — `id` optional; response `{ ok, provider, model, reply }` or `{ ok:false, detail }`.
- While testing a row, that row's button shows the spinner (`Loader2 h-3.5 w-3.5 animate-spin`); other rows stay enabled.
- Error handling: catch network errors → per-row failure line "Network error while testing." (existing copy).
- Public site diff review: `git diff --stat` must show only chat/admin/providers-route + planning docs.

## Verification hooks
- Admin walk: badges correct (exactly one `active`), per-row test works on both active and a standby provider (standby fail → inline error line under that row only).
- Public DOM grep for `model` / `provider` on /chat → zero.

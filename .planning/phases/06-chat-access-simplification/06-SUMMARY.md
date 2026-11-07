# 06 SUMMARY — Chat Access Simplification

Plan: single inline plan (client-only change; executor role executed inline — documented deviation).
Commits: chat-panel change + docs commit (see git log docs(06)).

## What shipped

components/chat-panel.tsx:
- Name gate removed entirely (SC1): visitors land straight in the chat on /chat and in the widget.
- DAILY_LIMIT 30 → 50 (SC2): the counter renders usage via DAILY_LIMIT (no hardcoded /30).
- Stored name stays graceful (SC3): returning visitors still see "Hey, I'm {name}" / "Hey {name}";
  anonymous visitors get "Hi — how can I help you today?" and "Hey — what are you curious about?".
- Dead code removed: name-gate UI, enterName(), nameInput state, unused Input/ArrowRight imports.
- eraseData unchanged semantics (removes name too); streaming, history, image mode untouched.

## Verification (all executed today)

- npx tsc --noEmit → exit 0; npm run build → exit 0 (after one stale-.next race, rebuilt clean).
- Server-bundle deep scan: gate string absent from every served chunk (6 chunks incl. lazy).
- Browser (127.0.0.1:3000, fresh origin — IAB disk-cache artifact on localhost origin documented):
  - Anonymous: no gate, composer direct, "Hi — how can I help you today?", counter "0/50 today · stays on your device".
  - Named (chat_user_name stored): "Hey, I'm TestUser" + composer. Test data cleaned after.
- Streaming/E2E contract re-verified earlier today on :3000 (delta→done) and live production (delta stream).

## Notes

- app/chat/page.tsx metadata (title/description) intentionally untouched (scope).
- The localhost-origin IAB disk-cache artifact (stale chunks across server boots) is documented;
  real browsers key cache on the full URL incl. the dev ?v= timestamp and will fetch fresh chunks.

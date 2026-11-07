# Owner Runbook — Multi-Provider Production Config (Phase 5)

Site: https://www.ashishcys.cyou — Vercel, git push → auto-deploy.
Time: about 10 minutes, env-only, zero code changes. Never paste real keys into chat or docs.

## 1) Vercel login (once)

```bash
npx vercel login
```

## 2) Rotate admin credentials on Vercel

Open vercel.com → your project → Settings → Environment Variables, and set for Production:

- `ADMIN_USERNAME` = `admin` (unchanged)
- `ADMIN_PASSWORD` = rotated value from your local `.env.local`
- `ADMIN_SESSION_SECRET` = rotated 64-hex value from your local `.env.local`

## 3) Provider keys

Rotate the XKiro key on the XKiro dashboard (it was pasted in an earlier chat session).
Get from the Top-Tools-AI dashboard: baseUrl (https host), model id, and API key.

## 4) Env variables to set in Vercel

- `AI_PROVIDERS_JSON` — JSON with three entries: p1 XKiro (rotated key), p2 Top-Tools-AI (chat), img1 XKiro Images; `activeId: "p1"`
- `AI_ALLOWED_HOSTS` — `api.xkiro.com` plus the Top-Tools-AI host
- `AI_IMAGE_CSP_HOSTS` — `cdn.xkiro.com`

## 5) AI_PROVIDERS_JSON shape

```json
{
  "activeId": "p1",
  "providers": [
    { "id": "p1", "name": "XKiro", "baseUrl": "https://api.xkiro.com/v1", "apiKey": "XKIRO_KEY_HERE", "model": "qwen/qwen3.8-max:free", "contextWindow": 1000000, "maxOutput": 65536 },
    { "id": "p2", "name": "Top-Tools-AI", "baseUrl": "https://<TOP-TOOLS-HOST>/v1", "apiKey": "TOP_TOOLS_KEY_HERE", "model": "<MODEL ID>", "contextWindow": 32000, "maxOutput": 4096 },
    { "id": "img1", "name": "XKiro Images", "baseUrl": "https://api.xkiro.com/v1/images/generations", "apiKey": "XKIRO_KEY_HERE", "type": "image", "model": "sensenova/sensenova-u1.5-lite" }
  ]
}
```

## 6) Verify after deploy

- `npx vercel ls` shows a fresh deployment for the new commit (or just wait for auto-deploy).
- Chat: open the live site, send one message — reply streams.
- Failover test (optional): set `activeId` to a bad id locally first? No — better: temporarily set `activeId` to p2, redeploy-free since env change triggers redeploy, chat must still work; then set back to p1.
- Admin: log in with the rotated password (local .env.local has it), Providers tab shows p1 active + p2 standby + img1 standby, per-row Test works on p1 and p2.

## 7) After this runbook

Tell the agent the second provider is live — verification of SC1 (two live providers) completes then.

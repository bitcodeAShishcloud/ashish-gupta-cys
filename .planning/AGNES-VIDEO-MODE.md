# Spec: Agnes Video Mode (post-v0.0.0.0.2 work item)

**Decided:** 2026-11-08, discuss-style. Source: https://agnes-ai.com/en/docs/agnes-video-25-flash

## Locked scope (v1)

- **Text-to-video only** (`mode: "text"`). Keyframe/reference modes need publicly-accessible
  input URLs which the client cannot supply (no storage) — deferred.
- **Async client-poll architecture** (no long-lived server request):
  - `POST /api/video {prompt, aspect, seconds}` → creates the provider task, returns `{taskId, seconds, aspect}` immediately.
  - `GET /api/video?id=<taskId>` → one provider status fetch → `{status, progress, url?}`.
  - Client polls every 2.5s, renders progress, survives reload (taskId persists in history).
- **Pickers:** aspect (`21:9|16:9|4:3|1:1|3:4|9:16`), duration (`"4"`–`"12"` seconds). Size fixed `720P` by the API.
- **Third mode** in the switch: Chat | Image | Video — separate `chat_video_history_v1` history (I-5 pattern).
- **Usage:** 1 video = 1 count on success, shared DAILY_LIMIT=50. `VIDEO_RATE_LIMIT` = 3/min/IP.
- **Rendering:** browser-direct `<video controls>` from the provider URL; CSP gains `media-src`
  from a new `AI_VIDEO_CSP_HOSTS` env (next.config.mjs).
- **No download proxy v1** (videos are MBs; right-click save works).
- **Provider config:** `{type:"video"}` entry; create URL = baseUrl + `/videos`; retrieval = baseUrl + `/agnesapi?video_id=…&model_name=…`. SSRF gates (validateProviderUrl + hostIsAllowed) run on every outbound call.

## API facts (from docs)

- Create: `POST {base}/v1/videos` `{model, prompt, mode:"text", seconds:"5", size:"720P", aspect_ratio:"16:9", n:1}` → `{id/task_id}`.
- Poll: `GET {base}/agnesapi?video_id=<id>&model_name=agnes-video-2.5-flash` every 1–2s → `{status, progress, url}` until `completed|failed`.
- Billing: $0.025/s (trial currently free). Validation errors: size must be 720P; text mode forbids media fields.

## Acceptance

- tsc + build clean; E2E: create → poll → completed URL renders in `<video>` (CSP clean);
  reload mid-generation resumes polling; history persists; usage counts once; chat/image modes untouched.
- No key material outside .env.local.

## E2E VERIFIED (2026-11-08, live)

- Task `task_6mlJEWSOGtQNBxIRlBcA7fhrl6SdowUD` ("paper boat at sunrise", 16:9, 4s):
  create → poll timeline 0% → 10% → 70% → 100% completed in ~6.5 min.
- Output: `https://platform-outputs.agnes-ai.space/videos/agnes-video-2.5/<taskId>.mp4`,
  1280×720 (16:9 720P) — **same CDN host as images**, so the `media-src` fallback to
  `AI_IMAGE_CSP_HOSTS` already allows it; zero CSP violations; no extra env needed.
- Client poll effect discovered completion, rendered `<video controls>` at 1280×720,
  usage counted once (shared 50/day), history persisted.
- Provider-side transient: free-tier queue was full for ~a day ("video queue is full,
  please retry later") — surfaced cleanly as `video_task_failed` with the provider detail.

// POST /api/video  { prompt, aspect, seconds }  → creates an async video
// task and returns { taskId } immediately — the client polls GET /api/video
// ?id=… every couple of seconds instead of holding one long request open,
// so no Vercel function timeout applies to a generation.
// GET /api/video?id=<taskId> → one provider status fetch →
// { status: "pending" | "completed" | "failed", progress, url? }.
// The finished video is played by the BROWSER directly from the provider
// URL — the server never fetches or proxies it. The key never reaches the
// browser; the output host must be CSP-allowed via AI_VIDEO_CSP_HOSTS.

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { createVideoTask, getVideoTask, resolveVideoTarget, loadProvidersAsync } from "@/lib/providers";

const VIDEO_RATE_LIMIT = Number(process.env.VIDEO_RATE_LIMIT) || 3; // creates / min / IP
const STATUS_RATE_LIMIT = Number(process.env.VIDEO_STATUS_RATE_LIMIT) || 30; // polls / min / IP
const MAX_PROMPT = 1000;
const ASPECTS = new Set(["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"]);
const SECONDS = new Set(["4", "5", "6", "7", "8", "9", "10", "11", "12"]);

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* PRES-01: no provider or model identity in the visitor-visible surface.
 * Upstream error text can echo the model id, and the SSRF host-gate message
 * embeds the provider hostname — scrub both before anything crosses to the
 * browser (the chat route applies the same bar via scrubIdentity). */
function publicDetail(detail: string | undefined, model: string): string | undefined {
  if (!detail) return detail;
  if (detail.includes("AI_ALLOWED_HOSTS") || detail.includes("are not allowed")) {
    return "The video provider is not reachable right now.";
  }
  return model ? detail.split(model).join("[model]") : detail;
}

export async function POST(req: NextRequest) {
  if (!rateLimit("video:" + clientIp(req), VIDEO_RATE_LIMIT)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many video requests — slow down a bit" },
      { status: 429 },
    );
  }

  const body = await readJsonBody(req);
  const prompt = String(body.prompt ?? "").trim().slice(0, MAX_PROMPT);
  if (!prompt) {
    return NextResponse.json(
      { error: "no_prompt", message: "Describe the video you want first" },
      { status: 400 },
    );
  }
  const aspect = ASPECTS.has(String(body.aspect ?? "")) ? String(body.aspect) : "16:9";
  const seconds = SECONDS.has(String(body.seconds ?? "")) ? String(body.seconds) : "5";

  const target = resolveVideoTarget(await loadProvidersAsync());
  if (!target) {
    return NextResponse.json(
      {
        error: "provider_not_configured",
        message: "No video provider is configured. The site owner needs to set AI_PROVIDERS_JSON.",
      },
      { status: 503 },
    );
  }

  const result = await createVideoTask(target, { prompt, seconds, aspectRatio: aspect });
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "video_task_failed",
        message: "The video provider rejected the request.",
        detail: publicDetail(result.detail, target.provider.model),
      },
      { status: result.status && result.status >= 400 && result.status < 600 ? result.status : 502 },
    );
  }

  return NextResponse.json({ taskId: result.taskId, seconds, aspect });
}

export async function GET(req: NextRequest) {
  // Status polls proxy a provider call each time — keep them bounded too.
  if (!rateLimit("video-status:" + clientIp(req), STATUS_RATE_LIMIT)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many status polls — slow down" },
      { status: 429 },
    );
  }
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id || id.length > 200 || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return NextResponse.json(
      { error: "bad_task", message: "A valid video task id is required" },
      { status: 400 },
    );
  }

  const target = resolveVideoTarget(await loadProvidersAsync());
  if (!target) {
    return NextResponse.json(
      { error: "provider_not_configured", message: "No video provider is configured." },
      { status: 503 },
    );
  }

  const result = await getVideoTask(target, id);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "status_failed",
        message: "Could not fetch the video status.",
        detail: publicDetail(result.detail, target.provider.model),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    status: result.status ?? "pending",
    progress: result.progress ?? 0,
    url: result.url ?? null,
    detail: publicDetail(result.detail, target.provider.model) ?? null,
  });
}

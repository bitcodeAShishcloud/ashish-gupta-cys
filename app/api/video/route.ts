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
import { createVideoTask, getVideoTask, resolveVideoTarget } from "@/lib/providers";

const VIDEO_RATE_LIMIT = Number(process.env.VIDEO_RATE_LIMIT) || 3; // creates / min / IP
const MAX_PROMPT = 1000;
const ASPECTS = new Set(["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"]);
const SECONDS = new Set(["4", "5", "6", "7", "8", "9", "10", "11", "12"]);

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const target = resolveVideoTarget();
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
        detail: result.detail,
      },
      { status: result.status && result.status >= 400 && result.status < 600 ? result.status : 502 },
    );
  }

  return NextResponse.json({ taskId: result.taskId, seconds, aspect });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id || id.length > 200 || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return NextResponse.json(
      { error: "bad_task", message: "A valid video task id is required" },
      { status: 400 },
    );
  }

  const target = resolveVideoTarget();
  if (!target) {
    return NextResponse.json(
      { error: "provider_not_configured", message: "No video provider is configured." },
      { status: 503 },
    );
  }

  const result = await getVideoTask(target, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: "status_failed", message: "Could not fetch the video status.", detail: result.detail },
      { status: 502 },
    );
  }

  return NextResponse.json({
    status: result.status ?? "pending",
    progress: result.progress ?? 0,
    url: result.url ?? null,
    detail: result.detail ?? null,
  });
}

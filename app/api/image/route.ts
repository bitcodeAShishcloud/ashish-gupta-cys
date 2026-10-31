// POST /api/image  { prompt: string, aspect: string, style: string }
// Generates one image via the AI_PROVIDERS_JSON config (same key as chat).
// The endpoint is /images/generations — derived from the active chat
// provider's base URL, or taken verbatim from an explicit type:"image"
// provider entry (including its async-job polling flow). The response
// returns the provider's image URL (or inline base64) for the BROWSER to
// load directly — the server never fetches provider-returned URLs, so there
// is no server-side SSRF surface. The CSP must allow the image host via
// AI_IMAGE_CSP_HOSTS (see next.config.mjs). The API key never reaches the
// browser.

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { generateImage, resolveImageTarget } from "@/lib/providers";

const RATE_LIMIT = Number(process.env.IMAGE_RATE_LIMIT) || 6; // requests / min / IP
const MAX_PROMPT = 1000;

export const dynamic = "force-dynamic";

const ASPECT_SIZES: Record<string, string> = {
  "9:16": "1024x1792",
  "3:4": "1024x1365",
  "1:1": "1024x1024",
  "4:3": "1365x1024",
  "16:9": "1792x1024",
};

const STYLES = new Set([
  "Auto",
  "Photo",
  "Anime",
  "3D",
  "Oil paint",
  "Watercolor",
  "Pixel art",
  "Minimal",
]);

/* Same fragments used for the style preview thumbnails — a chosen style must
 * render like its preview. */
const STYLE_PROMPTS: Record<string, string> = {
  Auto: "",
  Photo: "photorealistic photograph, natural lighting, sharp focus",
  Anime: "anime illustration, cel shading, vibrant colors, clean line art",
  "3D": "3D render, soft studio lighting, subsurface materials, high detail",
  "Oil paint": "oil painting, visible brush strokes, rich texture, canvas",
  Watercolor: "watercolor painting, soft color washes, paper texture",
  "Pixel art": "pixel art, 16-bit retro style, crisp square pixels",
  Minimal: "minimalist flat illustration, simple shapes, limited color palette",
};

export async function POST(req: NextRequest) {
  if (!rateLimit("image:" + clientIp(req), RATE_LIMIT)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Slow down a bit." },
      { status: 429 },
    );
  }

  const body = await readJsonBody(req);
  const prompt = String(body.prompt ?? "").trim().slice(0, MAX_PROMPT);
  if (!prompt) {
    return NextResponse.json(
      { error: "no_prompt", message: "Describe the image you want first." },
      { status: 400 },
    );
  }
  const aspect = String(body.aspect ?? "16:9");
  const size = ASPECT_SIZES[aspect];
  if (!size) {
    return NextResponse.json(
      { error: "bad_aspect", message: "Pick one of the listed aspect ratios." },
      { status: 400 },
    );
  }
  const style = STYLES.has(String(body.style ?? "")) ? String(body.style) : "Auto";
  const styleFragment = STYLE_PROMPTS[style] || "";
  const styledPrompt = styleFragment ? `${prompt}, ${styleFragment}` : prompt;

  const target = resolveImageTarget();
  if (!target) {
    return NextResponse.json(
      {
        error: "provider_not_configured",
        message:
          "No AI provider is configured yet. The site owner needs to set AI_PROVIDERS_JSON on the server.",
      },
      { status: 503 },
    );
  }

  const result = await generateImage(target, styledPrompt, size);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "generation_failed",
        message: "The image provider failed. Try again in a moment.",
        detail: result.detail,
      },
      { status: result.status && result.status >= 400 && result.status < 600 ? result.status : 502 },
    );
  }

  return NextResponse.json({
    image: result.url ?? result.dataUrl,
    jobId: result.jobId ?? null,
    size,
    style,
  });
}

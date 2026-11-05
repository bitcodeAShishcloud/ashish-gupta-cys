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

/* Image generation takes 60-90s server-side. Without an explicit ceiling
 * Vercel kills the invocation at its default (60s on older Hobby plans),
 * surfacing as a 504 long before the picture exists. The gateway's own
 * abort deadline in lib/providers stays at 120s, so this must match it. */
export const maxDuration = 300;

/* Only sizes the gateway actually supports (it rejects anything else).
 * 3:4/4:3 have no exact match — nearest portrait/landscape wins. */
const ASPECT_SIZES: Record<string, string> = {
  "9:16": "1024x1792",
  "3:4": "1024x1536",
  "1:1": "1024x1024",
  "4:3": "1536x1024",
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

/* Style LEADS the prompt — image models weight early tokens most, and these
 * same sentences generate the picker's preview thumbnails, so output matches
 * the preview the visitor picked. */
const STYLE_PROMPTS: Record<string, string> = {
  Auto: "",
  Photo: "Photorealistic photograph, shot on a real camera. {prompt} Natural lighting, sharp focus, true-to-life colors.",
  Anime: "Anime style illustration. {prompt} Cel shading, vibrant colors, clean line art, expressive eyes.",
  "3D": "3D render. {prompt} Soft studio lighting, subsurface materials, glossy highlights, high detail, octane render quality.",
  "Oil paint": "Oil painting on canvas. {prompt} Thick visible brush strokes, rich paint texture, classical composition.",
  Watercolor: "Watercolor painting on paper. {prompt} Soft color washes, delicate gradients, paper texture, bleeding pigments.",
  "Pixel art": "Pixel art, 16-bit retro game sprite. {prompt} Crisp square pixels, limited palette, no anti-aliasing.",
  Minimal: "Minimalist flat illustration. {prompt} Simple geometric shapes, limited color palette, generous negative space, clean vector look.",
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
  const styledPrompt = styleFragment
    ? styleFragment.replace("{prompt}", prompt)
    : prompt;

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

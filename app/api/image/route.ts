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
import { generateImage, resolveImageTarget, validateProviderUrl } from "@/lib/providers";

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

/* ratio-tiers providers (sizeMode:"ratio-tiers", e.g. Agnes) take a ratio
 * string + a size tier instead of exact pixel sizes. */
const RATIOS = new Set(["1:1", "3:4", "4:3", "16:9", "9:16", "2:3", "3:2", "21:9"]);
const TIERS = new Set(["1K", "2K", "3K", "4K"]);
/* Docs recommend 60-360s client timeouts; higher tiers take longer. The
 * route ceiling stays at maxDuration 300. */
const TIER_TIMEOUT_MS: Record<string, number> = {
  "1K": 120000,
  "2K": 240000,
  "3K": 295000,
  "4K": 295000,
};
const MAX_IMAGE_ITEMS = 3;
const MAX_IMAGE_CHARS = 3_500_000; // ~2.6MB binary per reference image

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

  /* Per-mode aspect validation: ratio-tiers providers accept any documented
   * ratio; legacy exact-size providers stay restricted to the original five. */
  const tierMode = target.provider.sizeMode === "ratio-tiers";
  const tier = TIERS.has(String(body.tier ?? "")) ? String(body.tier) : "1K";
  let size = "";
  if (tierMode) {
    if (!RATIOS.has(aspect)) {
      return NextResponse.json(
        { error: "bad_aspect", message: "Pick one of the listed aspect ratios." },
        { status: 400 },
      );
    }
    size = `${tier} ${aspect}`;
  } else {
    size = ASPECT_SIZES[aspect];
    if (!size) {
      return NextResponse.json(
        { error: "bad_aspect", message: "Pick one of the listed aspect ratios." },
        { status: 400 },
      );
    }
  }

  /* Reference images (img2img): ≤3 items, each a data:image URI or a public
   * https URL under the size cap. The provider fetches URLs itself — the
   * server never does — but localhost/private hosts are still rejected so
   * the endpoint cannot be used to point the provider at internal targets. */
  const rawImages = Array.isArray(body.images) ? body.images : [];
  const images: string[] = [];
  for (const raw of rawImages.slice(0, MAX_IMAGE_ITEMS)) {
    const s = String(raw ?? "");
    if (/^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(s)) {
      if (s.length > MAX_IMAGE_CHARS) {
        return NextResponse.json(
          { error: "bad_image", message: "Reference image is too large. Try a smaller one." },
          { status: 413 },
        );
      }
      images.push(s);
    } else if (/^https:\/\//i.test(s)) {
      if (validateProviderUrl(s)) {
        return NextResponse.json(
          { error: "bad_image", message: "Reference image URL is not allowed." },
          { status: 400 },
        );
      }
      images.push(s);
    } else {
      return NextResponse.json(
        { error: "bad_image", message: "Reference images must be image files or https URLs." },
        { status: 400 },
      );
    }
  }

  const style = STYLES.has(String(body.style ?? "")) ? String(body.style) : "Auto";
  const styleFragment = STYLE_PROMPTS[style] || "";
  const styledPrompt = styleFragment
    ? styleFragment.replace("{prompt}", prompt)
    : prompt;

  const result = await generateImage(target, styledPrompt, size, {
    timeoutMs: TIER_TIMEOUT_MS[tier] || 120000,
    tier,
    ratio: aspect,
    images,
  });
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
    revisedPrompt: result.revisedPrompt ?? null,
    size,
    style,
  });
}

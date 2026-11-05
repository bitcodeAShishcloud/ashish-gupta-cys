// GET /api/image/download?id=<jobId>
// Streams the generated image back as an attachment so the visitor's browser
// downloads it instead of opening the provider CDN. The request URL is built
// here from the env-pinned CDN host (AI_IMAGE_CSP_HOSTS) plus one strict
// UUID path segment — the server never fetches a URL supplied verbatim by
// the client, and the host cannot be influenced by the request.

import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/chat-http";
import { imageCdnHost } from "@/lib/providers";

export const dynamic = "force-dynamic";

/* Downloading a multi-MB PNG from the provider CDN needs headroom too. */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!rateLimit("image-dl:" + clientIp(req), 20)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many downloads. Slow down a bit." },
      { status: 429 },
    );
  }

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^[0-9a-fA-F-]{16,64}$/.test(id)) {
    return NextResponse.json(
      { error: "bad_id", message: "Invalid image id." },
      { status: 400 },
    );
  }

  // Host comes from env with a code default — never from the request.
  const url = `https://${imageCdnHost()}/ai-image-generator/${encodeURIComponent(id)}/0.png`;

  try {
    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(60_000),
      headers: { Accept: "image/*" },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "not_found", message: "Image is no longer available on the provider CDN." },
        { status: 404 },
      );
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length === 0 || buf.length > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "bad_image", message: "Image could not be downloaded." },
        { status: 502 },
      );
    }
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/png",
        "Content-Disposition": `attachment; filename="ashish-image-${id}.png"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const e = err as { name?: string };
    return NextResponse.json(
      { error: "download_failed", message: "Download failed. Try again." },
      { status: e.name === "TimeoutError" ? 504 : 502 },
    );
  }
}

// POST /api/research  { query: string, urls?: string[] }
// Same-origin prospect research proxy for the chat. The outbound destination
// is a pinned constant inside lib/research.ts — no user-supplied host is ever
// fetched. Rate-limited 3/min/IP (locked decision #12). The YDC_API_KEY never
// leaves the server and upstream error bodies are never echoed to the client.

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import { runResearch } from "@/lib/research";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_INPUT = 1000;

export async function POST(req: NextRequest) {
  if (!rateLimit("research:" + clientIp(req), 3)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many research requests. Slow down a bit." },
      { status: 429 },
    );
  }

  const body = await readJsonBody(req);
  const query = String(body.query ?? "").trim().slice(0, MAX_INPUT);
  if (!query) {
    return NextResponse.json(
      { error: "no_query", message: "A research query is required." },
      { status: 400 },
    );
  }
  const rawUrls = Array.isArray(body.urls) ? body.urls : [];
  const urls = rawUrls
    .filter((u): u is string => typeof u === "string")
    .slice(0, 3)
    .map((u) => u.slice(0, 500));

  const result = await runResearch(query, urls);

  if (!result.ok) {
    // Generic message only — no key, no upstream detail, no account info.
    return NextResponse.json(
      {
        error: "research_unavailable",
        message: "Research is unavailable right now. You can still paste details in the chat.",
        reason: result.reason ?? "upstream",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    text: result.text,
    sources: result.sources,
  });
}

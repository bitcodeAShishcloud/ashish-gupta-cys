// POST /api/chat  { message: string, history?: [{role, content}] }
// Proxies to the active OpenAI-compatible provider. No user data is stored
// server-side: no cookies, no database — chat history lives only in the
// visitor's browser. The provider API key never leaves the server.
// The outbound destination is pinned by the server env var AI_PROVIDERS_JSON
// and gated by validateProviderUrl + the AI_ALLOWED_HOSTS whitelist.

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import {
  getActiveProvider,
  validateProviderUrl,
  trimToContext,
  callProvider,
  providerDefaults,
} from "@/lib/providers";

const RATE_LIMIT = Number(process.env.CHAT_RATE_LIMIT) || 10; // requests / min / IP
const MAX_INPUT = 1000;
const MAX_HISTORY_MESSAGES = 24;
const MAX_HISTORY_CONTENT = 2000;

const SYSTEM_PROMPT = `You are SecureAI, the assistant embedded in Ashish Gupta's cybersecurity portfolio.
Ashish is a 3rd-year B.Tech Cyber Security student and developer at NIET. His portfolio covers: about, skills (network security, web security, Linux, Python, JavaScript), projects, certifications, a home lab, a blog, and a gallery.
Guidelines:
- Be helpful, concise and friendly. Default to short answers; use markdown (bold, lists, fenced code blocks) when it improves clarity.
- Never use emojis in replies. No greetings like "Hi there" either; answer the question directly.
- You can answer general cybersecurity, networking, and programming questions, and questions about Ashish's skills and projects using the portfolio context above.
- For anything you are unsure about regarding Ashish's personal details, say you are not certain.
- Never help with illegal activity. For offensive-security questions, keep answers educational and high-level.
- Reply in the language the user writes in.`;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit("chat:" + clientIp(req), RATE_LIMIT)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Slow down a bit." },
      { status: 429 },
    );
  }

  const body = await readJsonBody(req);
  const message = String(body.message ?? "").trim().slice(0, MAX_INPUT);
  if (!message) {
    return NextResponse.json(
      { error: "no_messages", message: "Message is required." },
      { status: 400 },
    );
  }

  // Sanitize user-supplied history turns (roles forced, content capped)
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory.slice(0, MAX_HISTORY_MESSAGES).flatMap((m) => {
    if (typeof m !== "object" || m === null) return [];
    const item = m as { role?: unknown; content?: unknown };
    const role = item.role === "assistant" ? "assistant" : "user";
    const content = String(item.content ?? "").trim().slice(0, MAX_HISTORY_CONTENT);
    if (!content) return [];
    return [{ role, content }];
  });

  const provider = getActiveProvider();
  if (!provider || !provider.apiKey || !provider.model) {
    return NextResponse.json(
      {
        error: "provider_not_configured",
        message:
          "No AI provider is configured yet. The site owner needs to set AI_PROVIDERS_JSON on the server.",
      },
      { status: 503 },
    );
  }
  const urlError = validateProviderUrl(provider.baseUrl);
  if (urlError) {
    return NextResponse.json(
      { error: "provider_not_configured", message: "Active provider has an invalid base URL." },
      { status: 503 },
    );
  }

  // Context-window-aware trimming (provider may override the window size)
  const d = providerDefaults(provider);
  const upstream = trimToContext(SYSTEM_PROMPT, history, d.contextWindow, d.maxOutput);
  upstream.push({ role: "user", content: message });

  // Redact the provider's key from any error detail shown to the visitor
  const redact = (text: unknown) => {
    let out = String(text ?? "");
    if (provider.apiKey && out.includes(provider.apiKey)) {
      out = out.split(provider.apiKey).join("***");
    }
    return out.slice(0, 300);
  };

  const result = await callProvider(provider, upstream);
  if (!result.ok) {
    const detail = redact(result.detail);
    return NextResponse.json(
      {
        error: "upstream_error",
        message: "The AI provider failed to respond. Try again shortly.",
        detail,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    reply: result.reply,
    model: provider.model,
    provider: provider.name,
  });
}

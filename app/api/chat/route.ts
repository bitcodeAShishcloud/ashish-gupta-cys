// POST /api/chat  { message: string, history?: [{role, content}] }
// Streams the reply as same-origin SSE: `data: {"delta": "..."}` chunks
// terminated by `data: {"done": true}`. No user data is stored server-side:
// no cookies, no database — chat history lives only in the visitor's browser.
// The provider API key never leaves the server. The outbound destination is
// pinned by AI_PROVIDERS_JSON and gated by validateProviderUrl +
// AI_ALLOWED_HOSTS. If the provider cannot stream, the buffered reply is
// emitted as a single delta so the client contract never changes. The model
// and provider identity are intentionally never sent to the browser.

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import {
  getActiveProvider,
  validateProviderUrl,
  trimToContext,
  callProvider,
  streamProvider,
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

/* The provider stream runs to a 120s abort deadline in lib/providers; give
 * Vercel room for it instead of letting the default kill a long reply. */
export const maxDuration = 180;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
} as const;

function sseEvent(obj: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

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

  // Preferred path: proxy the provider's own SSE stream token by token.
  const streamed = await streamProvider(provider, upstream);
  if (streamed.ok && streamed.stream) {
    const upstreamBody = streamed.stream;
    return new Response(
      new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = upstreamBody.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let sentChars = 0;
          const push = (obj: Record<string, unknown>) => controller.enqueue(sseEvent(obj));
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const payload = trimmed.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const chunk = JSON.parse(payload) as {
                    choices?: {
                      delta?: { content?: unknown };
                      message?: { content?: unknown };
                    }[];
                  };
                  const piece =
                    chunk.choices?.[0]?.delta?.content ??
                    chunk.choices?.[0]?.message?.content;
                  if (typeof piece === "string" && piece) {
                    sentChars += piece.length;
                    push({ delta: piece });
                  }
                } catch {
                  /* keep-alive comment or partial line — skip */
                }
              }
            }
          } catch (err) {
            push({ error: redact(err instanceof Error ? err.message : "stream interrupted") });
          } finally {
            if (sentChars === 0) {
              push({ error: redact("The AI provider returned an empty response.") });
            }
            push({ done: true });
            controller.close();
            streamed.dispose?.();
          }
        },
        cancel() {
          streamed.dispose?.();
        },
      }),
      { headers: SSE_HEADERS },
    );
  }

  // Fallback: provider rejected streaming or answered non-SSE — buffer the
  // full reply and emit it as one delta so the client contract is uniform.
  const result = await callProvider(provider, upstream);
  const buffered = new ReadableStream<Uint8Array>({
    start(controller) {
      if (!result.ok) {
        controller.enqueue(
          sseEvent({ error: redact(result.detail || "The AI provider failed to respond.") }),
        );
      } else {
        controller.enqueue(sseEvent({ delta: result.reply ?? "" }));
      }
      controller.enqueue(sseEvent({ done: true }));
      controller.close();
    },
  });
  return new Response(buffered, { headers: SSE_HEADERS });
}

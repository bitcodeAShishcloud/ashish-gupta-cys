// POST /api/chat  { message: string, history?: [{role, content}] }
// Streams the reply as same-origin SSE: `data: {"delta": "..."}` chunks
// terminated by `data: {"done": true}`. No user data is stored server-side:
// no cookies, no database — chat history lives only in the visitor's browser.
// The provider API key never leaves the server. The outbound destination is
// pinned by AI_PROVIDERS_JSON and gated by validateProviderUrl +
// AI_ALLOWED_HOSTS. If the provider cannot stream, the buffered reply is
// emitted as a single delta so the client contract never changes. The model
// and provider identity are intentionally never sent to the browser.
// Failover: if the active provider fails before the first streamed token,
// the request retries against the next configured chat provider — entirely
// server-side; the SSE contract and the visitor experience stay identical.

import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, clientIp, rateLimit } from "@/lib/chat-http";
import {
  orderedChatCandidates,
  trimToContext,
  callProvider,
  streamProvider,
  providerDefaults,
} from "@/lib/providers";
import { buildKnowledgeBase } from "@/lib/knowledge";

const RATE_LIMIT = Number(process.env.CHAT_RATE_LIMIT) || 10; // requests / min / IP
const MAX_INPUT = 1000;
const MAX_HISTORY_MESSAGES = 24;
const MAX_HISTORY_CONTENT = 2000;

const SYSTEM_PROMPT = `You are SecureAI, the assistant embedded in Ashish Gupta's cybersecurity portfolio.
Ashish is a 3rd-year B.Tech Cyber Security student and developer at NIET. His portfolio covers: about, skills (network security, web security, Linux, Python, JavaScript), projects, certifications, a home lab, and a blog.
Guidelines:
- Be helpful, concise and friendly. Default to short answers; use markdown (bold, lists, fenced code blocks) when it improves clarity.
- Never use emojis in replies. No greetings like "Hi there" either; answer the question directly.
- You can answer general cybersecurity, networking, and programming questions, and questions about Ashish's skills and projects using the portfolio context above.
- The fact sheet below is verified data about Ashish — answer questions about him from it and prefer it over guesses. For anything not covered there, say you are not certain.
- Never help with illegal activity. For offensive-security questions, keep answers educational and high-level.
- Reply in the language the user writes in.

${buildKnowledgeBase()}`;

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

/* Result of the first-token probe: either the candidate is committed (reader
 * held, first deltas parsed, partial-line tail and the mid-stream TextDecoder
 * kept) or it failed before any byte reached the visitor. */
interface FirstTokenProbe {
  ok: boolean;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  pendingDeltas?: string[];
  tailBuffer?: string;
  tailDecoder?: TextDecoder;
  err?: { detail: string; status: number };
}

/* Failover commit point: hold the upstream SSE body until the first content
 * delta is parsed, reusing the exact line parsing of the pass-through loop
 * below. Every piece found in the same batch of lines is returned as
 * pendingDeltas so no consumed bytes are lost. The Response is only built
 * after this succeeds — zero bytes can reach the visitor before a candidate
 * is committed, so a failover can never duplicate text. */
async function readFirstDelta(
  stream: ReadableStream<Uint8Array>,
): Promise<FirstTokenProbe> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    let done: boolean;
    let value: Uint8Array | undefined;
    try {
      const read = await reader.read();
      done = read.done;
      value = read.value;
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e.name === "AbortError") {
        return { ok: false, reader, err: { detail: "Provider timed out.", status: 504 } };
      }
      return {
        ok: false,
        reader,
        err: { detail: e.message || "stream interrupted", status: 502 },
      };
    }
    if (done) {
      return {
        ok: false,
        reader,
        err: { detail: "The AI provider returned an empty response.", status: 502 },
      };
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    const pending: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: {
            delta?: { content?: unknown };
            message?: { content?: unknown };
          }[];
        };
        const piece =
          parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content;
        if (typeof piece === "string" && piece) pending.push(piece);
      } catch {
        /* keep-alive comment or partial line — skip */
      }
    }
    if (pending.length > 0) {
      return { ok: true, reader, pendingDeltas: pending, tailBuffer: buffer, tailDecoder: decoder };
    }
  }
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

  // Failover candidates: the active provider first, then the remaining chat
  // providers in AI_PROVIDERS_JSON order (see orderedChatCandidates).
  // Keyless/model-less entries are skipped, not attempted — a doomed request
  // (Bearer "") would only burn the failover budget on a guaranteed 401.
  const candidates = orderedChatCandidates().filter((p) => p.apiKey && p.model);
  if (candidates.length === 0) {
    return NextResponse.json(
      {
        error: "provider_not_configured",
        message:
          "No AI provider is configured yet. The site owner needs to set AI_PROVIDERS_JSON on the server.",
      },
      { status: 503 },
    );
  }

  // Redact EVERY viable candidate's key from any error detail shown to the
  // visitor — a failover error may originate from any candidate, so the key
  // list is built from all of them before the loop (300-char cap kept).
  const keys = candidates.map((p) => p.apiKey).filter(Boolean) as string[];
  const redact = (text: unknown) => {
    let out = String(text ?? "");
    for (const k of keys) {
      if (k && out.includes(k)) {
        out = out.split(k).join("***");
      }
    }
    return out.slice(0, 300);
  };

  // PRES-01: upstream error text can echo the requested model id back (e.g.
  // "The model `qwen/...` does not exist"), which would carry model identity
  // into the public stream/DOM. Scrub every candidate's model id from
  // visitor-bound detail — full detail stays server-side (console.warn).
  const scrubIdentity = (out: string) => {
    for (const p of candidates) {
      if (p.model) out = out.split(p.model).join("[model]");
    }
    return out;
  };

  // Shared failover budget: every candidate draws from the same 170s pool via
  // its per-call abort timer, so N attempts together stay inside the 180s
  // maxDuration even though a single attempt would otherwise get 120s.
  const failoverStartedAt = Date.now();
  const FAILOVER_BUDGET_MS = 170000;

  let lastErr = { detail: "The AI provider failed to respond.", status: 502 };

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const isLast = i === candidates.length - 1;
    const remaining = Math.max(
      5000,
      Math.min(120000, FAILOVER_BUDGET_MS - (Date.now() - failoverStartedAt)),
    );

    // Per-candidate context trimming: the context window is a property of the
    // provider, so a smaller-window standby must never receive a payload
    // trimmed against the active provider's larger window.
    const d = providerDefaults(candidate);
    const upstream = trimToContext(SYSTEM_PROMPT, history, d.contextWindow, d.maxOutput);
    upstream.push({ role: "user", content: message });

    // Preferred path: proxy the provider's own SSE stream token by token.
    // Both SSRF gates run inside streamProvider per candidate — a validated
    // URL is never passed across candidates. The loop is stateless per
    // request: the registry and activeId are never written.
    const streamed = await streamProvider(candidate, upstream, { timeoutMs: remaining });

    if (streamed.ok && streamed.stream) {
      // First-token probe: hold the stream until a delta exists so a
      // pre-token failure can fail over without any byte reaching the visitor.
      const probe = await readFirstDelta(streamed.stream);
      if (probe.ok && probe.reader && probe.pendingDeltas && probe.tailBuffer !== undefined) {
        const reader = probe.reader;
        const pending = probe.pendingDeltas;
        const tailBuffer = probe.tailBuffer;
        const tailDecoder = probe.tailDecoder;
        return new Response(
          new ReadableStream<Uint8Array>({
            async start(controller) {
              // The probe's stream:true decode may hold an incomplete trailing
              // multi-byte UTF-8 sequence — reuse its decoder so a character
              // split at the commit boundary is not corrupted.
              const decoder = tailDecoder ?? new TextDecoder();
              let buffer = tailBuffer;
              const push = (obj: Record<string, unknown>) => controller.enqueue(sseEvent(obj));
              try {
                for (const piece of pending) {
                  push({ delta: piece });
                }
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
                        push({ delta: piece });
                      }
                    } catch {
                      /* keep-alive comment or partial line — skip */
                    }
                  }
                }
              } catch (err) {
                // Mid-stream failure: the visitor already saw text — no
                // cross-provider retry, surface exactly as before.
                push({
                  error: redact(scrubIdentity(err instanceof Error ? err.message : "stream interrupted")),
                });
              } finally {
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

      // Probe failure = pre-first-token failure for this candidate: abandon
      // the upstream (cancel the body, clear the abort timer) so no socket or
      // timer leaks while the next candidate runs. A same-candidate buffered
      // retry would only double the latency of a likely-repeat failure.
      try {
        await probe.reader?.cancel();
      } catch {
        /* best-effort abandon */
      }
      streamed.dispose?.();
      lastErr = probe.err ?? lastErr;
    } else if (streamed.notStreamable) {
      // Capability fallback, not a failure retry: the same candidate answers
      // buffered (existing stream→buffered behavior, preserved per candidate).
      const result = await callProvider(candidate, upstream, { timeoutMs: remaining });
      if (result.ok) {
        const buffered = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(sseEvent({ delta: result.reply ?? "" }));
            controller.enqueue(sseEvent({ done: true }));
            controller.close();
          },
        });
        return new Response(buffered, { headers: SSE_HEADERS });
      }
      lastErr = { detail: result.detail || lastErr.detail, status: result.status ?? lastErr.status };
    } else {
      // Any other pre-token failure (HTTP error incl. upstream 429, abort
      // timeout, SSRF-gate rejection): this candidate is consumed, move on.
      lastErr = { detail: streamed.detail || lastErr.detail, status: streamed.status ?? lastErr.status };
    }

    console.warn(
      `[chat] provider "${candidate.id}" failed before first token (${redact(lastErr.detail)}); ${isLast ? "no candidates left" : "failing over"}`,
    );
  }

  // Every candidate failed: the LAST candidate's redacted, identity-scrubbed
  // error reaches the visitor through the existing buffered error path —
  // generic copy, no provider or model identity added by our code or echoed
  // from upstream, no silent fallback.
  const buffered = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        sseEvent({
          error: redact(scrubIdentity(lastErr.detail || "The AI provider failed to respond.")),
        }),
      );
      controller.enqueue(sseEvent({ done: true }));
      controller.close();
    },
  });
  return new Response(buffered, { headers: SSE_HEADERS });
}

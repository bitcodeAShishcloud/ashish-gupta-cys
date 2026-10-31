"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

const NAME_KEY = "chat_user_name";
const HISTORY_KEY = "chat_history_v1";
const USAGE_KEY = "chat_usage";
const DAILY_LIMIT = 30;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What is Ashish good at?",
  "How was Poppit AI built?",
  "How do I get started in cybersecurity?",
  "Which certifications does Ashish have?",
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function usageToday(): number {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw) as { date?: string; count?: number };
    return data.date === todayKey() ? Number(data.count) || 0 : 0;
  } catch {
    return 0;
  }
}

export function ChatPanel({
  variant = "page",
}: {
  variant?: "page" | "widget";
}) {
  const [name, setName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [limited, setLimited] = useState(false);
  const [firstToken, setFirstToken] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load name + history once, on the client only.
  useEffect(() => {
    try {
      const n = localStorage.getItem(NAME_KEY);
      if (n) {
        setName(n);
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setMessages(
              parsed
                .filter(
                  (m: Msg) =>
                    m &&
                    (m.role === "user" || m.role === "assistant") &&
                    typeof m.content === "string",
                )
                .slice(-24),
            );
          }
        }
      }
      setLimited(usageToday() >= DAILY_LIMIT);
    } catch {
      /* storage unavailable, start fresh */
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function enterName() {
    const n = nameInput.trim().slice(0, 40);
    if (!n) return;
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {
      /* ignore */
    }
    setName(n);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending || limited) return;
    setError(null);
    const history = [...messages, { role: "user" as const, content: message }];
    setMessages(history);
    setInput("");
    setSending(true);
    setFirstToken(false);
    let assistantAdded = false;
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages.slice(-24) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        const base = data.message || `Request failed (${res.status})`;
        throw new Error(base + (data.detail ? `, ${data.detail}` : ""));
      }

      // Same-origin SSE: {"delta"} chunks build the reply live, {"done"} ends
      // the stream. A streamed message is added once and mutated in place.
      assistantAdded = true;
      setMessages((prev) => [...prev, { role: "assistant" as const, content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamError: string | null = null;
      let finished = false;
      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim()) as {
              delta?: string;
              error?: string;
              done?: boolean;
            };
            if (typeof evt.delta === "string" && evt.delta) {
              full += evt.delta;
              setFirstToken(true);
              setMessages((prev) => {
                const next = [...prev];
                const last = next.length - 1;
                if (next[last]?.role === "assistant") {
                  next[last] = { role: "assistant", content: full };
                }
                return next;
              });
            } else if (evt.error) {
              streamError = String(evt.error);
            } else if (evt.done) {
              finished = true;
            }
          } catch {
            /* partial event — the next read completes it */
          }
        }
      }
      if (streamError) throw new Error(streamError);

      const finalHistory = [
        ...history,
        { role: "assistant" as const, content: full.trim() || "…" },
      ];
      setMessages(finalHistory);
      try {
        const next = usageToday() + 1;
        localStorage.setItem(
          USAGE_KEY,
          JSON.stringify({ date: todayKey(), count: next }),
        );
        localStorage.setItem(HISTORY_KEY, JSON.stringify(finalHistory.slice(-50)));
        if (next >= DAILY_LIMIT) setLimited(true);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        if (assistantAdded && next[next.length - 1]?.role === "assistant") next.pop();
        if (next[next.length - 1]?.role === "user") next.pop();
        return next;
      });
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSending(false);
      setFirstToken(false);
    }
  }

  function eraseData() {
    try {
      localStorage.removeItem(NAME_KEY);
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(USAGE_KEY);
    } catch {
      /* ignore */
    }
    setMessages([]);
    setName(null);
    setNameInput("");
    setLimited(false);
    setFirstToken(false);
    setError(null);
    setEraseOpen(false);
  }

  if (!mounted) {
    return variant === "widget" ? (
      <div className="h-full" />
    ) : (
      <div className="mx-auto max-w-3xl px-5 py-16" />
    );
  }

  // ── Name gate ──
  if (!name) {
    return (
      <div
        className={
          variant === "widget"
            ? "flex h-full items-center justify-center p-5"
            : "flex h-[calc(100vh-72px)] items-center justify-center overflow-hidden px-5 py-16"
        }
      >
        <div className="w-full max-w-sm animate-fade-in-up rounded-2xl border border-border/80 bg-card/50 p-7 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
          <img
            src="/favicon.webp"
            alt="Ashish Gupta logo"
            width={48}
            height={48}
            className="mx-auto h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
          />
          {variant === "widget" ? (
            <h2 className="mt-5 text-center font-display text-xl font-bold tracking-tight">
              What should I call you?
            </h2>
          ) : (
            <h1 className="mt-5 text-center font-display text-2xl font-bold tracking-tight">
              What should I call you?
            </h1>
          )}
          <p className="mx-auto mt-2 max-w-[17rem] text-center text-sm leading-relaxed text-muted-foreground">
            Just a nickname is fine. Your name and this conversation stay in
            your browser — nothing is stored on a server.
          </p>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              enterName();
            }}
          >
            <Input
              id="chat-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={40}
              autoFocus
              className="h-11 flex-1 rounded-xl"
            />
            <Button
              type="submit"
              disabled={!nameInput.trim()}
              className="h-11 rounded-xl px-5"
            >
              Let&apos;s go
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const sentCount = messages.filter((m) => m.role === "user").length;

  // ── Chat view: full-height app, messages scroll internally ──
  return (
    <div
      className={
        variant === "widget"
          ? "flex h-full flex-col overflow-hidden"
          : "flex h-[calc(100vh-72px)] flex-col overflow-hidden px-5 py-8"
      }
    >
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {variant === "widget" ? (
              <h2 className="font-display text-base font-semibold leading-snug tracking-tight">
                Hey {name} — what are you curious about?
              </h2>
            ) : (
              <h1 className="font-display text-xl font-bold tracking-tight">
                Hey {name} — what are you curious about?
              </h1>
            )}
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span className="truncate">online · replies instantly</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEraseOpen(true)}
            aria-label="Clear chat"
            title="Clear chat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className={cn(
            "chat-scroll min-h-0 flex-1 space-y-5 overflow-y-auto pr-1",
            variant === "widget" ? "mt-4" : "mt-6",
          )}
        >
          {messages.length === 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Not sure where to start?
              </p>
              <div className="mt-3 overflow-hidden rounded-xl border border-border/80">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={sending || limited}
                    className="group flex w-full items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-left text-sm text-muted-foreground transition last:border-b-0 hover:bg-white/[0.04] hover:text-foreground disabled:opacity-50"
                  >
                    <span>{s}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm leading-relaxed">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex max-w-[92%] items-start gap-2.5">
                  <img
                    src="/favicon.webp"
                    alt=""
                    width={20}
                    height={20}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <Markdown>{m.content}</Markdown>
                  </div>
                </div>
              ),
            )
          )}

          {sending && !firstToken ? (
            <div
              className="flex items-center gap-1.5"
              aria-label="AI is typing"
              role="status"
            >
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/70"
                  style={{ animationDelay: `${d * 160}ms` }}
                />
              ))}
            </div>
          ) : null}
          {sending && firstToken ? (
            <span
              className="inline-block h-3.5 w-[2px] animate-pulse rounded-full bg-primary/80 align-middle"
              aria-hidden="true"
            />
          ) : null}

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          {limited ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Daily limit of {DAILY_LIMIT} messages reached. The counter
              resets tomorrow.
            </div>
          ) : null}
        </div>

        {/* Composer */}
        <div className="mt-4">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2 transition-colors focus-within:border-white/25">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={
                variant === "widget"
                  ? "Type a message…"
                  : "Type your question…"
              }
              rows={1}
              maxLength={1000}
              className="max-h-32 min-h-[44px] flex-1 resize-none border-none bg-transparent px-2.5 py-2.5 text-sm shadow-none focus-visible:ring-0"
              disabled={limited}
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || sending || limited}
              className="h-11 w-11 shrink-0 rounded-xl p-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p
            className={cn(
              "mt-2 text-center text-[11px]",
              limited ? "text-warning" : "text-muted-foreground",
            )}
          >
            {limited
              ? "Daily limit reached — resets tomorrow"
              : `${sentCount}/30 today · stays on your device`}
          </p>
        </div>
      </div>

      <Dialog open={eraseOpen} onOpenChange={setEraseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear this chat?</DialogTitle>
            <DialogDescription>
              This removes your name, chat history and usage counters from this
              browser. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEraseOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={eraseData}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

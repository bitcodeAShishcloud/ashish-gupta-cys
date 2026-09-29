"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cpu,
  Send,
  Sparkles,
  Terminal,
  Trash2,
  User,
} from "lucide-react";
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
  "Tell me about Ashish",
  "What can you do?",
  "Cybersecurity tips for beginners",
  "Explain a recent project of Ashish",
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
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [limited, setLimited] = useState(false);
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
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages.slice(-24) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const base = data.message || `Request failed (${res.status})`;
        throw new Error(base + (data.detail ? `, ${data.detail}` : ""));
      }
      const reply: string = String(data.reply || "").trim() || "…";
      const finalHistory = [...history, { role: "assistant" as const, content: reply }];
      setMessages(finalHistory);
      if (data.model || data.provider) {
        setModelInfo(`${data.model || ""}${data.provider ? ` @ ${data.provider}` : ""}`.trim());
      }
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
      setMessages((prev) => prev.slice(0, -1)); // drop the pending user msg
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSending(false);
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
    setModelInfo(null);
    setLimited(false);
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
            ? "flex h-full items-center justify-center p-4"
            : "flex h-[calc(100vh-72px)] items-center justify-center overflow-hidden px-5 py-16"
        }
      >
      <div
        className={cn(
          "grad-card w-full max-w-md rounded-xl text-center animate-fade-in-up",
          variant === "widget" ? "p-6" : "p-8",
        )}
      >
        <img
          src="/favicon.webp"
          alt="Ashish Gupta logo"
          width={56}
          height={56}
          className="mx-auto h-14 w-14 rounded-full object-cover shadow-[0_0_24px_hsl(0_0%_100%/0.2)]"
        />
          <p className="section-label mt-5 font-mono text-xs uppercase tracking-widest text-primary">
            {"identity check"}
          </p>
          {variant === "widget" ? (
            <h2 className="mt-2 text-xl font-bold">Who are you?</h2>
          ) : (
            <h1 className="mt-2 text-2xl font-bold">Who are you?</h1>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Tell me your name to start the conversation. Nothing is stored on a
            server, your chat lives only in this browser.
          </p>
          <div className="mt-6 flex gap-2">
            <Input
              id="chat-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enterName()}
              placeholder="Your name…"
              maxLength={40}
              autoFocus
            />
            <Button onClick={enterName} disabled={!nameInput.trim()}>
              <User className="mr-2 h-4 w-4" />
              Start
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-label font-mono text-xs uppercase tracking-widest text-primary">
              {"secureai"}
            </p>
            {variant === "widget" ? (
              <h2 className="mt-0.5 text-base font-semibold leading-snug">
                Hi {name}, what do you want to know?
              </h2>
            ) : (
              <h1 className="mt-0.5 text-xl font-bold">
                Hi {name}, what do you want to know?
              </h1>
            )}
            {modelInfo ? (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary">
                <Cpu className="h-3 w-3" /> {modelInfo}
              </span>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEraseOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Erase data
          </Button>
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
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="grad-btn flex h-9 w-9 items-center justify-center rounded-lg font-mono text-sm font-bold text-[#05070A] shadow-[0_0_14px_hsl(0_0%_100%/0.3)]">
                    &gt;_
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ask me about Ashish&apos;s skills, projects, blog or
                    anything in cybersecurity.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={sending || limited}
                    className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary transition hover:bg-primary/15 disabled:opacity-50"
                  >
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-white/15 bg-white/10 px-4 py-3 text-sm text-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-3">
                  <div className="grad-btn mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold text-[#05070A] shadow-[0_0_12px_hsl(0_0%_100%/0.25)]">
                    &gt;_
                  </div>
                  <div className="markdown-body glass w-fit max-w-[85%] rounded-2xl rounded-tl-sm border border-border/60 px-4 py-3 text-sm">
                    <Markdown>{m.content}</Markdown>
                  </div>
                </div>
              ),
            )
          )}

          {sending ? (
            <div className="flex items-center gap-3">
              <div className="grad-btn flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold text-[#05070A] shadow-[0_0_12px_hsl(0_0%_100%/0.25)]">
                &gt;_
              </div>
              <div className="glass flex items-center gap-1 rounded-2xl rounded-tl-sm px-4 py-3.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          {limited ? (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              Daily limit of {DAILY_LIMIT} messages reached. The counter
              resets tomorrow.
            </div>
          ) : null}
        </div>

        {/* Composer */}
        <div className="mt-4">
          <div className="glass flex items-end gap-2 rounded-2xl border border-border/60 p-2.5">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              rows={1}
              maxLength={1000}
              className="max-h-32 min-h-[44px] flex-1 resize-none border-none bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
              disabled={limited}
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || sending || limited}
              className="h-11 w-11 shrink-0 rounded-xl p-0 animate-glow"
              aria-label="Send message"
            >
              {sending ? <Terminal className="h-5 w-5 animate-pulse" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <p className={cn("mt-2 text-center font-mono text-[11px]", limited ? "text-warning" : "text-muted-foreground")}>
            {limited
              ? "Daily limit reached"
              : `${messages.filter((m) => m.role === "user").length} sent today · limit ${DAILY_LIMIT} · data stays in your browser`}
          </p>
        </div>
      </div>

      <Dialog open={eraseOpen} onOpenChange={setEraseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erase all local data?</DialogTitle>
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
              <Trash2 className="mr-2 h-4 w-4" /> Erase data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

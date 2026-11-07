"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Check,
  Cpu,
  Download,
  Image as ImageIcon,
  ImagePlus,
  MessageSquare,
  Monitor,
  Palette,
  Send,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
const IMAGE_HISTORY_KEY = "chat_image_history_v1";
const USAGE_KEY = "chat_usage";
const DAILY_LIMIT = 50;

interface Msg {
  role: "user" | "assistant";
  content: string;
  /** "image" messages carry the generated picture + settings. URL images
   * persist in history; the jobId enables same-origin downloads. */
  kind?: "text" | "image";
  image?: string;
  jobId?: string;
  meta?: { prompt: string; aspect: string; style: string; tier?: string; revisedPrompt?: string };
}

const SUGGESTIONS = [
  { icon: User, text: "What is Ashish good at?" },
  { icon: Cpu, text: "How was Poppit AI built?" },
  { icon: ShieldCheck, text: "How do I get started in cybersecurity?" },
  { icon: BadgeCheck, text: "Which certifications does Ashish have?" },
];

const IMAGE_SUGGESTIONS = [
  { icon: Monitor, text: "A hacker's desk at night, terminal glow" },
  { icon: ImageIcon, text: "A red fox in a snowy forest" },
  { icon: Palette, text: "A neon city skyline after rain" },
  { icon: Bot, text: "A robot detective's office" },
];

const ASPECTS = [
  { id: "9:16", size: "1024 × 1792", box: "h-3.5 w-2" },
  { id: "3:4", size: "1024 × 1536", box: "h-3.5 w-2.5" },
  { id: "2:3", size: "832 × 1248", box: "h-3.5 w-2.5" },
  { id: "1:1", size: "1024 × 1024", box: "h-3 w-3" },
  { id: "4:3", size: "1536 × 1024", box: "h-2.5 w-3.5" },
  { id: "3:2", size: "1248 × 832", box: "h-2.5 w-3.5" },
  { id: "16:9", size: "1792 × 1024", box: "h-2 w-3.5" },
  { id: "21:9", size: "1568 × 672", box: "h-1.5 w-3.5" },
] as const;

const TIERS = [
  { id: "1K", hint: "fast · standard" },
  { id: "2K", hint: "sharper · slower" },
  { id: "4K", hint: "sharpest · slowest" },
] as const;

const STYLES = [
  { name: "Auto", preview: "/style-previews/auto.webp" },
  { name: "Photo", preview: "/style-previews/photo.webp" },
  { name: "Anime", preview: "/style-previews/anime.webp" },
  { name: "3D", preview: "/style-previews/3d.webp" },
  { name: "Oil paint", preview: "/style-previews/oil-paint.webp" },
  { name: "Watercolor", preview: "/style-previews/watercolor.webp" },
  { name: "Pixel art", preview: "/style-previews/pixel-art.webp" },
  { name: "Minimal", preview: "/style-previews/minimal.webp" },
];

/* Fixed render box for an image/generating card, shaped by the aspect ratio
 * (long side capped so 9:16 stays a tall card instead of eating the page). */
function aspectBox(aspect: string, variant: "page" | "widget") {
  const [rw, rh] = aspect.split(":").map(Number);
  const long = variant === "widget" ? 250 : 340;
  const s = long / Math.max(rw || 1, rh || 1);
  return { width: Math.round(rw * s), height: Math.round(rh * s) };
}

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

/* Provider CDN URLs are small and survive reloads — keep them in history.
 * Only inline base64 payloads (~1MB+) get stripped to avoid choking
 * localStorage. */
function persistable(msgs: Msg[]): Msg[] {
  return msgs.map((m) =>
    m.kind === "image" && m.image && m.image.startsWith("data:")
      ? { role: m.role, content: m.content, kind: "image" as const, meta: m.meta }
      : m,
  );
}

export function ChatPanel({
  variant = "page",
}: {
  variant?: "page" | "widget";
}) {
  const [name, setName] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Msg[]>([]);
  const [imageHistory, setImageHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [limited, setLimited] = useState(false);
  const [firstToken, setFirstToken] = useState(false);
  const [mode, setMode] = useState<"chat" | "image">("chat");
  const [aspect, setAspect] = useState<string>("16:9");
  const [imgStyle, setImgStyle] = useState<string>("Auto");
  const [imgTier, setImgTier] = useState<string>("1K");
  const [refImages, setRefImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = useState(false);
  const [openPanel, setOpenPanel] = useState<"aspect" | "style" | "tier" | null>(null);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load name + histories once, on the client only. The old shared history
  // key is split: image entries move to the image history, the rest stay chat.
  useEffect(() => {
    try {
      const n = localStorage.getItem(NAME_KEY);
      if (n) {
        setName(n);
        const valid = (m: Msg) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string";
        const rawChat = localStorage.getItem(HISTORY_KEY);
        if (rawChat) {
          const parsed = JSON.parse(rawChat);
          if (Array.isArray(parsed)) {
            const all = parsed.filter(valid);
            const imgs = all.filter((m: Msg) => m.kind === "image");
            setChatHistory(all.filter((m: Msg) => m.kind !== "image").slice(-24));
            if (imgs.length) setImageHistory(imgs.slice(-24));
          }
        }
        const rawImg = localStorage.getItem(IMAGE_HISTORY_KEY);
        if (rawImg) {
          const parsed = JSON.parse(rawImg);
          if (Array.isArray(parsed)) {
            setImageHistory(parsed.filter(valid).slice(-24));
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
  }, [chatHistory, imageHistory, sending, generating, mode]);

  // Close picker popovers when clicking outside the composer.
  useEffect(() => {
    if (!openPanel) return;
    const onDown = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openPanel]);

  /* The provider job API reports no percentage — ease toward 90% while
   * polling so the bar moves smoothly, and it's replaced by "done" state
   * the moment the response lands. */
  useEffect(() => {
    if (!generating) return;
    setProgress((p) => (p === 0 ? 1 : p));
    const t = setInterval(() => {
      setProgress((p) => (p < 90 ? Math.min(90, p + Math.max(0.2, (90 - p) * 0.015)) : p));
    }, 200);
    return () => clearInterval(t);
  }, [generating]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending || generating || limited) return;
    setError(null);
    const history = [...chatHistory, { role: "user" as const, content: message }];
    setChatHistory(history);
    setInput("");
    setSending(true);
    setFirstToken(false);
    let assistantAdded = false;
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: chatHistory.slice(-24) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        const base = data.message || `Request failed (${res.status})`;
        throw new Error(base + (data.detail ? `, ${data.detail}` : ""));
      }

      // Same-origin SSE: {"delta"} chunks build the reply live, {"done"} ends
      // the stream. A streamed message is added once and mutated in place.
      assistantAdded = true;
      setChatHistory((prev) => [...prev, { role: "assistant" as const, content: "" }]);
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
              setChatHistory((prev) => {
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
      setChatHistory(finalHistory);
      try {
        const next = usageToday() + 1;
        localStorage.setItem(
          USAGE_KEY,
          JSON.stringify({ date: todayKey(), count: next }),
        );
        localStorage.setItem(HISTORY_KEY, JSON.stringify(persistable(finalHistory).slice(-50)));
        if (next >= DAILY_LIMIT) setLimited(true);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setChatHistory((prev) => {
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

  /* Client-side reference-image resize: ≤1024px long edge, JPEG q0.85 —
   * keeps the JSON body (and Vercel's 4.5MB request cap) comfortably small. */
  async function addRefImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = 3 - refImages.length;
    if (room <= 0) return;
    const picked = Array.from(files).slice(0, room);
    const results: string[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("read failed"));
          reader.readAsDataURL(file);
        });
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("decode failed"));
          el.src = dataUrl;
        });
        const long = Math.max(img.naturalWidth, img.naturalHeight);
        const scale = long > 1024 ? 1024 / long : 1;
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        results.push(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        /* skip unreadable file */
      }
    }
    if (results.length > 0) setRefImages((prev) => [...prev, ...results].slice(0, 3));
  }

  async function generate() {
    const prompt = input.trim();
    if (!prompt || generating || sending || limited) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: prompt };
    const history = [...imageHistory, userMsg];
    setImageHistory(history);
    setInput("");
    setGenerating(true);
    setProgress(0);
    const meta = { prompt, aspect, style: imgStyle, tier: imgTier };
    const refs = refImages;
    setRefImages([]);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspect,
          style: imgStyle,
          tier: imgTier,
          images: refs,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.image !== "string" || !data.image) {
        const base = data.message || `Request failed (${res.status})`;
        throw new Error(base + (data.detail ? `, ${data.detail}` : ""));
      }
      const revised =
        typeof data.revisedPrompt === "string" && data.revisedPrompt.trim()
          ? data.revisedPrompt.trim()
          : undefined;
      const imgMsg: Msg = {
        role: "assistant",
        content: "",
        kind: "image",
        image: data.image,
        jobId: typeof data.jobId === "string" && data.jobId ? data.jobId : undefined,
        meta: { ...meta, revisedPrompt: revised },
      };
      const finalHistory = [...history, imgMsg];
      setImageHistory(finalHistory);
      try {
        const next = usageToday() + 1;
        localStorage.setItem(USAGE_KEY, JSON.stringify({ date: todayKey(), count: next }));
        localStorage.setItem(IMAGE_HISTORY_KEY, JSON.stringify(persistable(finalHistory).slice(-50)));
        if (next >= DAILY_LIMIT) setLimited(true);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setImageHistory((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.role === "user") next.pop();
        return next;
      });
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  function eraseData() {
    try {
      localStorage.removeItem(NAME_KEY);
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(IMAGE_HISTORY_KEY);
      localStorage.removeItem(USAGE_KEY);
    } catch {
      /* ignore */
    }
    setChatHistory([]);
    setImageHistory([]);
    setName(null);
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

  // ── Chat view: full-height app, messages scroll internally ──
  // Phase 6: no name gate — visitors land straight in the chat. A stored
  // name (returning visitor) is still used in the greetings when present.
  const visible = mode === "chat" ? chatHistory : imageHistory;

  // ── Chat view: full-height app, messages scroll internally ──
  return (
    <div
      className={
        variant === "widget"
          ? "flex h-full flex-col overflow-hidden"
          : "flex h-[calc(100vh-56px)] flex-col overflow-hidden px-5 py-6"
      }
    >
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col">
        {/* Top chrome: greeting rides in the hero when the thread is empty */}
        <div className="flex min-h-9 items-start justify-between gap-3">
          {visible.length > 0 ? (
            <div className="min-w-0">
              {variant === "widget" ? (
                <h2 className="font-display text-base font-semibold leading-snug tracking-tight">
                  Hey{name ? ` ${name}` : ""} — what are you curious about?
                </h2>
              ) : (
                <h1 className="font-display text-xl font-bold tracking-tight">
                  Hey{name ? ` ${name}` : ""} — what are you curious about?
                </h1>
              )}
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                <span className="truncate">online · replies instantly</span>
              </p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setEraseOpen(true)}
            aria-label="Clear chat"
            title="Clear chat"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/5 hover:text-foreground",
              visible.length === 0 && "ml-auto",
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Mode switch */}
        <div className="mt-3 flex justify-center">
          <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setMode("chat")}
              aria-pressed={mode === "chat"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition",
                mode === "chat"
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => setMode("image")}
              aria-pressed={mode === "image"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition",
                mode === "image"
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Image
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className={cn(
            "chat-scroll min-h-0 flex-1 space-y-5 overflow-y-auto pr-1",
            variant === "widget" ? "mt-4" : "mt-6",
          )}
        >
          {visible.length === 0 ? (
            <div className="flex min-h-full flex-col">
              {/* Sorin-style hero: glowing orb + accented greeting */}
              <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
                <div className="relative mb-6 h-20 w-20">
                  <div
                    className="absolute inset-0 rounded-full bg-primary/30 blur-2xl"
                    aria-hidden
                  />
                  <img
                    src="/favicon.webp"
                    alt=""
                    width={80}
                    height={80}
                    className="relative h-20 w-20 rounded-full object-cover ring-1 ring-white/10 shadow-[0_0_45px_hsl(var(--primary)/0.45)]"
                  />
                </div>
                {variant === "widget" ? (
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    {name ? (
                      <>
                        Hey, I&apos;m <span className="text-primary">{name}</span>.
                        How can I help you today?
                      </>
                    ) : (
                      <>Hi — how can I help you today?</>
                    )}
                  </h2>
                ) : (
                  <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {name ? (
                      <>
                        Hey, I&apos;m <span className="text-primary">{name}</span>.
                        How can I help you today?
                      </>
                    ) : (
                      <>Hi — how can I help you today?</>
                    )}
                  </h1>
                )}
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  online · replies instantly
                </p>
              </div>
              {(error || limited) ? (
                <div className="space-y-2 pb-3">
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
              ) : null}
              {/* Capability pills, Dribbble-reference style */}
              <div className="flex flex-wrap items-center justify-center gap-2 pb-3">
                {(mode === "chat" ? SUGGESTIONS : IMAGE_SUGGESTIONS).map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() =>
                      mode === "chat"
                        ? send(s.text)
                        : (setInput(s.text), textareaRef.current?.focus())
                    }
                    disabled={sending || generating || limited}
                    className="group flex items-center gap-1.5 rounded-full border border-border/70 bg-card/40 px-3.5 py-2 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-50"
                  >
                    <s.icon className="h-3.5 w-3.5 opacity-70 transition group-hover:text-primary" />
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            visible.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-white/[0.07] px-4 py-2.5 text-sm leading-relaxed">
                    {m.content}
                  </div>
                </div>
              ) : m.kind === "image" ? (
                <div key={i} className="flex max-w-[92%] items-start gap-2.5">
                  <img
                    src="/favicon.webp"
                    alt=""
                    width={20}
                    height={20}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <figure
                      className="relative inline-block overflow-hidden rounded-xl border border-border/80 bg-card/40 align-top"
                      style={aspectBox(m.meta?.aspect || "1:1", variant)}
                    >
                      {m.image ? (
                        <img
                          src={m.image}
                          alt={m.meta?.prompt || "Generated image"}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full animate-fade-in object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground">
                          Image not saved on reload — regenerate to see it again
                        </div>
                      )}
                      <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2.5 pb-2 pt-7">
                        <span className="truncate text-[11px] text-white/75">
                          {m.meta?.prompt} · {m.meta?.aspect}
                          {m.meta?.tier && m.meta.tier !== "1K" ? ` · ${m.meta.tier}` : ""}
                          {m.meta?.style && m.meta.style !== "Auto" ? ` · ${m.meta.style}` : ""}
                        </span>
                        {m.image ? (
                          <a
                            // Job-based providers download via the same-origin
                            // proxy; data-URL images (b64) download natively;
                            // plain CDN URLs open in a new tab.
                            href={
                              m.jobId
                                ? `/api/image/download?id=${encodeURIComponent(m.jobId)}`
                                : m.image
                            }
                            {...(m.jobId
                              ? {}
                              : m.image.startsWith("data:")
                                ? {}
                                : { target: "_blank", rel: "noopener noreferrer" })}
                            download={
                              m.jobId
                                ? `ashish-image-${m.jobId}.png`
                                : m.image.startsWith("data:")
                                  ? "ashish-image.png"
                                  : undefined
                            }
                            aria-label="Download image"
                            className="shrink-0 text-white/70 transition hover:text-white"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </figcaption>
                    </figure>
                    {m.meta?.revisedPrompt ? (
                      <p className="mt-1 line-clamp-2 font-mono text-[10px] leading-4 text-muted-foreground">
                        → {m.meta.revisedPrompt}
                      </p>
                    ) : null}
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

          {generating ? (
            <div
              className="flex max-w-[92%] items-start gap-2.5"
              role="status"
              aria-label="Generating image"
            >
              <img
                src="/favicon.webp"
                alt=""
                width={20}
                height={20}
                className="mt-0.5 h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/10"
              />
              <div
                className="relative overflow-hidden rounded-xl border border-border/80 bg-card/40"
                style={aspectBox(aspect, variant)}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 animate-pulse text-muted-foreground/30" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Generating image… · usually a few seconds</span>
                    <span className="font-mono tabular-nums">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-success transition-[width] duration-200 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
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
          <div ref={composerRef} className="relative">
            {openPanel === "aspect" ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border border-border/80 bg-background p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Aspect ratio</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ASPECTS.find((a) => a.id === aspect)?.size}
                  </p>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setAspect(a.id);
                        setOpenPanel(null);
                      }}
                      aria-pressed={aspect === a.id}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-1 py-2 transition",
                        aspect === a.id
                          ? "border-success/70 bg-success/5 text-success"
                          : "border-border/60 text-muted-foreground hover:border-white/25 hover:text-foreground",
                      )}
                    >
                      <span className={cn("inline-block rounded-[3px] border-2 border-current", a.box)} />
                      <span className="text-[10px] leading-none">{a.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {openPanel === "tier" ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-border/80 bg-background p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Resolution</p>
                  <p className="text-[11px] text-muted-foreground">
                    {TIERS.find((t) => t.id === imgTier)?.hint}
                  </p>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {TIERS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setImgTier(t.id);
                        setOpenPanel(null);
                      }}
                      aria-pressed={imgTier === t.id}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-2 text-center transition",
                        imgTier === t.id
                          ? "border-success/70 bg-success/5 text-success"
                          : "border-border/60 text-muted-foreground hover:border-white/25 hover:text-foreground",
                      )}
                    >
                      <span className="block text-xs font-medium">{t.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {openPanel === "style" ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-80 rounded-xl border border-border/80 bg-background p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Style</p>
                  <p className="text-[11px] text-muted-foreground">{imgStyle}</p>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {STYLES.map((s) => {
                    const selected = imgStyle === s.name;
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => {
                          setImgStyle(s.name);
                          setOpenPanel(null);
                        }}
                        aria-pressed={selected}
                        className={cn(
                          "group relative overflow-hidden rounded-lg border transition",
                          selected
                            ? "border-success ring-1 ring-success/50"
                            : "border-border/60 hover:border-white/25",
                        )}
                      >
                        <img
                          src={s.preview}
                          alt={s.name + " style preview"}
                          className="aspect-square w-full object-cover"
                          draggable={false}
                        />
                        {selected ? (
                          <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-success text-[#05070A]">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "block py-1 text-center text-[10px] leading-none",
                            selected ? "text-success" : "text-muted-foreground",
                          )}
                        >
                          {s.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {mode === "chat" ? (
              <div className="flex items-end gap-2 rounded-[28px] border border-primary/20 bg-primary/[0.03] p-2 shadow-[0_0_60px_hsl(var(--primary)/0.10),0_10px_40px_rgba(0,0,0,0.4)] transition-colors focus-within:border-primary/40">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={
                    variant === "widget" ? "Type a message…" : "Type your question…"
                  }
                  rows={1}
                  maxLength={1000}
                  className="max-h-32 min-h-[44px] flex-1 resize-none border-none bg-transparent px-2.5 py-2.5 text-sm shadow-none focus-visible:ring-0"
                  disabled={limited}
                />
                <Button
                  onClick={() => send(input)}
                  disabled={!input.trim() || sending || generating || limited}
                  className="h-8 shrink-0 self-end gap-1 rounded-full px-3.5"
                  aria-label="Send message"
                >
                  <span className="text-xs font-medium">Send</span>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="rounded-[28px] border border-primary/20 bg-primary/[0.03] p-2 shadow-[0_0_60px_hsl(var(--primary)/0.10),0_10px_40px_rgba(0,0,0,0.4)] transition-colors focus-within:border-primary/40">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      generate();
                    }
                  }}
                  placeholder="Describe the image you want…"
                  rows={1}
                  maxLength={1000}
                  className="max-h-32 min-h-[44px] flex-1 resize-none border-none bg-transparent px-2.5 py-2.5 text-sm shadow-none focus-visible:ring-0"
                  disabled={limited}
                />
                <div className="flex items-center gap-1.5 px-1 pt-1">
                  {refImages.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 pr-1">
                      {refImages.map((src, i) => (
                        <span
                          key={i}
                          className="relative inline-block h-8 w-8 overflow-hidden rounded-md border border-border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setRefImages((prev) => prev.filter((_, j) => j !== i))}
                            aria-label={`Remove reference image ${i + 1}`}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-white opacity-0 transition hover:opacity-100"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setOpenPanel(openPanel === "aspect" ? null : "aspect")}
                    aria-expanded={openPanel === "aspect"}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition",
                      openPanel === "aspect" || aspect !== "16:9"
                        ? "border-success/60 bg-success/5 text-success"
                        : "border-border/60 text-muted-foreground hover:border-white/25 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block rounded-[2px] border-[1.5px] border-current",
                        ASPECTS.find((a) => a.id === aspect)?.box,
                      )}
                    />
                    {aspect}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenPanel(openPanel === "style" ? null : "style")}
                    aria-expanded={openPanel === "style"}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition",
                      openPanel === "style" || imgStyle !== "Auto"
                        ? "border-success/60 bg-success/5 text-success"
                        : "border-border/60 text-muted-foreground hover:border-white/25 hover:text-foreground",
                    )}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {imgStyle}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenPanel(openPanel === "tier" ? null : "tier")}
                    aria-expanded={openPanel === "tier"}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition",
                      openPanel === "tier" || imgTier !== "1K"
                        ? "border-success/60 bg-success/5 text-success"
                        : "border-border/60 text-muted-foreground hover:border-white/25 hover:text-foreground",
                    )}
                  >
                    {imgTier}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addRefImages(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={refImages.length >= 3}
                    aria-label="Add reference images (up to 3)"
                    title="Add reference images (up to 3)"
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition",
                      refImages.length > 0
                        ? "border-success/60 bg-success/5 text-success"
                        : "border-border/60 text-muted-foreground hover:border-white/25 hover:text-foreground",
                      refImages.length >= 3 && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    {refImages.length > 0 ? `Ref ${refImages.length}/3` : "Ref"}
                  </button>
                  <span className="ml-auto hidden pr-1 text-[10px] text-muted-foreground lg:block">
                    Enter to generate · Shift + Enter for a new line
                  </span>
                  <button
                    type="button"
                    onClick={() => generate()}
                    disabled={!input.trim() || generating || sending || limited}
                    aria-label="Generate image"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-[#05070A] transition hover:brightness-110 disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          <p
            className={cn(
              "mt-2 text-center text-[11px]",
              limited ? "text-warning" : "text-muted-foreground",
            )}
          >
            {limited
              ? "Daily limit reached — resets tomorrow"
              : `${usageToday()}/${DAILY_LIMIT} today · stays on your device`}
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  MessageSquare,
  Monitor,
  Palette,
  Pencil,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  User,
  Video as VideoIcon,
  X,
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
import { ChatControls } from "@/components/chat-controls";
import { MessageActions } from "@/components/message-actions";
import { CommandPalette, type CommandItem } from "@/components/command-palette";
import { loadTypography, fontCss, type TypographySettings } from "@/lib/typography";
import { conversationToMarkdown, copyToClipboard, downloadBlob } from "@/lib/export-formats";
import { detectMail, stripControlMarkers } from "@/lib/mail";
import { cn } from "@/lib/utils";

const NAME_KEY = "chat_user_name";
const HISTORY_KEY = "chat_history_v1";
const IMAGE_HISTORY_KEY = "chat_image_history_v1";
const VIDEO_HISTORY_KEY = "chat_video_history_v1";
const USAGE_KEY = "chat_usage";
const DAILY_LIMIT = 50;

interface Msg {
  role: "user" | "assistant";
  content: string;
  /** "image" messages carry the generated picture + settings. URL images
   * persist in history; the jobId enables same-origin downloads. "video"
   * messages hold an async task: jobId polls via /api/video until the
   * finished MP4 URL lands in videoUrl (or failed is set). */
  kind?: "text" | "image" | "video";
  image?: string;
  videoUrl?: string;
  failed?: boolean;
  progress?: number;
  jobId?: string;
  meta?: {
    prompt: string;
    aspect: string;
    style?: string;
    tier?: string;
    seconds?: string;
    revisedPrompt?: string;
    /** Video tasks: creation timestamp — powers the 30-minute poll deadline. */
    createdAt?: number;
  };
  /** Phase 8: true when the reply is an email/draft — drives the Send bar. */
  mail?: boolean;
  /** Phase 9: research sources for this reply (web search results). */
  sources?: { title: string; url: string }[];
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

const VIDEO_SUGGESTIONS = [
  { icon: Monitor, text: "Slow pan over a neon city skyline at night" },
  { icon: ImageIcon, text: "Waves rolling on a beach at sunrise" },
  { icon: Palette, text: "Smoke curling through a shaft of light" },
  { icon: Bot, text: "A drone flight through snowy mountains" },
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

/* Video mode: the API supports 720P only, with these ratios and a 4–12s
 * duration (string seconds). */
const V_ASPECTS = [
  { id: "21:9", box: "h-1.5 w-3.5" },
  { id: "16:9", box: "h-2 w-3.5" },
  { id: "4:3", box: "h-2.5 w-3.5" },
  { id: "1:1", box: "h-3 w-3" },
  { id: "3:4", box: "h-3.5 w-2.5" },
  { id: "9:16", box: "h-3.5 w-2" },
] as const;
const V_SECONDS = ["4", "6", "8", "10", "12"] as const;

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

/* A3: autocomplete suggestions from static chips + recent user messages */
function getAutocompleteSuggestions(
  input: string,
  chatHistory: Msg[],
  imageHistory: Msg[],
  videoHistory: Msg[],
  mode: string,
): string[] {
  const q = input.trim().toLowerCase();
  if (q.length < 2) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  // Static suggestions
  const statics = mode === "chat" ? SUGGESTIONS : mode === "video" ? VIDEO_SUGGESTIONS : IMAGE_SUGGESTIONS;
  for (const s of statics) {
    if (s.text.toLowerCase().includes(q) && !seen.has(s.text)) {
      seen.add(s.text);
      out.push(s.text);
    }
  }
  // Recent user messages
  const allHist = [...chatHistory, ...imageHistory, ...videoHistory];
  for (const m of allHist) {
    if (m.role === "user" && m.content.toLowerCase().includes(q) && !seen.has(m.content)) {
      seen.add(m.content);
      out.push(m.content.slice(0, 80));
      if (out.length >= 8) break;
    }
  }
  return out.slice(0, 8);
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
  const [videoHistory, setVideoHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [limited, setLimited] = useState(false);
  const [firstToken, setFirstToken] = useState(false);
  const pendingSourcesRef = useRef<{ title: string; url: string }[]>([]);
  const [mode, setMode] = useState<"chat" | "image" | "video">("chat");
  const [aspect, setAspect] = useState<string>("16:9");
  const [imgStyle, setImgStyle] = useState<string>("Auto");
  const [imgTier, setImgTier] = useState<string>("1K");
  const [refImages, setRefImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vAspect, setVAspect] = useState<string>("16:9");
  const [vSeconds, setVSeconds] = useState<string>("5");
  /* Latest videoHistory for async callbacks — the poll handler reads this
   * ref instead of closing over state, so persistence and the usage counter
   * run OUTSIDE the setState updater (side effects in updaters re-run on
   * every replay, which double-counted the daily limit). */
  const videoHistoryRef = useRef<Msg[]>([]);
  const [generating, setGenerating] = useState(false);
  const [openPanel, setOpenPanel] = useState<
    "aspect" | "style" | "tier" | "vAspect" | "vSeconds" | null
  >(null);
  const [progress, setProgress] = useState(0);
  const [lightbox, setLightbox] = useState<{
    image: string;
    jobId?: string;
    meta: Msg["meta"];
  } | null>(null);
  const [editPrompt, setEditPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);
  const [typography, setTypographyState] = useState<TypographySettings>({
    fontScale: 1, fontFamily: "inter", lineHeight: 1.75, readingWidth: 768,
  });
  // A1: in-conversation search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIdx, setSearchIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // A3: autocomplete
  const [acOpen, setAcOpen] = useState(false);
  const [acItems, setAcItems] = useState<string[]>([]);
  const [acIdx, setAcIdx] = useState(0);
  // A5: command palette
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const messageRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    setMounted(true);
    setTypographyState(loadTypography());
  }, []);

  // Load name + histories once, on the client only. The old shared history
  // key is split: image entries move to the image history, the rest stay chat.
  // Histories load UNCONDITIONALLY — since the name gate was removed
  // (Phase 6), most visitors have no stored name, and gating this block on
  // the name made every anonymous conversation vanish on refresh.
  useEffect(() => {
    try {
      const n = localStorage.getItem(NAME_KEY);
      if (n) setName(n);
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
      const rawVid = localStorage.getItem(VIDEO_HISTORY_KEY);
      if (rawVid) {
        const parsed = JSON.parse(rawVid);
        if (Array.isArray(parsed)) {
          setVideoHistory(parsed.filter(valid).slice(-24));
        }
      }
      setLimited(usageToday() >= DAILY_LIMIT);
    } catch {
      /* storage unavailable, start fresh */
    }
  }, []);

  // During streaming, instant scroll (no smooth animation → no up/down jank).
  // Smooth-scroll only when not actively streaming.
  const prevCounts = useRef({ chat: 0, img: 0, vid: 0 });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew =
      chatHistory.length > prevCounts.current.chat ||
      imageHistory.length > prevCounts.current.img ||
      videoHistory.length > prevCounts.current.vid;
    prevCounts.current = { chat: chatHistory.length, img: imageHistory.length, vid: videoHistory.length };
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior =
      reduceMotion || sending || generating ? "instant" : grew ? "smooth" : "instant";
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, [chatHistory, imageHistory, videoHistory, sending, generating, mode]);

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
              type?: string;
              sources?: { title: string; url: string }[];
            };
            if (evt.type === "mail") {
              setChatHistory((prev) => {
                const next = [...prev];
                const last = next.length - 1;
                if (next[last]?.role === "assistant") {
                  next[last] = { ...next[last], mail: true };
                }
                return next;
              });
            }
            if (evt.type === "sources" && Array.isArray(evt.sources)) {
              pendingSourcesRef.current = evt.sources as { title: string; url: string }[];
            }
            if (typeof evt.delta === "string" && evt.delta) {
              full += evt.delta;
              setFirstToken(true);
              setChatHistory((prev) => {
                const next = [...prev];
                const last = next.length - 1;
                if (next[last]?.role === "assistant") {
                  next[last] = { role: "assistant", content: full, mail: next[last].mail };
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

      const mailFlag = detectMail(full);
      const sources = pendingSourcesRef.current.length > 0 ? pendingSourcesRef.current : undefined;
      pendingSourcesRef.current = [];
      const finalHistory = [
        ...history,
        { role: "assistant" as const, content: full.trim() || "…", mail: mailFlag, sources },
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

  /* Regenerate: drop the last assistant reply and re-ask the same user turn. */
  function regenerate() {
    if (sending || generating || limited) return;
    let lastUserIdx = -1;
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      if (chatHistory[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx < 0) return;
    const prompt = chatHistory[lastUserIdx].content;
    const base = chatHistory.slice(0, lastUserIdx);
    setChatHistory(base);
    void sendFrom(prompt, base);
  }

  /* Shared send core with an explicit history base (used by regenerate). */
  async function sendFrom(text: string, base: Msg[]) {
    const message = text.trim();
    if (!message || sending || generating || limited) return;
    setError(null);
    setChatHistory([...base, { role: "user" as const, content: message }]);
    setSending(true);
    setFirstToken(false);
    let assistantAdded = false;
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: base.slice(-24) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.message || `Request failed (${res.status})`) + (data.detail ? `, ${data.detail}` : ""));
      }
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
            const evt = JSON.parse(line.slice(5).trim()) as { delta?: string; error?: string; done?: boolean; type?: string; sources?: { title: string; url: string }[] };
            if (evt.type === "mail") {
              setChatHistory((prev) => {
                const next = [...prev];
                const last = next.length - 1;
                if (next[last]?.role === "assistant") next[last] = { ...next[last], mail: true };
                return next;
              });
            }
            if (evt.type === "sources" && Array.isArray(evt.sources)) {
              pendingSourcesRef.current = evt.sources as { title: string; url: string }[];
            }
            if (typeof evt.delta === "string" && evt.delta) {
              full += evt.delta;
              setFirstToken(true);
              setChatHistory((prev) => {
                const next = [...prev];
                const last = next.length - 1;
                if (next[last]?.role === "assistant") next[last] = { role: "assistant", content: full, mail: next[last].mail };
                return next;
              });
            } else if (evt.error) {
              streamError = String(evt.error);
            } else if (evt.done) {
              finished = true;
            }
          } catch { /* partial event */ }
        }
      }
      if (streamError) throw new Error(streamError);
      const mailFlag = detectMail(full);
      const sources = pendingSourcesRef.current.length > 0 ? pendingSourcesRef.current : undefined;
      pendingSourcesRef.current = [];
      const finalHistory = [...base, { role: "user" as const, content: message }, { role: "assistant" as const, content: full.trim() || "…", mail: mailFlag, sources }];
      setChatHistory(finalHistory);
    } catch (e) {
      setChatHistory(base);
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSending(false);
      setFirstToken(false);
    }
  }

  function exportConversation() {
    const md = conversationToMarkdown(chatHistory);
    void copyToClipboard(md).then((ok) => {
      if (ok) {
        downloadBlob("secureai-conversation.md", md, "text/markdown;charset=utf-8");
      }
    });
  }

  function setTypography(s: TypographySettings) {
    setTypographyState(s);
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

  /* Shared generation core — the composer and the lightbox "regenerate"
   * flow both land here. Settings are passed explicitly so a lightbox edit
   * can reuse the original image's aspect/style/tier without touching the
   * composer's picker state. */
  async function runGeneration(prompt: string, s: { aspect: string; style: string; tier: string; images: string[] }) {
    if (!prompt || generating || sending || limited) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: prompt };
    const history = [...imageHistory, userMsg];
    setImageHistory(history);
    setGenerating(true);
    setProgress(0);
    const meta = { prompt, aspect: s.aspect, style: s.style, tier: s.tier };
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspect: s.aspect,
          style: s.style,
          tier: s.tier,
          images: s.images,
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

  async function generate() {
    const prompt = input.trim();
    if (!prompt) return;
    const refs = refImages;
    setRefImages([]);
    await runGeneration(prompt, { aspect, style: imgStyle, tier: imgTier, images: refs });
    setInput("");
  }

  /* Text-to-video: creates an async task and appends a pending "video"
   * message; the poll effect below drives it to completion. Usage counts
   * once, on completion (same rule as images). */
  async function generateVideo() {
    const prompt = input.trim();
    if (!prompt || generating || sending || limited) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: prompt };
    const history = [...videoHistory, userMsg];
    setVideoHistory(history);
    setInput("");
    setGenerating(true);
    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspect: vAspect, seconds: vSeconds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.taskId !== "string" || !data.taskId) {
        const base = data.message || `Request failed (${res.status})`;
        throw new Error(base + (data.detail ? `, ${data.detail}` : ""));
      }
      const vidMsg: Msg = {
        role: "assistant",
        content: "",
        kind: "video",
        jobId: data.taskId,
        progress: 0,
        meta: { prompt, aspect: vAspect, seconds: vSeconds, createdAt: Date.now() },
      };
      setVideoHistory([...history, vidMsg]);
    } catch (e) {
      setVideoHistory((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.role === "user") next.pop();
        return next;
      });
      setError(e instanceof Error ? e.message : "Something went wrong — try again");
    } finally {
      setGenerating(false);
    }
  }

  /* Poll pending video tasks every 2.5s via the status route. Hard caps:
   * 12 consecutive failed status fetches or a 30-minute total age mark the
   * task failed, so a stuck task can never poll forever. Progress updates
   * are skipped when unchanged (no state churn), and the completion
   * bookkeeping (persist + usage count) happens in the interval handler —
   * never inside a setState updater, which re-runs on replay and
   * double-counted the daily limit. */
  const pollFailRef = useRef(0);
  useEffect(() => {
    videoHistoryRef.current = videoHistory;
  }, [videoHistory]);
  useEffect(() => {
    const hasPending = videoHistory.some(
      (m) => m.kind === "video" && m.jobId && !m.videoUrl && !m.failed,
    );
    if (!hasPending) {
      pollFailRef.current = 0;
      return;
    }
    const tick = async () => {
      const pending = videoHistoryRef.current.find(
        (m) => m.kind === "video" && m.jobId && !m.videoUrl && !m.failed,
      );
      const jobId = pending?.jobId as string | undefined;
      if (!jobId) return; // pending list changed between ticks
      const createdAt = Number(pending?.meta?.createdAt) || 0;
      if (createdAt && Date.now() - createdAt > 30 * 60 * 1000) {
        setVideoHistory((prev) =>
          prev.map((m) =>
            m.kind === "video" && m.jobId === jobId ? { ...m, failed: true } : m,
          ),
        );
        return;
      }
      try {
        const res = await fetch(`/api/video?id=${encodeURIComponent(jobId)}`);
        if (!res.ok) {
          pollFailRef.current += 1;
          if (pollFailRef.current >= 12) {
            pollFailRef.current = 0;
            setVideoHistory((prev) =>
              prev.map((m) =>
                m.kind === "video" && m.jobId === jobId ? { ...m, failed: true } : m,
              ),
            );
          }
          return; // next tick retries; no state churn on failure
        }
        const d = await res.json().catch(() => ({}));
        if (d.status === "completed" && typeof d.url === "string" && d.url) {
          pollFailRef.current = 0;
          const next = videoHistoryRef.current.map((m) =>
            m.kind === "video" && m.jobId === jobId
              ? { ...m, videoUrl: d.url as string, progress: 100 }
              : m,
          );
          setVideoHistory(next);
          // Persist first; count usage only when the completion actually
          // stuck — a failed write would otherwise recount on every mount.
          let persisted = false;
          try {
            localStorage.setItem(VIDEO_HISTORY_KEY, JSON.stringify(next.slice(-50)));
            persisted = true;
          } catch {
            /* ignore */
          }
          if (persisted) {
            try {
              const nextUsage = usageToday() + 1;
              localStorage.setItem(
                USAGE_KEY,
                JSON.stringify({ date: todayKey(), count: nextUsage }),
              );
              if (nextUsage >= DAILY_LIMIT) setLimited(true);
            } catch {
              /* ignore */
            }
          }
          return; // history change re-arms the effect; pending is gone
        }
        if (d.status === "failed") {
          pollFailRef.current = 0;
          setVideoHistory((prev) =>
            prev.map((m) =>
              m.kind === "video" && m.jobId === jobId ? { ...m, failed: true } : m,
            ),
          );
          return;
        }
        pollFailRef.current = 0;
        const pct = Math.max(1, Math.min(99, Number(d.progress) || 0));
        const current = videoHistoryRef.current.find(
          (m) => m.kind === "video" && m.jobId === jobId,
        );
        if (current && current.progress !== pct) {
          setVideoHistory((prev) =>
            prev.map((m) =>
              m.kind === "video" && m.jobId === jobId ? { ...m, progress: pct } : m,
            ),
          );
        }
      } catch {
        pollFailRef.current += 1;
        if (pollFailRef.current >= 12) {
          pollFailRef.current = 0;
          setVideoHistory((prev) =>
            prev.map((m) =>
              m.kind === "video" && m.jobId === jobId ? { ...m, failed: true } : m,
            ),
          );
        }
      }
    };
    const t = setInterval(tick, 2500);
    return () => clearInterval(t);
  }, [videoHistory, mode]);

  function eraseData() {
    try {
      localStorage.removeItem(NAME_KEY);
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(IMAGE_HISTORY_KEY);
      localStorage.removeItem(VIDEO_HISTORY_KEY);
      localStorage.removeItem(USAGE_KEY);
    } catch {
      /* ignore */
    }
    setChatHistory([]);
    setImageHistory([]);
    setVideoHistory([]);
    setName(null);
    setLimited(false);
    setFirstToken(false);
    setError(null);
    setEraseOpen(false);
  }


  // A5: Command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
        setCmdQuery("");
      }
      if (e.key === "Escape" && cmdOpen) {
        setCmdOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cmdOpen]);

  // A3: Autocomplete suggestions
  const acSuggestions = searchQuery ? [] : getAutocompleteSuggestions(input, chatHistory, imageHistory, videoHistory, mode);

  useEffect(() => {
    if (input.trim().length >= 2) {
      const items = getAutocompleteSuggestions(input, chatHistory, imageHistory, videoHistory, mode);
      setAcItems(items);
      setAcOpen(items.length > 0);
      setAcIdx(0);
    } else {
      setAcOpen(false);
      setAcItems([]);
    }
  }, [input, chatHistory, imageHistory, videoHistory, mode]);

  // Ctrl+Shift+F for search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
  const visible =
    mode === "chat" ? chatHistory : mode === "video" ? videoHistory : imageHistory;

  // ── A1: In-conversation search ──
  const searchMatches = searchQuery.trim()
    ? visible
        .map((m, i) => (m.content.toLowerCase().includes(searchQuery.toLowerCase()) ? i : -1))
        .filter((i) => i >= 0)
    : [];
  const searchMatchesCount = searchMatches.length;

  const searchNext = useCallback(() => {
    if (searchMatchesCount === 0) return;
    const next = (searchIdx + 1) % searchMatchesCount;
    setSearchIdx(next);
    const msgEl = messageRefs.current.get(searchMatches[next]);
    if (msgEl) msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchIdx, searchMatchesCount, searchMatches]);

  const searchPrev = useCallback(() => {
    if (searchMatchesCount === 0) return;
    const prev = (searchIdx - 1 + searchMatchesCount) % searchMatchesCount;
    setSearchIdx(prev);
    const msgEl = messageRefs.current.get(searchMatches[prev]);
    if (msgEl) msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchIdx, searchMatchesCount, searchMatches]);

  // Highlight matches in the DOM
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    // Remove old highlights
    container.querySelectorAll("mark.search-hit").forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
        parent.normalize();
      }
    });
    if (!searchQuery.trim()) return;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node as Text);
    for (const tn of textNodes) {
      const text = tn.textContent ?? "";
      const matches = [...text.matchAll(regex)];
      if (matches.length === 0) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      for (const m of matches) {
        if (m.index! > last) {
          frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        }
        const mark = document.createElement("mark");
        mark.className = "search-hit";
        mark.textContent = m[0];
        frag.appendChild(mark);
        last = m.index! + m[0].length;
      }
      if (last < text.length) {
        frag.appendChild(document.createTextNode(text.slice(last)));
      }
      tn.parentNode?.replaceChild(frag, tn);
    }
    // Scroll to first match
    if (searchMatchesCount > 0 && searchIdx === 0) {
      const msgEl = messageRefs.current.get(searchMatches[0]);
      if (msgEl) msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchQuery, searchMatchesCount, searchMatches, searchIdx]);

  // Reset searchIdx when query changes
  useEffect(() => {
    setSearchIdx(0);
  }, [searchQuery]);


  // ── Chat view: full-height app, messages scroll internally ──
  return (
    <div
      className={
        variant === "widget"
          ? "flex h-full flex-col overflow-hidden"
          : "flex h-[calc(100vh-56px)] flex-col overflow-hidden px-5 py-6"
      }
    >
      <div
        className="mx-auto flex w-full min-h-0 flex-1 flex-col"
        style={
          {
            maxWidth: `${typography.readingWidth}px`,
            "--md-font-scale": typography.fontScale,
            "--md-font-family": fontCss(typography.fontFamily),
            "--md-line-height": typography.lineHeight,
          } as React.CSSProperties
        }
      >
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
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => { setSearchOpen((v) => !v); if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50); }}
              aria-label="Search messages"
              title="Search (Ctrl+Shift+F)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
            <ChatControls
              settings={typography}
              onChange={setTypography}
              onExportConversation={exportConversation}
            />
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
            <button
              type="button"
              onClick={() => setMode("video")}
              aria-pressed={mode === "video"}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition",
                mode === "video"
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <VideoIcon className="h-3.5 w-3.5" />
              Video
            </button>
          </div>
        </div>

        {/* A1: In-conversation search bar */}
        {searchOpen ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-card/30 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
              }}
              placeholder="Search messages…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {searchQuery.trim() ? (
              <span className="font-mono text-[10px] text-muted-foreground">
                {searchIdx + 1} / {searchMatchesCount}
              </span>
            ) : null}
            <button type="button" onClick={searchPrev} aria-label="Previous match" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:text-foreground" disabled={searchMatchesCount === 0}>
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={searchNext} aria-label="Next match" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:text-foreground" disabled={searchMatchesCount === 0}>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} aria-label="Close search" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

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
                {(mode === "chat"
                  ? SUGGESTIONS
                  : mode === "video"
                    ? VIDEO_SUGGESTIONS
                    : IMAGE_SUGGESTIONS
                ).map((s) => (
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
              ) : m.kind === "video" ? (
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
                      style={aspectBox(m.meta?.aspect || "16:9", variant)}
                    >
                      {m.videoUrl ? (
                        <video
                          src={m.videoUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 h-full w-full bg-black object-contain"
                        />
                      ) : m.failed ? (
                        <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-danger">
                          Video generation failed — try again
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <p className="font-mono text-[11px]">
                            {typeof m.progress === "number" ? `${m.progress}%` : "queued"} ·
                            generating {m.meta?.seconds}s video
                          </p>
                        </div>
                      )}
                      {m.videoUrl ? (
                        <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2.5 pb-2 pt-7">
                          <span className="truncate text-[11px] text-white/75">
                            {m.meta?.prompt} · {m.meta?.aspect} · {m.meta?.seconds}s
                          </span>
                          <a
                            href={m.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open video"
                            className="shrink-0 text-white/70 transition hover:text-white"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </figcaption>
                      ) : null}
                    </figure>
                    {m.meta?.revisedPrompt ? (
                      <p className="mt-1 line-clamp-2 font-mono text-[10px] leading-4 text-muted-foreground">
                        → {m.meta.revisedPrompt}
                      </p>
                    ) : null}
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
                          onClick={() => {
                            setEditPrompt(null);
                            setLightbox({ image: m.image, jobId: m.jobId, meta: m.meta });
                          }}
                          className="absolute inset-0 h-full w-full animate-fade-in cursor-zoom-in object-cover"
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
                    <div ref={(el) => { messageRefs.current.set(i, el); }}>
                      <Markdown streaming={sending && i === visible.length - 1}>
                        {stripControlMarkers(m.content)}
                      </Markdown>
                    </div>
                    {m.sources && m.sources.length > 0 ? (
                      <details className="mt-2 rounded-lg border border-border/50 bg-white/[0.02]">
                        <summary className="cursor-pointer px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-foreground">
                          Sources ({m.sources.length})
                        </summary>
                        <ul className="space-y-1 px-3 pb-2 pt-1">
                          {m.sources.map((s, si) => (
                            <li key={si} className="text-xs">
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-2 hover:no-underline"
                              >
                                {s.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    {m.content && m.content.trim() && !(sending && i === visible.length - 1) ? (
                      <MessageActions
                        markdown={m.content}
                        subject="Notes from Ashish Gupta"
                        isMail={Boolean(m.mail) || detectMail(m.content)}
                        getRenderedHtml={() => messageRefs.current.get(i)?.innerHTML ?? ""}
                        getRenderedElement={() => messageRefs.current.get(i) ?? null}
                        onRegenerate={i === visible.length - 1 ? regenerate : undefined}
                      />
                    ) : null}
                  </div>
                </div>
              ),
            )
          )}

          {sending && !firstToken ? (
            <div
              className="flex h-5 items-center gap-1.5"
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
            {/* A3: Autocomplete dropdown */}
            {acOpen && acItems.length > 0 ? (
              <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-border/60 bg-card shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
                {acItems.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInput(item);
                      setAcOpen(false);
                      textareaRef.current?.focus();
                    }}
                    className={cn(
                      "block w-full px-4 py-2.5 text-left text-sm transition",
                      i === acIdx ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
            {/* A3: Autocomplete dropdown */}
            {acOpen && acItems.length > 0 ? (
              <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-border/60 bg-card shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
                {acItems.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInput(item);
                      setAcOpen(false);
                      textareaRef.current?.focus();
                    }}
                    className={cn(
                      "block w-full px-4 py-2.5 text-left text-sm transition",
                      i === acIdx ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
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
            {openPanel === "vAspect" ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border border-border/80 bg-background p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Aspect ratio</p>
                  <p className="text-[11px] text-muted-foreground">720P video</p>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {V_ASPECTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setVAspect(a.id);
                        setOpenPanel(null);
                      }}
                      aria-pressed={vAspect === a.id}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-1 py-2 transition",
                        vAspect === a.id
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
            {openPanel === "vSeconds" ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-border/80 bg-background p-3 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Duration</p>
                  <p className="text-[11px] text-muted-foreground">{vSeconds} seconds</p>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {V_SECONDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setVSeconds(s);
                        setOpenPanel(null);
                      }}
                      aria-pressed={vSeconds === s}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-2 text-center text-xs font-medium transition",
                        vSeconds === s
                          ? "border-success/70 bg-success/5 text-success"
                          : "border-border/60 text-muted-foreground hover:border-white/25 hover:text-foreground",
                      )}
                    >
                      {s}s
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
                    if (acOpen && acItems.length > 0) {
                      if (e.key === "ArrowDown") { e.preventDefault(); setAcIdx((i) => Math.min(acItems.length - 1, i + 1)); return; }
                      if (e.key === "ArrowUp") { e.preventDefault(); setAcIdx((i) => Math.max(0, i - 1)); return; }
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setInput(acItems[acIdx] ?? input); setAcOpen(false); return; }
                      if (e.key === "Escape") { setAcOpen(false); return; }
                    }
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
                  className="max-h-32 min-h-[44px] flex-1 resize-none border-none bg-transparent px-2.5 pt-2.5 text-sm shadow-none focus-visible:ring-0"
                  disabled={limited}
                />
                <div className="flex items-center gap-1.5 px-1 pb-1.5 pt-1">
                  <span className="hidden pr-1 text-[10px] text-muted-foreground lg:block">
                    Enter to send · Shift + Enter for a new line
                  </span>
                  <Button
                    variant="success"
                    onClick={() => send(input)}
                    disabled={!input.trim() || sending || generating || limited}
                    aria-label="Send message"
                    className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 hover:brightness-105"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : mode === "image" ? (
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
            ) : (
              <div className="rounded-[28px] border border-primary/20 bg-primary/[0.03] p-2 shadow-[0_0_60px_hsl(var(--primary)/0.10),0_10px_40px_rgba(0,0,0,0.4)] transition-colors focus-within:border-primary/40">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      generateVideo();
                    }
                  }}
                  placeholder="Describe the video you want…"
                  rows={1}
                  maxLength={1000}
                  className="max-h-32 min-h-[44px] flex-1 resize-none border-none bg-transparent px-2.5 py-2.5 text-sm shadow-none focus-visible:ring-0"
                  disabled={limited}
                />
                <div className="flex items-center gap-1.5 px-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpenPanel(openPanel === "vAspect" ? null : "vAspect")}
                    aria-expanded={openPanel === "vAspect"}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition",
                      openPanel === "vAspect" || vAspect !== "16:9"
                        ? "border-success/60 bg-success/5 text-success"
                        : "border-border/60 text-muted-foreground hover:border-white/25 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block rounded-[2px] border-[1.5px] border-current",
                        V_ASPECTS.find((a) => a.id === vAspect)?.box,
                      )}
                    />
                    {vAspect}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenPanel(openPanel === "vSeconds" ? null : "vSeconds")}
                    aria-expanded={openPanel === "vSeconds"}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition",
                      openPanel === "vSeconds" || vSeconds !== "5"
                        ? "border-success/60 bg-success/5 text-success"
                        : "border-border/60 text-muted-foreground hover:border-white/25 hover:text-foreground",
                    )}
                  >
                    {vSeconds}s
                  </button>
                  <span className="ml-auto hidden pr-1 text-[10px] text-muted-foreground lg:block">
                    Enter to generate · 720P
                  </span>
                  <button
                    type="button"
                    onClick={() => generateVideo()}
                    disabled={!input.trim() || generating || sending || limited}
                    aria-label="Generate video"
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

      {/* A5: Command palette (Ctrl+K) */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        commands={[
          { id: "clear", label: "Clear chat", hint: "erase all messages", run: () => setEraseOpen(true) },
          { id: "export", label: "Export conversation", hint: "download as markdown", run: () => exportConversation() },
          { id: "image", label: "Switch to Image mode", hint: "generate images", run: () => setMode("image") },
          { id: "video", label: "Switch to Video mode", hint: "generate videos", run: () => setMode("video") },
          { id: "chat", label: "Switch to Chat mode", hint: "text conversation", run: () => setMode("chat") },
          { id: "research", label: "Research & draft", hint: "prospect research + cold email", run: () => { setMode("chat"); setInput("Research and write a cold email for: "); textareaRef.current?.focus(); } },
          { id: "erase", label: "Erase all data", hint: "remove name, history, usage", run: () => setEraseOpen(true) },
          { id: "search", label: "Search messages", hint: "Ctrl+Shift+F", run: () => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); } },
        ]}
      />

      {/* A5: Command palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        commands={[
          { id: "clear", label: "Clear chat", hint: "erase all messages", run: () => setEraseOpen(true) },
          { id: "export", label: "Export conversation", hint: "download as markdown", run: () => exportConversation() },
          { id: "image", label: "Switch to Image mode", hint: "generate images", run: () => setMode("image") },
          { id: "video", label: "Switch to Video mode", hint: "generate videos", run: () => setMode("video") },
          { id: "chat", label: "Switch to Chat mode", hint: "text conversation", run: () => setMode("chat") },
          { id: "search", label: "Search messages", hint: "Ctrl+Shift+F", run: () => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); } },
          { id: "erase", label: "Erase all data", hint: "remove name, history, usage", run: () => setEraseOpen(true) },
        ]}
      />

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

      {/* Fullscreen image viewer (ChatGPT-style): click a generated image to
          open it large, read/edit its prompt, and regenerate in place. The
          dialog portals to <body>, so it goes fullscreen even from the widget. */}
      <Dialog
        open={!!lightbox}
        onOpenChange={(o) => {
          if (!o) {
            setLightbox(null);
            setEditPrompt(null);
          }
        }}
      >
        <DialogContent className="max-w-[94vw] gap-3 p-3 sm:max-w-[820px] sm:p-4">
          <DialogTitle className="sr-only">Generated image</DialogTitle>
          {lightbox ? (
            <>
              <figure className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-card">
                <img
                  src={lightbox.image}
                  alt={lightbox.meta?.prompt || "Generated image"}
                  className="mx-auto max-h-[68vh] w-auto max-w-full object-contain"
                />
              </figure>
              {editPrompt === null ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {lightbox.meta?.prompt} · {lightbox.meta?.aspect}
                    {lightbox.meta?.tier && lightbox.meta.tier !== "1K"
                      ? ` · ${lightbox.meta.tier}`
                      : ""}
                    {lightbox.meta?.style && lightbox.meta.style !== "Auto"
                      ? ` · ${lightbox.meta.style}`
                      : ""}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditPrompt(lightbox.meta?.prompt || "")}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit prompt
                  </Button>
                  <a
                    href={
                      lightbox.jobId
                        ? `/api/image/download?id=${encodeURIComponent(lightbox.jobId)}`
                        : lightbox.image
                    }
                    {...(lightbox.jobId
                      ? {}
                      : lightbox.image.startsWith("data:")
                        ? {}
                        : { target: "_blank", rel: "noopener noreferrer" })}
                    download={
                      lightbox.jobId
                        ? `ashish-image-${lightbox.jobId}.png`
                        : lightbox.image.startsWith("data:")
                          ? "ashish-image.png"
                          : undefined
                    }
                    aria-label="Download image"
                  >
                    <Button variant="outline" size="sm">
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    autoFocus
                    aria-label="Edit image prompt"
                    className="resize-none text-sm"
                    placeholder="Describe the image you want…"
                    disabled={generating || limited}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditPrompt(null)}
                      disabled={generating}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const p = editPrompt.trim();
                        if (!p || generating || limited) return;
                        await runGeneration(p, {
                          aspect: lightbox.meta?.aspect || aspect,
                          style: lightbox.meta?.style || imgStyle,
                          tier: lightbox.meta?.tier || imgTier,
                          images: [],
                        });
                        setLightbox(null);
                        setEditPrompt(null);
                      }}
                      disabled={!editPrompt.trim() || generating || limited}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Generating…
                        </>
                      ) : (
                        <>
                          <Send className="mr-1.5 h-3.5 w-3.5" /> Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

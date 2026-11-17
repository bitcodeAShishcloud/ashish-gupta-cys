"use client";

/* Phase 10: admin viewer for every visitor's chats across all devices, plus
 * a one-click full backup. Desktop = 3 panes; mobile = drill-down. Media is
 * rendered straight from its URL — the server never fetches provider media. */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  deviceName: string;
  createdAt: number;
  lastSeen: number;
  conversationCount: number;
  messageCount: number;
}

interface Conv {
  id: string;
  userId: string;
  title: string;
  mode: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

interface AdminMsg {
  id: number;
  role: string;
  content: string;
  kind: string;
  mail: boolean;
  sources?: { title: string; url: string }[];
  imageUrl?: string;
  videoUrl?: string;
  jobId?: string;
  meta?: Record<string, unknown>;
  createdAt: number;
}

interface Detail {
  conversation: {
    id: string;
    userId: string;
    deviceName: string;
    deviceCreatedAt: number;
    deviceLastSeen: number;
    title: string;
    mode: string;
    pinned: boolean;
    createdAt: number;
    updatedAt: number;
  };
  messages: AdminMsg[];
}

type Pane = "devices" | "conversations" | "chat";

function shortHash(id: string): string {
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

function fmtDate(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtNum(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function AdminAiChats() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [conv, setConv] = useState<Conv | null>(null);
  const [query, setQuery] = useState("");
  const [pane, setPane] = useState<Pane>("devices");
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch("/api/admin/ai/users", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDevices(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "Could not load devices." });
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  async function openDevice(d: Device) {
    setDevice(d);
    setConv(null);
    setDetail(null);
    setPane("conversations");
    setLoadingConvs(true);
    try {
      const res = await fetch(`/api/admin/ai/conversations?userId=${encodeURIComponent(d.id)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "Could not load conversations." });
    } finally {
      setLoadingConvs(false);
    }
  }

  async function openConv(c: Conv) {
    setConv(c);
    setDetail(null);
    setPane("chat");
    setLoadingChat(true);
    try {
      const res = await fetch(`/api/admin/ai/conversations/${encodeURIComponent(c.id)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDetail(data as Detail);
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "Could not load chat." });
    } finally {
      setLoadingChat(false);
    }
  }

  async function downloadBackup() {
    setBackingUp(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/ai/backup", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ashish-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice({ ok: true, text: "Backup downloaded. Provider keys are still encrypted." });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "Backup failed." });
    } finally {
      setBackingUp(false);
    }
  }

  function copyHash(id: string) {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(id).then(
      () => setNotice({ ok: true, text: "Device hash copied." }),
      () => {},
    );
  }

  const filteredDevices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.deviceName.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q),
    );
  }, [devices, query]);

  const totals = useMemo(
    () => ({
      devices: devices.length,
      conversations: devices.reduce((s, d) => s + d.conversationCount, 0),
      messages: devices.reduce((s, d) => s + d.messageCount, 0),
    }),
    [devices],
  );

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <MessageSquare className="h-4 w-4 text-primary" /> AI Chats
            </h2>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {fmtNum(totals.devices)} devices · {fmtNum(totals.conversations)} conversations · {fmtNum(totals.messages)} messages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void loadDevices()} title="Refresh devices">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => void downloadBackup()} disabled={backingUp}>
              {backingUp ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Full backup
            </Button>
          </div>
        </div>

        {notice ? (
          <div
            className={cn(
              "mx-4 mt-3 rounded-md border px-3 py-2 font-mono text-xs",
              notice.ok
                ? "border-border/60 text-muted-foreground"
                : "border-danger/40 bg-danger/10 text-danger",
            )}
          >
            {notice.ok ? "✓ " : "✗ "}
            {notice.text}
          </div>
        ) : null}

        <div className="grid min-h-[520px] lg:grid-cols-[minmax(220px,1fr)_minmax(240px,1.1fr)_minmax(360px,2fr)]">
          {/* Pane 1 — Devices */}
          <div
            className={cn(
              "border-b border-border/60 p-3 lg:border-b-0 lg:border-r",
              pane !== "devices" && "hidden lg:block",
            )}
          >
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search device or hash"
                className="pl-8 font-mono text-xs"
              />
            </div>
            {loadingDevices ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredDevices.length === 0 ? (
              <p className="px-1 py-8 text-center text-xs text-muted-foreground">
                No devices found. Chats appear here once a visitor sends a message.
              </p>
            ) : (
              <div className="space-y-1.5">
                {filteredDevices.map((d) => (
                  <div
                    key={d.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void openDevice(d)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void openDevice(d);
                      }
                    }}
                    className={cn(
                      "w-full cursor-pointer rounded-lg border border-transparent p-3 text-left transition-colors hover:bg-white/[0.04]",
                      device?.id === d.id && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {d.deviceName || "Unnamed device"}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyHash(d.id);
                      }}
                      className="mt-1 font-mono text-[10px] text-muted-foreground hover:text-primary"
                      title="Copy full SHA-256 device hash"
                    >
                      {shortHash(d.id)} <Copy className="inline h-2.5 w-2.5" />
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <span>{fmtNum(d.conversationCount)} chats</span>
                      <span>·</span>
                      <span>{fmtNum(d.messageCount)} msgs</span>
                      <span>·</span>
                      <span>{fmtDate(d.lastSeen)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pane 2 — Conversations */}
          <div
            className={cn(
              "border-b border-border/60 p-3 lg:border-b-0 lg:border-r",
              pane !== "conversations" && "hidden lg:block",
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPane("devices")}
                className="text-muted-foreground hover:text-foreground lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {device ? device.deviceName || shortHash(device.id) : "Select a device"}
              </p>
            </div>
            {!device ? (
              <p className="py-10 text-center text-xs text-muted-foreground">
                Choose a device to see its conversations.
              </p>
            ) : loadingConvs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">
                No conversations for this device.
              </p>
            ) : (
              <div className="space-y-1.5">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void openConv(c)}
                    className={cn(
                      "w-full rounded-lg border border-transparent p-3 text-left transition-colors hover:bg-white/[0.04]",
                      conv?.id === c.id && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm">{c.title || "Untitled"}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="px-1.5 py-0 text-[9px]">{c.mode}</Badge>
                      <span>{fmtNum(c.messageCount)} msgs</span>
                      <span>·</span>
                      <span>{fmtDate(c.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pane 3 — Full chat */}
          <div className={cn("p-3", pane !== "chat" && "hidden lg:block")}>
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPane("conversations")}
                className="text-muted-foreground hover:text-foreground lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {conv ? conv.title : "Full chat"}
              </p>
            </div>
            {!conv ? (
              <p className="py-10 text-center text-xs text-muted-foreground">
                Select a conversation to read the full chat.
              </p>
            ) : loadingChat ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : !detail ? (
              <p className="py-10 text-center text-xs text-danger">Could not load this chat.</p>
            ) : (
              <ChatView detail={detail} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChatView({ detail }: { detail: Detail }) {
  const c = detail.conversation;
  return (
    <div className="space-y-4">
      {/* Device metadata */}
      <div className="glass rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{c.deviceName || "Unnamed device"}</span>
          <Badge variant="outline" className="font-mono text-[9px]">{c.mode}</Badge>
        </div>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(c.userId)}
          className="mt-1 block font-mono text-[10px] text-muted-foreground hover:text-primary"
          title="Full SHA-256 hash — raw device token is never stored"
        >
          hash: {c.userId} <Copy className="inline h-2.5 w-2.5" />
        </button>
        <div className="mt-2 grid gap-1 font-mono text-[10px] text-muted-foreground sm:grid-cols-2">
          <span>First seen: {fmtDate(c.deviceCreatedAt)}</span>
          <span>Last seen: {fmtDate(c.deviceLastSeen)}</span>
          <span>Chat created: {fmtDate(c.createdAt)}</span>
          <span>Updated: {fmtDate(c.updatedAt)}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {detail.messages.length === 0 ? (
          <p className="py-8 text-center font-mono text-xs text-muted-foreground">
            No messages in this conversation.
          </p>
        ) : (
          detail.messages.map((m) => <MessageRow key={m.id} msg={m} />)
        )}
      </div>
    </div>
  );
}

function MessageRow({ msg }: { msg: AdminMsg }) {
  const isUser = msg.role === "user";
  const meta = msg.meta ?? {};
  const metaBits = [
    meta.prompt ? `prompt: ${String(meta.prompt).slice(0, 160)}` : null,
    meta.aspect ? `aspect: ${String(meta.aspect)}` : null,
    meta.style ? `style: ${String(meta.style)}` : null,
    meta.tier ? `tier: ${String(meta.tier)}` : null,
    meta.seconds ? `seconds: ${String(meta.seconds)}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className={cn("rounded-lg border border-border/60 p-3", isUser ? "bg-white/[0.02]" : "bg-primary/[0.03]")}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant={isUser ? "outline" : "success"} className="font-mono text-[9px]">
          {isUser ? "user" : "assistant"}
        </Badge>
        {msg.kind !== "text" ? (
          <Badge variant="outline" className="font-mono text-[9px]">
            {msg.kind === "image" ? <ImageIcon className="mr-1 inline h-2.5 w-2.5" /> : <Video className="mr-1 inline h-2.5 w-2.5" />}
            {msg.kind}
          </Badge>
        ) : null}
        {msg.mail ? (
          <Badge variant="outline" className="font-mono text-[9px]">
            <Mail className="mr-1 inline h-2.5 w-2.5" /> mail
          </Badge>
        ) : null}
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {fmtDate(msg.createdAt)}
        </span>
      </div>

      {msg.content ? (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
      ) : null}

      {msg.kind === "image" && msg.imageUrl ? (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={msg.imageUrl}
            alt="Generated output"
            className="max-h-72 rounded-lg border border-border/60 object-contain"
          />
          <a
            href={msg.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[10px] text-primary hover:underline"
          >
            Open image <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : null}

      {msg.kind === "video" && msg.videoUrl ? (
        <div className="mt-3 space-y-2">
          <video
            src={msg.videoUrl}
            controls
            playsInline
            className="max-h-72 w-full rounded-lg border border-border/60"
          />
          <a
            href={msg.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[10px] text-primary hover:underline"
          >
            Open video <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : null}

      {msg.jobId ? (
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">job: {msg.jobId}</p>
      ) : null}

      {metaBits.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {metaBits.map((bit, i) => (
            <span key={i} className="rounded bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-muted-foreground">
              {bit}
            </span>
          ))}
        </div>
      ) : null}

      {msg.sources && msg.sources.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer font-mono text-[10px] text-primary">
            {msg.sources.length} research sources
          </summary>
          <ul className="mt-2 space-y-1">
            {msg.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary"
                >
                  <FileText className="h-3 w-3" /> {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

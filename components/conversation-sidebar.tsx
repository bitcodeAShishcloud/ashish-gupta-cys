"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Search, Trash2, Pin, Pencil, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDeviceToken, fetchConversations, searchConversations, deleteConversation, updateConversation, createConversation, type ConversationSummary } from "@/lib/conversations";

export interface ConversationSidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  collapsed: boolean;
  onToggle: () => void;
  refreshKey: number;
}

export function ConversationSidebar({
  activeId,
  onSelect,
  onNew,
  collapsed,
  onToggle,
  refreshKey,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const token = getDeviceToken();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const fetcher = query.trim() ? searchConversations(token, query) : fetchConversations(token);
    fetcher.then((list) => {
      if (alive) { setConversations(list); setLoading(false); }
    });
    return () => { alive = false; };
  }, [token, query, refreshKey]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  async function handlePin(conv: ConversationSummary) {
    await updateConversation(token, conv.id, { pinned: !conv.pinned });
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, pinned: !c.pinned } : c)));
  }

  async function handleDelete(conv: ConversationSummary) {
    if (!confirm(`Delete "${conv.title}"?`)) return;
    await deleteConversation(token, conv.id);
    setConversations((prev) => prev.filter((c) => c.id !== conv.id));
    if (activeId === conv.id) onNew();
  }

  async function startRename(conv: ConversationSummary) {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  }

  async function commitRename() {
    if (!editingId) return;
    const newTitle = editTitle.trim() || "Untitled";
    await updateConversation(token, editingId, { title: newTitle });
    setConversations((prev) => prev.map((c) => (c.id === editingId ? { ...c, title: newTitle } : c)));
    setEditingId(null);
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center border-r border-border/60 bg-background/80 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNew}
          aria-label="New chat"
          className="mt-3 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/60 bg-background/80">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
        <button
          type="button"
          onClick={onNew}
          className="flex flex-1 items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-medium text-foreground transition hover:bg-white/[0.10]"
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-white/[0.03] px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {loading ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {query ? "No matches." : "No conversations yet."}
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group relative mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
                activeId === conv.id
                  ? "bg-white/[0.10] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              {editingId === conv.id ? (
                <input
                  ref={editRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 rounded border border-primary/40 bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(conv.id)}
                  className="flex flex-1 items-center gap-2 truncate text-left"
                >
                  {conv.pinned ? <Pin className="h-3 w-3 shrink-0 text-primary" /> : <MessageSquare className="h-3 w-3 shrink-0 opacity-60" />}
                  <span className="truncate">{conv.title}</span>
                </button>
              )}
              <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">
                {formatDate(conv.updatedAt)}
              </span>
              {/* Actions — visible on hover */}
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={() => handlePin(conv)} aria-label="Pin" className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground">
                  <Pin className={cn("h-3 w-3", conv.pinned && "text-primary")} />
                </button>
                <button type="button" onClick={() => startRename(conv)} aria-label="Rename" className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => handleDelete(conv)} aria-label="Delete" className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-danger">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

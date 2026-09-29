"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Maximize2, MessageCircle, X } from "lucide-react";

/*
 * Floating chat bubble: bottom-right FAB that opens the AI chat in place.
 * The chat UI (and react-markdown with it) is code-split and only fetched
 * the first time the panel opens, so page bundles stay lean.
 */
const ChatPanel = dynamic(
  () => import("@/components/chat-panel").then((m) => m.ChatPanel),
  {
    ssr: false,
    loading: () => <div className="h-full" aria-hidden />,
  },
);

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isChatPage = pathname === "/chat";

  useEffect(() => {
    if (!open || isChatPage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isChatPage]);

  if (isChatPage) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open ? (
        <div
          role="dialog"
          aria-label="Chat with Ashish's AI assistant"
          className="animate-fade-in-up flex h-[min(560px,calc(100dvh-7rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
        >
          <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border/60 px-3.5">
            <img
              src="/favicon.webp"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded-full ring-1 ring-white/10"
            />
            <span className="font-display text-sm font-semibold tracking-tight">
              Ashish&apos;s AI
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/chat"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                aria-label="Open full chat page"
              >
                <Maximize2 className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel variant="widget" />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? "Close chat" : "Open chat"}
        className="grad-btn ml-auto mt-3 flex h-12 w-12 items-center justify-center rounded-full text-[#05070A] shadow-[0_8px_28px_rgba(0,0,0,0.55),0_0_0_1px_hsl(0_0%_100%/0.15)] transition hover:scale-105 active:scale-95"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

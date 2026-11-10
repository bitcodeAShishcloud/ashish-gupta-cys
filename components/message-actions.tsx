"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check, Copy, Download, Share2, RefreshCw, ChevronDown, Send,
} from "lucide-react";
import {
  COPY_FORMATS, DOWNLOAD_FORMATS, FORMAT_LABELS, formatPayload,
  copyToClipboard, downloadBlob, exportDocx, exportPdf, safeFilename,
  shareContent, toEmailText, type ExportFormat,
} from "@/lib/export-formats";
import { cn } from "@/lib/utils";

/* Phase 8 (locked decisions #1, #3, #6, #9, #15):
 *  - isMail=true  → Copy + Send only
 *  - isMail=false → Copy, Copy as, Download, Share, Regenerate
 * Email (mailto), Print and Draft email are REMOVED, not hidden.
 * `Send` opens the native share sheet with Email-ready text and falls back
 * to the clipboard on desktop. The share sheet never sends anything itself.
 */
export function MessageActions({
  markdown,
  getRenderedHtml,
  getRenderedElement,
  onRegenerate,
  isMail = false,
  subject = "Notes from Ashish Gupta",
}: {
  markdown: string;
  getRenderedHtml: () => string;
  getRenderedElement: () => HTMLElement | null;
  onRegenerate?: () => void;
  isMail?: boolean;
  subject?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [openMenu, setOpenMenu] = useState<"copy" | "download" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  async function flash(setter: (v: boolean) => void, ok: boolean) {
    if (!ok) return;
    setter(true);
    window.setTimeout(() => setter(false), 1600);
  }

  async function doCopy(format: ExportFormat) {
    setOpenMenu(null);
    const html = getRenderedHtml();
    const { data } = formatPayload(format, markdown, html, { subject, title: subject });
    await flash(setCopied, await copyToClipboard(String(data)));
  }

  async function doDownload(format: ExportFormat) {
    setOpenMenu(null);
    const html = getRenderedHtml();
    if (format === "pdf") {
      const el = getRenderedElement();
      if (!el) return;
      setBusy("pdf");
      try {
        await exportPdf(el, safeFilename(subject, "pdf"));
      } finally {
        setBusy(null);
      }
      return;
    }
    if (format === "docx") {
      setBusy("docx");
      try {
        await exportDocx(markdown, safeFilename(subject, "docx"));
      } finally {
        setBusy(null);
      }
      return;
    }
    const { data, mime, ext } = formatPayload(format, markdown, html, {
      subject,
      title: subject,
    });
    downloadBlob(safeFilename(subject, ext), data, mime);
  }

  async function doSend() {
    const payload = toEmailText(markdown, subject);
    const shared = await shareContent("Share email draft", payload);
    if (shared === "failed") {
      await flash(setSent, await copyToClipboard(payload));
    } else {
      await flash(setSent, true);
    }
  }

  const btn = "md-action-btn";
  const copyBtn = (
    <button type="button" className={btn} onClick={() => doCopy("md")} title="Copy as Markdown">
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );

  if (isMail) {
    return (
      <div ref={rootRef} className="md-actions">
        {copyBtn}
        <button type="button" className={cn(btn, "md-action-send")} onClick={doSend} title="Share email draft">
          {sent ? <Check className="h-3.5 w-3.5 text-success" /> : <Send className="h-3.5 w-3.5" />}
          <span>{sent ? "Copied" : "Send"}</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="md-actions">
      {copyBtn}

      <div className="relative">
        <button type="button" className={btn} onClick={() => setOpenMenu(openMenu === "copy" ? null : "copy")} aria-expanded={openMenu === "copy"} title="Copy as…">
          <span>Copy as</span><ChevronDown className="h-3 w-3" />
        </button>
        {openMenu === "copy" ? (
          <div role="menu" className="md-menu">
            {COPY_FORMATS.map((f) => (
              <button key={f} role="menuitem" type="button" onClick={() => doCopy(f)}>{FORMAT_LABELS[f]}</button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button type="button" className={btn} onClick={() => setOpenMenu(openMenu === "download" ? null : "download")} aria-expanded={openMenu === "download"} title="Download as…" disabled={busy !== null}>
          <Download className="h-3.5 w-3.5" />
          <span>{busy ? "Working…" : "Download"}</span><ChevronDown className="h-3 w-3" />
        </button>
        {openMenu === "download" ? (
          <div role="menu" className="md-menu">
            {DOWNLOAD_FORMATS.map((f) => (
              <button key={f} role="menuitem" type="button" onClick={() => doDownload(f)}>{FORMAT_LABELS[f]}</button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={btn}
        onClick={async () => {
          const r = await shareContent(subject, markdown);
          await flash(setCopied, r !== "failed");
        }}
        title="Share"
      >
        <Share2 className="h-3.5 w-3.5" /><span>Share</span>
      </button>

      {onRegenerate ? (
        <button type="button" className={btn} onClick={onRegenerate} title="Regenerate this reply">
          <RefreshCw className="h-3.5 w-3.5" /><span>Regenerate</span>
        </button>
      ) : null}
    </div>
  );
}

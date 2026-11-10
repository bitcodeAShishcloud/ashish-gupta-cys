"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check, Copy, Download, Share2, Mail, Printer, RefreshCw, ChevronDown,
} from "lucide-react";
import {
  COPY_FORMATS, DOWNLOAD_FORMATS, FORMAT_LABELS, formatPayload,
  copyToClipboard, downloadBlob, exportDocx, exportPdf, mailtoLink,
  printHtml, safeFilename, shareContent, toEmailText, type ExportFormat,
} from "@/lib/export-formats";
import { cn } from "@/lib/utils";

export function MessageActions({
  markdown,
  getRenderedHtml,
  getRenderedElement,
  onRegenerate,
  onDraftEmail,
  subject = "Notes from Ashish Gupta",
}: {
  markdown: string;
  getRenderedHtml: () => string;
  getRenderedElement: () => HTMLElement | null;
  onRegenerate?: () => void;
  onDraftEmail?: () => void;
  subject?: string;
}) {
  const [copied, setCopied] = useState(false);
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

  async function flash(ok: boolean) {
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  async function doCopy(format: ExportFormat) {
    setOpenMenu(null);
    const html = getRenderedHtml();
    const { data } = formatPayload(format, markdown, html, { subject, title: subject });
    await flash(await copyToClipboard(String(data)));
  }

  async function doDownload(format: ExportFormat) {
    setOpenMenu(null);
    const html = getRenderedHtml();
    const base = safeFilename(subject.replace(/^Notes from /, "").replace(/\s+/g, "-").toLowerCase(), format);
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
    const { data, mime, ext } = formatPayload(format, markdown, html, { subject, title: subject });
    downloadBlob(safeFilename(subject, ext) || base, data, mime);
  }

  const btn = "md-action-btn";

  return (
    <div ref={rootRef} className="md-actions">
      <button type="button" className={btn} onClick={() => doCopy("md")} title="Copy as Markdown">
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>

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
          await flash(r !== "failed");
        }}
        title="Share"
      >
        <Share2 className="h-3.5 w-3.5" /><span>Share</span>
      </button>

      <a
        className={btn}
        href={mailtoLink(subject, toEmailText(markdown, subject))}
        title="Open in your mail app"
      >
        <Mail className="h-3.5 w-3.5" /><span>Email</span>
      </a>

      <button type="button" className={btn} onClick={() => printHtml(getRenderedHtml(), subject)} title="Print / Save as PDF">
        <Printer className="h-3.5 w-3.5" /><span>Print</span>
      </button>

      {onDraftEmail ? (
        <button type="button" className={btn} onClick={onDraftEmail} title="Ask the assistant to draft this as an email">
          <Mail className="h-3.5 w-3.5" /><span>Draft email</span>
        </button>
      ) : null}

      {onRegenerate ? (
        <button type="button" className={btn} onClick={onRegenerate} title="Regenerate this reply">
          <RefreshCw className="h-3.5 w-3.5" /><span>Regenerate</span>
        </button>
      ) : null}
    </div>
  );
}

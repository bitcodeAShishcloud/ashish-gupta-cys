/* Client-side export helpers. All formats are produced in the browser —
 * nothing is uploaded, no server state. Kept dependency-free at module load;
 * heavy libs (jspdf/html2canvas/docx) are imported lazily on demand. */

export type ExportFormat = "md" | "txt" | "html" | "json" | "email" | "pdf" | "docx";

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  md: "Markdown (.md)",
  txt: "Plain text (.txt)",
  html: "HTML (.html)",
  json: "JSON (.json)",
  email: "Email-ready text",
  pdf: "PDF (.pdf)",
  docx: "Word (.docx)",
};

export const DOWNLOAD_FORMATS: ExportFormat[] = ["md", "txt", "html", "json", "pdf", "docx"];
export const COPY_FORMATS: ExportFormat[] = ["md", "txt", "html", "json", "email"];

/** Strip markdown syntax well enough for a readable plain-text export. */
export function toPlainText(md: string): string {
  return md
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, (_m, code: string) => code.trimEnd())
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "• ")
    .replace(/^\s{0,3}\d+\.\s+/gm, (m) => m.trim() + " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/gm, "──────────")
    .replace(/\|/g, "  ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Email-ready text: subject, greeting, body, signature. */
export function toEmailText(md: string, subject = "Notes from Ashish Gupta"): string {
  const body = toPlainText(md);
  return [
    `Subject: ${subject}`,
    "",
    "Hi,",
    "",
    body,
    "",
    "Best,",
    "Ashish Gupta",
    "Cyber Security @ NIET",
    "ashishcys.cyou",
  ].join("\n");
}

export function toJsonPayload(md: string, meta: Record<string, unknown> = {}): string {
  return JSON.stringify(
    {
      format: "ashish-portfolio-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      source: "https://www.ashishcys.cyou",
      ...meta,
      content: md,
      plainText: toPlainText(md),
    },
    null,
    2,
  );
}

/** Wrap rendered markdown HTML in a standalone, self-contained document. */
export function toHtmlDocument(innerHtml: string, title = "Ashish Gupta — Notes"): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{color-scheme:dark}
body{background:#05070A;color:#E8ECF2;font:15px/1.75 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px}
h1,h2,h3{font-weight:650;line-height:1.25;margin-top:1.6em}
h2{border-bottom:1px solid #22262e;padding-bottom:.3em}
a{color:#fff}
code{background:#ffffff14;padding:2px 5px;border-radius:4px;font:13px ui-monospace,monospace}
pre{background:#080B10;border:1px solid #22262e;border-radius:10px;padding:14px;overflow:auto}
pre code{background:none;padding:0}
blockquote{border-left:2px solid #00E5A8;margin:1em 0;padding-left:1em;color:#9aa3ae}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #22262e;padding:8px;text-align:left}
img{max-width:100%}
</style></head><body>
${innerHtml}
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function mailtoLink(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function downloadBlob(filename: string, data: BlobPart, mime: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(base: string, ext: string): string {
  const clean = base.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "ashish-notes";
  return `${clean}.${ext}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / denied permission.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Web Share API with a clipboard fallback. Returns which path was used. */
export async function shareContent(title: string, text: string): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch {
      /* user cancelled — fall through to copy */
    }
  }
  return (await copyToClipboard(text)) ? "copied" : "failed";
}

/** Print a rendered fragment by injecting a print-only host (no new window → no CSP frame issues). */
export function printHtml(innerHtml: string, title = "Ashish Gupta — Notes"): void {
  const host = document.createElement("div");
  host.className = "print-host";
  host.innerHTML = `<h1>${escapeHtml(title)}</h1>${innerHtml}`;
  document.body.appendChild(host);
  const cleanup = () => {
    host.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Safari/old Edge may not fire afterprint — safety net.
  window.setTimeout(cleanup, 60_000);
}

/** Build the payload for one format. `innerHtml` comes from the rendered DOM. */
export function formatPayload(
  format: ExportFormat,
  markdown: string,
  innerHtml: string,
  meta: Record<string, unknown> = {},
): { data: BlobPart; mime: string; ext: string } {
  switch (format) {
    case "md":
      return { data: markdown, mime: "text/markdown;charset=utf-8", ext: "md" };
    case "txt":
    case "email":
      return {
        data: format === "email" ? toEmailText(markdown, String(meta.subject ?? "Notes from Ashish Gupta")) : toPlainText(markdown),
        mime: "text/plain;charset=utf-8",
        ext: "txt",
      };
    case "html":
      return { data: toHtmlDocument(innerHtml, String(meta.title ?? "Ashish Gupta — Notes")), mime: "text/html;charset=utf-8", ext: "html" };
    case "json":
      return { data: toJsonPayload(markdown, meta), mime: "application/json;charset=utf-8", ext: "json" };
    default:
      return { data: markdown, mime: "text/plain;charset=utf-8", ext: "txt" };
  }
}

/** PDF via html2canvas + jsPDF — both lazy-loaded so the chat bundle stays lean. */
export async function exportPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const canvas = await html2canvas(element, { backgroundColor: "#05070A", scale: 2, useCORS: true });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}

/** DOCX via the docx library — lazy-loaded. */
export async function exportDocx(markdown: string, filename: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const lines = toPlainText(markdown).split("\n");
  const children = lines.map((line) => {
    const heading = /^•\s/.test(line) ? null : null;
    return new Paragraph({
      ...(heading ? { heading: HeadingLevel.HEADING_2 } : {}),
      children: [new TextRun({ text: line || " ", font: "Calibri", size: 22 })],
    });
  });
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(filename, blob, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

/** Whole-conversation markdown export. */
export function conversationToMarkdown(
  messages: { role: string; content: string }[],
  title = "Conversation with SecureAI",
): string {
  const date = new Date().toISOString().slice(0, 10);
  const body = messages
    .filter((m) => m.content && m.content.trim())
    .map((m) => `## ${m.role === "assistant" ? "SecureAI" : "You"}\n\n${m.content.trim()}`)
    .join("\n\n---\n\n");
  return `# ${title}\n\n_Exported ${date} · ashishcys.cyou_\n\n${body}\n`;
}

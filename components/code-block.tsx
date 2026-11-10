"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, WrapText, ListOrdered, ChevronDown, ChevronUp } from "lucide-react";
import { copyToClipboard, downloadBlob, safeFilename } from "@/lib/export-formats";
import { cn } from "@/lib/utils";

/* ── Brand-monochrome Shiki theme (locked decision #1) ──
 * Black bg, white/grey tokens, green used ONLY for strings/numbers —
 * sparingly, matching PROJECT.md's restrained colour grading. */
const MONO_THEME = {
  name: "ashish-mono",
  type: "dark" as const,
  colors: {
    "editor.background": "#080B10",
    "editor.foreground": "#E8ECF2",
  },
  settings: [
    { settings: { foreground: "#E8ECF2", background: "#080B10" } },
    { scope: ["comment", "punctuation.definition.comment", "string.comment"], settings: { foreground: "#6B7482", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "keyword.control", "entity.name.tag", "support.type.property-name"], settings: { foreground: "#FFFFFF", fontStyle: "bold" } },
    { scope: ["string", "string.quoted", "constant.character", "constant.numeric", "constant.language"], settings: { foreground: "#00E5A8" } },
    { scope: ["entity.name.function", "support.function", "variable.function", "entity.name.class", "support.class"], settings: { foreground: "#FFFFFF" } },
    { scope: ["variable", "variable.other", "parameter", "meta.parameter"], settings: { foreground: "#C9D0DA" } },
    { scope: ["punctuation", "operator", "meta.brace", "keyword.operator"], settings: { foreground: "#8B95A3" } },
    { scope: ["invalid", "invalid.illegal"], settings: { foreground: "#FFFFFF", fontStyle: "underline" } },
  ],
};

const FALLBACK_LANGS: Record<string, string> = {
  js: "javascript", ts: "typescript", jsx: "jsx", tsx: "tsx", py: "python",
  sh: "bash", shell: "bash", zsh: "bash", yml: "yaml", md: "markdown",
  html: "html", css: "css", json: "json", sql: "sql", go: "go", rs: "rust",
  java: "java", c: "c", cpp: "cpp", cs: "csharp", rb: "ruby", php: "php",
  txt: "text", text: "text", "": "text",
};

const EXT_BY_LANG: Record<string, string> = {
  javascript: "js", typescript: "ts", jsx: "jsx", tsx: "tsx", python: "py",
  bash: "sh", yaml: "yml", markdown: "md", json: "json", html: "html",
  css: "css", sql: "sql", go: "go", rust: "rs", java: "java", c: "c",
  cpp: "cpp", csharp: "cs", ruby: "rb", php: "php", text: "txt",
};

/* Module-level cache: one highlighter + memoized html per (lang, code).
 * Streaming re-renders the same partially-built block dozens of times —
 * without this cache it would re-highlight on every delta. */
type Highlighter = {
  codeToHtml: (code: string, opts: { lang: string; theme: string }) => string;
  getLoadedLanguages: () => string[];
  loadLanguage: (lang: string) => Promise<void>;
};

let shikiPromise: Promise<Highlighter> | null = null;
const htmlCache = new Map<string, string>();

/* Explicit JavaScript regex engine — NOT the Oniguruma WASM engine. A WASM
 * fetch/instantiate would be blocked by the site CSP (no `wasm-unsafe-eval`),
 * so this is a hard requirement, not a preference. */
function getShiki(): Promise<Highlighter> {
  if (!shikiPromise) {
    shikiPromise = Promise.all([
      import("shiki/bundle/web"),
      import("shiki/engine/javascript"),
    ]).then(([shiki, engine]) => {
      const create = shiki.createHighlighter as unknown as (opts: {
        themes: unknown[];
        langs: string[];
        engine: unknown;
      }) => Promise<Highlighter>;
      return create({
        themes: [MONO_THEME],
        langs: [],
        engine: engine.createJavaScriptRegexEngine(),
      });
    });
  }
  return shikiPromise;
}

async function highlight(code: string, lang: string): Promise<string> {
  const h = await getShiki();
  const want = lang && lang !== "text" ? lang : "text";
  try {
    if (!h.getLoadedLanguages().includes(want)) await h.loadLanguage(want as never);
    return h.codeToHtml(code, { lang: want, theme: MONO_THEME.name });
  } catch {
    // Unknown language alias → plain text, never a crash mid-stream.
    if (!h.getLoadedLanguages().includes("text")) await h.loadLanguage("text" as never);
    return h.codeToHtml(code, { lang: "text", theme: MONO_THEME.name });
  }
}

function langLabel(raw: string): string {
  return raw || "text";
}

export function CodeBlock({
  code,
  lang = "",
  streaming = false,
  filename,
}: {
  code: string;
  lang?: string;
  streaming?: boolean;
  filename?: string;
}) {
  const resolvedLang = FALLBACK_LANGS[lang.toLowerCase()] ?? lang.toLowerCase() ?? "text";
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isTall, setIsTall] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const key = `${resolvedLang}\u0000${code}`;

  useEffect(() => {
    // While streaming, show plain text — highlighting a half-written fence
    // flickers and wastes work. It settles the moment the stream ends.
    if (streaming) {
      setHtml(null);
      return;
    }
    const cached = htmlCache.get(key);
    if (cached !== undefined) {
      setHtml(cached);
      return;
    }
    let alive = true;
    highlight(code, resolvedLang)
      .then((out) => {
        if (htmlCache.size > 200) htmlCache.clear();
        htmlCache.set(key, out);
        if (alive) setHtml(out);
      })
      .catch(() => {
        if (alive) setHtml(null);
      });
    return () => {
      alive = false;
    };
  }, [key, resolvedLang, code, streaming]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    setIsTall(el.scrollHeight > 320);
  }, [html, code]);

  async function onCopy() {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  function onDownload() {
    const ext = EXT_BY_LANG[resolvedLang] ?? "txt";
    downloadBlob(filename ?? safeFilename(`code-${langLabel(resolvedLang)}`, ext), code, "text/plain;charset=utf-8");
  }

  const lines = code.split("\n").length;

  return (
    <div className="md-code" data-streaming={streaming ? "true" : undefined}>
      {/* Header bar always visible (locked decision #4) */}
      <div className="md-code-bar">
        <div className="flex min-w-0 items-center gap-2">
          <span className="md-code-lang">{langLabel(lang || "text")}</span>
          {filename ? <span className="truncate font-mono text-[10px] text-muted-foreground">{filename}</span> : null}
          <span className="hidden font-mono text-[10px] text-muted-foreground/70 sm:inline">{lines} lines</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={() => setShowLines((v) => !v)} aria-pressed={showLines} aria-label="Toggle line numbers" title="Line numbers" className={cn("md-code-btn", showLines && "is-on")}>
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setWrap((v) => !v)} aria-pressed={wrap} aria-label="Toggle line wrapping" title="Wrap long lines" className={cn("md-code-btn", wrap && "is-on")}>
            <WrapText className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onDownload} aria-label="Download code" title="Download code" className="md-code-btn">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onCopy} aria-label="Copy code" title="Copy code" className="md-code-btn">
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div
        ref={bodyRef}
        className={cn("md-code-body", showLines && "with-lines", wrap && "wrap", !expanded && "collapsed")}
      >
        {html ? (
          <div className="md-code-html" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="md-code-plain"><code>{code}</code></pre>
        )}
      </div>

      {isTall ? (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="md-code-expand">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Collapse" : `Expand all ${lines} lines`}
        </button>
      ) : null}
    </div>
  );
}

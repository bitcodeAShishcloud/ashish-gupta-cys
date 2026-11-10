"use client";

import React, { isValidElement, cloneElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Info, Lightbulb, TriangleAlert, OctagonAlert, ExternalLink,
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { cn } from "@/lib/utils";

/* ── Callouts: GitHub-style `> [!NOTE]` in a blockquote. Brand-monochrome
 * (locked decision #2): grey tint + left border + icon + label, no colours. */
const CALLOUTS: Record<string, { label: string; Icon: typeof Info }> = {
  note: { label: "Note", Icon: Info },
  tip: { label: "Tip", Icon: Lightbulb },
  important: { label: "Important", Icon: Info },
  warning: { label: "Warning", Icon: TriangleAlert },
  caution: { label: "Caution", Icon: TriangleAlert },
  danger: { label: "Danger", Icon: OctagonAlert },
};

function hastText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; value?: string; children?: unknown[] };
  if (n.type === "text") return String(n.value ?? "");
  return (n.children ?? []).map(hastText).join("");
}

const CALLOUT_MARKER = /^\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER)\]\s*/i;

function stripMarker(children: ReactNode): ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") return child.replace(CALLOUT_MARKER, "");
    if (isValidElement(child)) {
      const p = child.props as { children?: ReactNode };
      return cloneElement(child, undefined, stripMarker(p.children));
    }
    return child;
  });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 64);
}

function childText(children: ReactNode): string {
  let out = "";
  React.Children.forEach(children, (c) => {
    if (typeof c === "string" || typeof c === "number") out += String(c);
    else if (isValidElement(c)) out += childText((c.props as { children?: ReactNode }).children);
  });
  return out;
}

export function Markdown({
  children,
  streaming = false,
}: {
  children: string;
  streaming?: boolean;
}) {
  return (
    <div className="markdown-body" data-streaming={streaming ? "true" : undefined}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre({ children }) {
            const arr = React.Children.toArray(children);
            const child = arr[0];
            if (!isValidElement(child)) return <pre>{children}</pre>;
            const p = child.props as { className?: string; children?: ReactNode };
            const cls = String(p.className ?? "");
            const lang = /language-([\w+#.-]+)/.exec(cls)?.[1] ?? "";
            const code = String(p.children ?? "").replace(/\n$/, "");
            if (lang.toLowerCase() === "mermaid") return <MermaidDiagram code={code} />;
            return <CodeBlock code={code} lang={lang} streaming={streaming} />;
          },

          code({ className, children: c, node: _node, ...rest }) {
            // `node` is a hast node (react-markdown ExtraProps) — never spread
            // it onto a DOM element. Fenced blocks are consumed by `pre`.
            return (
              <code className={cn("md-inline-code", className)} {...rest}>{c}</code>
            );
          },

          blockquote({ node, children: c }) {
            // react-markdown v9 passes the hast node, but it can be empty in
            // some SSR paths — fall back to the rendered React children.
            const text = hastText(node) || childText(c);
            const m = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER)\]\s*/i.exec(text);
            if (!m) return <blockquote>{c}</blockquote>;
            const type = m[1].toLowerCase();
            const { label, Icon } = CALLOUTS[type];
            return (
              <div className="md-callout" data-type={type}>
                <div className="md-callout-head">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span>{label}</span>
                </div>
                <div className="md-callout-body">{stripMarker(c)}</div>
              </div>
            );
          },

          h1: ({ children: c }) => <h1 id={slugify(childText(c))}>{c}</h1>,
          h2: ({ children: c }) => <h2 id={slugify(childText(c))}>{c}</h2>,
          h3: ({ children: c }) => <h3 id={slugify(childText(c))}>{c}</h3>,
          h4: ({ children: c }) => <h4 id={slugify(childText(c))}>{c}</h4>,

          a({ href, children: c }) {
            const external = /^https?:\/\//i.test(String(href ?? ""));
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {c}
                {external ? <ExternalLink className="md-ext-icon" aria-hidden /> : null}
              </a>
            );
          },

          table({ children: c }) {
            return (
              <div className="md-table-wrap">
                <table>{c}</table>
              </div>
            );
          },

          img({ src, alt }) {
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={String(src ?? "")} alt={String(alt ?? "")} loading="lazy" decoding="async" />;
          },

          hr() {
            return <hr className="md-hr" />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

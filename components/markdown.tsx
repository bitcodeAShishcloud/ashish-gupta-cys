"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/*
 * XSS-safe markdown renderer: react-markdown never renders raw HTML
 * (the `html` option is off by default), so malicious tags in content
 * are emitted as inert text instead of executing.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

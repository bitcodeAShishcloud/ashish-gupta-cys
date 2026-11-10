"use client";

import { useEffect, useRef, useState } from "react";

/* Mermaid is ~1MB — loaded only when a diagram is actually present.
 * securityLevel "strict" makes mermaid sanitize its own SVG output; the site
 * CSP has no wasm/unsafe-eval permissions, so diagrams must not require them. */
let mermaidPromise: Promise<{
  initialize: (o: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
}> | null = null;

function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      const api = m.default as unknown as {
        initialize: (o: Record<string, unknown>) => void;
        render: (id: string, code: string) => Promise<{ svg: string }>;
      };
      api.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables: {
          background: "#080B10",
          primaryColor: "#11151C",
          primaryTextColor: "#E8ECF2",
          primaryBorderColor: "#2A303B",
          lineColor: "#8B95A3",
          secondaryColor: "#151A22",
          tertiaryColor: "#0B0F15",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "14px",
        },
      });
      return api;
    });
  }
  return mermaidPromise;
}

let seq = 0;

export function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const idRef = useRef(`mermaid-${++seq}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    let alive = true;
    getMermaid()
      .then((m) => m.render(idRef.current, code))
      .then(({ svg: out }) => {
        if (alive) setSvg(out);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [code]);

  if (error) {
    return (
      <pre className="md-code-plain"><code>{code}</code></pre>
    );
  }
  if (!svg) {
    return <div className="md-mermaid-loading">Rendering diagram…</div>;
  }
  // Mermaid's own strict-mode output — it sanitizes labels before returning.
  return <div className="md-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}

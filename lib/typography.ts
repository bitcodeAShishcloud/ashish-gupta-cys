/* Visitor-controlled chat typography. Persisted in localStorage only —
 * no server state, consistent with the portfolio's privacy model. */

export interface TypographySettings {
  fontScale: number; // 0.85 – 1.35, step 0.1
  fontFamily: "inter" | "space" | "mono" | "system";
  lineHeight: number; // 1.5 – 2.0
  readingWidth: number; // 640 – 1000 px
}

export const TYPOGRAPHY_KEY = "chat_typography_v1";

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontScale: 1,
  fontFamily: "inter",
  lineHeight: 1.75,
  readingWidth: 768,
};

export const FONT_FAMILIES: { id: TypographySettings["fontFamily"]; label: string; css: string }[] = [
  { id: "inter", label: "Inter", css: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" },
  { id: "space", label: "Space Grotesk", css: "var(--font-spacegrotesk), var(--font-inter), sans-serif" },
  { id: "mono", label: "JetBrains Mono", css: "var(--font-jbmono), ui-monospace, monospace" },
  { id: "system", label: "System", css: "ui-sans-serif, system-ui, -apple-system, sans-serif" },
];

export function loadTypography(): TypographySettings {
  try {
    const raw = localStorage.getItem(TYPOGRAPHY_KEY);
    if (!raw) return { ...DEFAULT_TYPOGRAPHY };
    const p = JSON.parse(raw) as Partial<TypographySettings>;
    return {
      fontScale: clamp(Number(p.fontScale) || 1, 0.85, 1.35),
      fontFamily: FONT_FAMILIES.some((f) => f.id === p.fontFamily) ? p.fontFamily! : "inter",
      lineHeight: clamp(Number(p.lineHeight) || 1.75, 1.5, 2),
      readingWidth: clamp(Number(p.readingWidth) || 768, 640, 1000),
    };
  } catch {
    return { ...DEFAULT_TYPOGRAPHY };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function fontCss(id: TypographySettings["fontFamily"]): string {
  return FONT_FAMILIES.find((f) => f.id === id)?.css ?? FONT_FAMILIES[0].css;
}

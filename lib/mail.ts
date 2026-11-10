/* Shared, dependency-free helpers for Phase 8 mail/draft handling.
 * Imported by BOTH the server route and the client chat panel — keep pure. */

export const MAIL_MARKER = "[[MAIL]]";
export const RESEARCH_MARKER_RE = /\[\[RESEARCH:\s*([^\]]{1,300})\]\]/i;

/** Strip control markers WITHOUT altering surrounding whitespace — safe to
 * apply to every streamed delta. */
export function stripMarkers(text: string): string {
  return text.replace(RESEARCH_MARKER_RE, "").split(MAIL_MARKER).join("");
}

/** Strip control markers + leading whitespace (for a complete message). */
export function stripControlMarkers(text: string): string {
  return stripMarkers(text).trimStart();
}

/** Extract a research query the model explicitly requested. */
export function extractResearchQuery(text: string): string | null {
  const m = RESEARCH_MARKER_RE.exec(text);
  return m ? m[1].trim() : null;
}

/** Content-based mail/draft detection — the fallback for marker-less and
 * cached-history replies. Requires 2 weak signals or 1 strong signal so a
 * normal answer mentioning "email" once is not misclassified. */
export function detectMail(text: string): boolean {
  const t = stripControlMarkers(text);
  if (!t || t.length < 40) return false;
  if (/\[\[MAIL\]\]/.test(text)) return true;
  const strong = [
    /^\s*subject\s*:/im,
    /^\s*(dear|respected|namaste|priya|hello)\s+[\w\u0900-\u097F]/im,
    /\n\s*(best regards|kind regards|warm regards|sincerely|regards|thanks\s*(&|and)\s*regards|धन्यवाद)\s*[,.]?\s*\n/im,
  ];
  const weak = [
    /\b(cold email|outreach|email draft|draft (an? )?email|follow[- ]up email)\b/i,
    /^\s*(hi|hello|dear|namaste)\s+[\w\u0900-\u097F]+[,\s]/im,
    /\b(looking forward|hope this (finds|email)|would love to (connect|discuss)|get in touch)\b/i,
    /\n\s*(best|kind regards|thanks|thank you|धन्यवाद)\s*[,.]?\s*\n/i,
  ];
  const score =
    strong.filter((r) => r.test(t)).length * 2 + weak.filter((r) => r.test(t)).length;
  return score >= 2;
}

/** Explicit/user-driven research intent. Server-side trigger, never every
 * message. URLs in the composer count as the manual "paste a link" path. */
const RESEARCH_INTENT =
  /\b(research|look up|search (for|about|the web)|find (info|information|details|out) about|web search|google|cold email|outreach|prospect|draft (an? )?email (for|to)|write (an? )?(email|cold email) (for|to)|clinic|practice|reviews?|website)\b/i;

export function explicitResearch(message: string): {
  needed: boolean;
  query: string;
  urls: string[];
} {
  const urls = Array.from(
    new Set(
      (message.match(/https?:\/\/[^\s<>"']+/g) ?? []).map((u) =>
        u.replace(/[.,;:!?)]+$/, ""),
      ),
    ),
  ).slice(0, 3);
  return { needed: urls.length > 0 || RESEARCH_INTENT.test(message), query: message, urls };
}

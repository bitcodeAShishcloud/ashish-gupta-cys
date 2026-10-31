/** @type {import('next').NextConfig} */

/*
 * Security response headers — the single source of truth for hardening.
 * Applied on every route (Vercel and `next start` both honor these).
 *
 * CSP notes:
 *  - The App Router ships its RSC flight payload as inline `self.__next_f`
 *    `<script>` tags, and next/font injects an inline `@font-face` style.
 *    A nonce policy is not viable without a custom server that rewrites that
 *    markup, so `script-src`/`style-src` allow 'unsafe-inline'. Everything
 *    else is locked to 'self' (no external origins are used at all: fonts are
 *    self-hosted, the AI chat is a same-origin server proxy).
 *  - The static JSON-LD <script> in app/layout.tsx is allowed by the same
 *    'unsafe-inline' above (it is inert data, never executed).
 *  - frame-ancestors 'none' + X-Frame-Options: the site must never be framed.
 */
const CSP = [
  "default-src 'self'",
  // Dev-only: Next.js HMR/react-refresh evaluates strings and needs
  // 'unsafe-eval'; production keeps the strict policy below.
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

/*
 * Image hosts the browser may load directly (provider CDNs) are appended to
 * img-src from AI_IMAGE_CSP_HOSTS. Built inside headers() so .env.local is
 * guaranteed to be loaded by the time we read it.
 */
function buildSecurityHeaders() {
  const imageHosts = (process.env.AI_IMAGE_CSP_HOSTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((h) => `https://${h}`)
    .join(" ");
  const csp = imageHosts
    ? CSP.replace("img-src 'self' data:", `img-src 'self' data: ${imageHosts}`)
    : CSP;
  return SECURITY_HEADERS.map((h) =>
    h.key === "Content-Security-Policy" ? { key: h.key, value: csp } : h,
  );
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;

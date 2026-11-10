import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SwCleanup } from "@/components/sw-cleanup";
import "./globals.css";

const SITE_URL = "https://www.ashishcys.cyou";

/*
 * Self-hosted WOFF2 (Latin-subset, ~60KB total for all four weights).
 * Body = Inter (400/600), headings = Space Grotesk (700, preloaded: it is the
 * hero/LCP text font), tags/HUD = JetBrains Mono (500).
 */
const inter = localFont({
  src: [
    { path: "./fonts/Inter400-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Inter600-latin.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: [{ path: "./fonts/SpaceGrotesk-latin.woff2", weight: "700", style: "normal" }],
  variable: "--font-spacegrotesk",
  display: "swap",
  preload: true,
});

const jetBrainsMono = localFont({
  src: [{ path: "./fonts/JetBrainsMono500-latin.woff2", weight: "500", style: "normal" }],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ashish Gupta | Cyber Security Portfolio",
    template: "%s | Ashish Gupta",
  },
  description:
    "Portfolio of Ashish Gupta, a 3rd-year B.Tech Cyber Security student at NIET. Projects, blog writeups, skills and an AI chat assistant. Ethical hacking, network defense and digital forensics.",
  keywords: [
    "Ashish Gupta",
    "cyber security portfolio",
    "ethical hacking",
    "network security",
    "digital forensics",
    "penetration testing",
    "NIET",
    "B.Tech Cyber Security",
  ],
  authors: [{ name: "Ashish Gupta" }],
  creator: "Ashish Gupta",
  category: "technology",
  applicationName: "Ashish Gupta Portfolio",
  icons: { icon: "/favicon.webp" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Ashish Gupta | Cyber Security",
    title: "Ashish Gupta | Cyber Security Portfolio",
    description:
      "3rd-year B.Tech Cyber Security student at NIET. Projects, writeups, skills and an AI chat assistant.",
    images: [
      {
        url: "/assets/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Ashish Gupta | Cyber Security Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ashish Gupta | Cyber Security Portfolio",
    description:
      "3rd-year B.Tech Cyber Security student at NIET. Projects, writeups, skills and an AI chat assistant.",
    images: ["/assets/og-image.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070A",
};

/* Person JSON-LD, inert data for search engines; allowed by the page CSP
   (script-src 'unsafe-inline'), same as Next's own inline flight payload. */
const personJsonLd = `{"@context":"https://schema.org","@type":"Person","name":"Ashish Gupta","jobTitle":"Cyber Security Student","url":"https://www.ashishcys.cyou","sameAs":["https://github.com/bitcodeAShishcloud","https://www.linkedin.com/in/ashish-gupta-037973259/"],"alumniOf":{"@type":"CollegeOrUniversity","name":"NIET, Greater Noida"}}`;

/*
 * Pre-paint critical styles. The bundled stylesheet is a separate request, so
 * without this the browser paints its default white canvas first — the white
 * flash visitors see on a cold load. Inlined here it lands with the HTML.
 * CSP allows it via style-src 'unsafe-inline'.
 */
const criticalCss = `html,body{background:#05070A;color:#F5F5F7;margin:0}`;

/*
 * Sets `js` on <html> before first paint so the scroll-reveal animation can
 * start from opacity:0 without a visible flash. If this never runs (JS off,
 * crawler, broken bundle) the `.reveal` blocks stay fully visible.
 */
const jsFlag = `document.documentElement.classList.add('js')`;

/*
 * Root layout: html/body + the pure-CSS grid background (no canvas, no images).
 * Each route group (site / admin) adds its own chrome.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
        <script dangerouslySetInnerHTML={{ __html: jsFlag }} />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} min-h-screen overflow-x-hidden bg-background font-sans text-foreground antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: personJsonLd }}
        />
        <div className="bg-grid" aria-hidden />
        <div className="relative z-0 min-h-screen">{children}</div>
        <SwCleanup />
      </body>
    </html>
  );
}

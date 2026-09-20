import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DotGrid } from "@/components/dot-grid";

const SITE_URL = "https://www.ashishcys.cyou";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ashish Gupta — Cyber Security Portfolio",
    template: "%s | Ashish Gupta",
  },
  description:
    "Portfolio of Ashish Gupta, a 3rd-year B.Tech Cyber Security student at NIET — projects, blog writeups, skills and an AI chat assistant. Ethical hacking, network defense and digital forensics.",
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
  applicationName: "Ashish Gupta — Portfolio",
  icons: { icon: "/favicon.webp" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Ashish Gupta — Cyber Security",
    title: "Ashish Gupta — Cyber Security Portfolio",
    description:
      "3rd-year B.Tech Cyber Security student at NIET — projects, writeups, skills and an AI chat assistant.",
    images: [
      {
        url: "/assets/profile-photo.webp",
        width: 640,
        height: 480,
        alt: "Ashish Gupta — Cyber Security Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Ashish Gupta — Cyber Security Portfolio",
    description:
      "3rd-year B.Tech Cyber Security student at NIET — projects, writeups, skills and an AI chat assistant.",
    images: ["/assets/profile-photo.webp"],
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
  themeColor: "#000000",
};

/*
 * Root layout: html/body + the shared layered background. Each route group
 * (site / admin) adds its own chrome — the public site gets the navbar +
 * footer, while the admin console stays standalone like its own subdomain.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen overflow-x-hidden bg-background font-sans text-foreground antialiased">
        <div className="cyber-bg" aria-hidden />
        <DotGrid />
        <div className="relative z-0 min-h-screen">{children}</div>
      </body>
    </html>
  );
}

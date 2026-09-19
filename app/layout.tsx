import type { Metadata } from "next";
import "./globals.css";
import { ParticleField } from "@/components/particle-field";

export const metadata: Metadata = {
  title: "Ashish Gupta — Cyber Security Portfolio",
  description:
    "Portfolio of Ashish Gupta, a 3rd-year B.Tech Cyber Security student at NIET — projects, blog, skills and an AI chat assistant.",
  icons: { icon: "/favicon.webp" },
};

/*
 * Root layout: html/body + the shared layered background. Each route group
 * (site / admin) adds its own chrome — the public site gets the navbar +
 * footer, while the admin console stays standalone like its own subdomain.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="cyber-bg" aria-hidden />
        <ParticleField />
        <div className="relative z-0 min-h-screen">{children}</div>
      </body>
    </html>
  );
}

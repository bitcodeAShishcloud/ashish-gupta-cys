import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Ashish Gupta — Cyber Security Portfolio",
  description:
    "Portfolio of Ashish Gupta, a 3rd-year B.Tech Cyber Security student at NIET — projects, blog, skills and an AI chat assistant.",
  icons: { icon: "/favicon.webp" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="cyber-bg" aria-hidden />
        <div className="cyber-grid" aria-hidden />
        <Navbar />
        <main className="relative z-0 min-h-[calc(100vh-72px)] pt-[72px]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

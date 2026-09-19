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
      <body className="cyber-bg min-h-screen bg-background font-sans text-foreground antialiased">
        <Navbar />
        <main className="min-h-[calc(100vh-72px)] pt-[72px]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

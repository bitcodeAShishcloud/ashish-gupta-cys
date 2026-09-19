"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/chat", label: "Chat" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight"
        >
          <Terminal className="h-5 w-5 text-primary" />
          <span>
            Ashish<span className="text-primary">_</span>Gupta
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(l.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/admin/login"
            className="ml-3 rounded-md border border-primary/40 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
          >
            Admin
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium",
                  isActive(l.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/admin/login"
              onClick={() => setOpen(false)}
              className="rounded-md border border-primary/40 px-3 py-2.5 text-center text-sm font-medium text-primary"
            >
              Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

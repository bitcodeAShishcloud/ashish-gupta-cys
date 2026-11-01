"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  id?: string;
}

const SECTION_LINKS: NavItem[] = [
  { href: "/#about", id: "about", label: "About" },
  { href: "/#skills", id: "skills", label: "Skills" },
  { href: "/#projects", id: "projects", label: "Projects" },
  { href: "/#freelance", id: "freelance", label: "Freelance" },
];

const ROUTE_LINKS: NavItem[] = [
  { href: "/blog", label: "Blog" },
  { href: "/chat", label: "Chat" },
];

const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  ...SECTION_LINKS,
  ...ROUTE_LINKS,
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  /* Drawer accessibility: Escape closes, focus moves to the first link when
     the drawer opens and returns to the toggle when it closes, and page
     scroll is locked while the drawer is open. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const first = drawerRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Scrollspy, only meaningful on the home page (where the #sections live).
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection(null);
      return;
    }
    const ids = ["about", "skills", "projects", "freelance", "experience", "blog"];
    const onScroll = () => {
      const probe = window.scrollY + 140;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= probe) current = id;
      }
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const isActive = (l: (typeof NAV)[number]): boolean => {
    if (l.id) return activeSection === l.id;
    if (l.href === "/") return pathname === "/" && !activeSection;
    return pathname.startsWith(l.href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight"
        >
          <img
            src="/favicon.webp"
            alt="Ashish Gupta logo"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover"
          />
          <span>
            Ashish<span className="text-primary">_</span>
            <span className="grad-text">Gupta</span>
          </span>
        </Link>

        {/* Desktop — same pill language as the chat mode switch */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                isActive(l)
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="site-mobile-nav"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {/* gradient hairline */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      {/* Mobile menu */}
      {open ? (
        <div
          id="site-mobile-nav"
          ref={drawerRef}
          role="dialog"
          aria-label="Site menu"
          className="border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden"
        >
          <nav className="mx-auto flex max-w-[1120px] flex-col gap-1 px-5 py-3">
            {NAV.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => {
                  setOpen(false);
                  requestAnimationFrame(() => toggleRef.current?.focus());
                }}
                className={cn(
                  "flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-sm font-medium",
                  isActive(l)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

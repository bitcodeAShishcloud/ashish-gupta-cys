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
  { href: "/#freelance", id: "freelance", label: "Freelance" },
  { href: "/#projects", id: "projects", label: "Projects" },
];

const ROUTE_LINKS: NavItem[] = [
  { href: "/blog", label: "Blog" },
  { href: "/chat", label: "Chat" },
];

/*
 * Slim 56px top bar in the chat page's design language (same favicon +
 * mono brand as /chat's own header). Section pills only show on home,
 * where the scroll-spy targets live; Blog/Chat pills show everywhere.
 */
export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";
  const NAV: NavItem[] = [
    { href: "/", label: "Home" },
    ...(isHome ? SECTION_LINKS : []),
    ...ROUTE_LINKS,
  ];

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
    if (!isHome) {
      setActiveSection(null);
      return;
    }
    const ids = ["about", "skills", "freelance", "projects", "experience", "blog"];
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
  }, [isHome]);

  const isActive = (l: NavItem): boolean => {
    if (l.id) return activeSection === l.id;
    if (l.href === "/") return isHome && !activeSection;
    return pathname.startsWith(l.href);
  };

  /* Pill styling — same language as the chat mode switch. */
  const pillCls = (l: NavItem) =>
    cn(
      "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
      isActive(l)
        ? "bg-white/10 text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-5">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Ashish Gupta — home"
        >
          <img
            src="/favicon.webp"
            alt="Ashish Gupta logo"
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
          />
          <span className="font-mono text-sm font-bold">Ashish_Gupta</span>
        </Link>

        {/* Desktop — chat mode-switch pill group */}
        <nav
          className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 md:flex"
          aria-label="Primary"
        >
          {NAV.map((l) => (
            <Link key={l.label} href={l.href} className={pillCls(l)}>
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
                  "flex min-h-[44px] items-center rounded-full px-4 py-2.5 text-sm font-medium",
                  isActive(l)
                    ? "bg-success/10 text-success"
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

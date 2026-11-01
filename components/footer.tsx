"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PORTFOLIO } from "@/lib/content";
import { Github, Linkedin, Mail, FileText } from "lucide-react";

/*
 * Single slim row everywhere — the same design language as the standalone
 * chat page's footer: © + legal links left, quiet social icons right.
 */
export function Footer() {
  const pathname = usePathname();
  const slim = pathname === "/chat";
  const s = PORTFOLIO.socials;
  const items = [
    { href: s.github, icon: Github, label: "GitHub" },
    { href: s.linkedin, icon: Linkedin, label: "LinkedIn" },
    { href: `mailto:${s.email}`, icon: Mail, label: "Email" },
    { href: s.resume, icon: FileText, label: "Resume" },
  ];

  return (
    <footer className="border-t border-border/60 bg-background/60">
      <div
        className={
          slim
            ? "mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2.5"
            : "mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5"
        }
      >
        <p className="truncate text-xs text-muted-foreground">
          © {new Date().getFullYear()}{" "}
          <span className="font-mono text-foreground">{PORTFOLIO.name}</span>
          {slim ? null : <span> · Cyber Security</span>}
          <span className="mx-1.5">·</span>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <span className="mx-1">·</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {items.map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

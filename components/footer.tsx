import Link from "next/link";
import { PORTFOLIO } from "@/lib/content";
import { Github, Linkedin, Mail, FileText } from "lucide-react";

export function Footer() {
  const s = PORTFOLIO.socials;
  const items = [
    { href: s.github, icon: Github, label: "GitHub" },
    { href: s.linkedin, icon: Linkedin, label: "LinkedIn" },
    { href: `mailto:${s.email}`, icon: Mail, label: "Email" },
    { href: s.resume, icon: FileText, label: "Resume" },
  ];
  return (
    <footer className="border-t border-border/60 bg-background/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()}{" "}
            <span className="font-mono text-foreground">{PORTFOLIO.name}</span>
            {" "}· Cyber Security
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <span className="mx-1.5">·</span>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms &amp; Conditions
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="inline-flex h-11 w-11 min-h-[44px] items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors duration-200 hover:border-primary/50 hover:text-primary"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

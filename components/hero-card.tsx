import { FileText, Github, Linkedin, Mail } from "lucide-react";
import { PORTFOLIO } from "@/lib/content";

/*
 * Hero profile card, glass panel with a soft white glow and a mono chip
 * header, centered on Ashish's photo. Server component: static links only.
 */
export function HeroCard() {
  const p = PORTFOLIO;
  const links = [
    { icon: Github, label: "GitHub", href: p.socials.github },
    { icon: Linkedin, label: "LinkedIn", href: p.socials.linkedin },
    { icon: Mail, label: "Email", href: `mailto:${p.socials.email}` },
    { icon: FileText, label: "Resume", href: p.socials.resume },
  ];

  return (
    <div
      className="animate-fade-in-up relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end"
      style={{ animationDelay: "150ms" }}
    >
      {/* soft corner glow (clamped on small screens) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-primary/25 blur-3xl sm:-bottom-16 sm:-left-16 sm:h-56 sm:w-56 sm:bg-primary/30"
      />
      <div className="glass relative w-full rounded-2xl border border-primary/20 p-5 shadow-[0_0_50px_hsl(var(--primary)/0.2)]">
        {/* header, same language as the reference card */}
        <div className="mb-4 flex items-center gap-2.5">
          <img
            src="/favicon.webp"
            alt="Ashish Gupta logo"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg object-cover"
          />
          <div>
            <p className="font-mono text-sm font-bold text-foreground">
              ashish <span className="text-primary">~</span> portfolio
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              profile
            </p>
          </div>
        </div>

        {/* photo, circular avatar */}
        <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full border-2 border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.4)] sm:h-44 sm:w-44">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/profile-photo.webp"
            alt={p.name}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={176}
            height={176}
            className="h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
        </div>

        {/* name + role */}
        <div className="mt-4 text-center">
          <h2 className="text-lg font-bold text-foreground">{p.name}</h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {p.role} · {p.education.institution}
          </p>
        </div>

        {/* socials */}
        <div className="mt-4 flex items-center gap-2">
          {links.map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="inline-flex h-11 min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors duration-200 hover:border-primary/50 hover:text-primary"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

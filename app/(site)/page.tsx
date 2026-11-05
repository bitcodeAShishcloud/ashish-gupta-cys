import Link from "next/link";
import Script from "next/script";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  Mail,
  Rocket,
  Shield,
  Terminal,
} from "lucide-react";
import { BLOG_POSTS, PORTFOLIO } from "@/lib/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { BrowserFrame } from "@/components/browser-frame";
import { ProjectsSection } from "@/components/projects-section";

/* All freelance screenshots ship at 1280×900. */
const THUMB_W = 1280;
const THUMB_H = 900;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="section-label font-mono text-xs uppercase tracking-widest text-primary">
      {children}
    </p>
  );
}

export default function HomePage() {
  const p = PORTFOLIO;

  const latestPosts = [...BLOG_POSTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  const freelance = p.projects.filter((proj) => proj.freelance);

  return (
    <div className="mx-auto max-w-[1120px] px-5">
      {/* ── Hero ── */}
      <section className="relative flex min-h-[calc(100vh-56px)] flex-col justify-center overflow-hidden py-16">
        {/* soft radial brand glow behind the hero (CSS layer above the mesh) */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-140px] h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[120px]"
        />
        {/* cursor-reactive mesh, hero only, decorative, fades at edges */}
        <canvas
          id="hero-mesh"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-0"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, #000 8%, #000 58%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, #000 8%, #000 58%, transparent 100%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
          {/* glowing profile orb — same language as the chat hero */}
          <div
            className="animate-fade-in-up relative mx-auto mb-8 h-28 w-28 sm:h-32 sm:w-32"
            style={{ animationDelay: "0ms" }}
          >
            <div
              aria-hidden
              className="absolute inset-0 rounded-full bg-primary/30 blur-2xl"
            />
            <img
              src="/assets/profile-photo.webp"
              alt="Ashish Gupta"
              width={128}
              height={128}
              className="relative h-28 w-28 rounded-full object-cover ring-1 ring-white/15 shadow-[0_0_60px_hsl(var(--primary)/0.45)] sm:h-32 sm:w-32"
            />
            <div
              aria-hidden
              className="absolute -inset-2 animate-pulse rounded-full border border-primary/20"
            />
          </div>

          <div
            className="animate-fade-in-up flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "80ms" }}
          >
            <Badge variant="success" className="font-mono">
              <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
              open to opportunities
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">~/portfolio</span>
          </div>

          <h1
            className="animate-fade-in-up mt-6 font-display text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "140ms" }}
          >
            Hi, I&apos;m <span className="grad-text">Ashish Gupta</span>
          </h1>

          <p
            className="animate-fade-in-up mt-5 flex items-center justify-center gap-2 font-mono text-base text-foreground sm:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            <Terminal className="h-5 w-5 text-secondary" aria-hidden />
            {p.role}
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{p.education.institution}</span>
          </p>

          <p
            className="animate-fade-in-up mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg"
            style={{ animationDelay: "240ms" }}
          >
            {p.tagline}
          </p>

          <div
            className="animate-fade-in-up mt-8 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "300ms" }}
          >
            <Button
              asChild
              className="grad-btn rounded-full px-6 shadow-[0_0_60px_hsl(var(--primary)/0.10),0_10px_40px_rgba(0,0,0,0.4)]"
            >
              <a href="#projects">
                <Rocket className="mr-2 h-4 w-4" /> View Projects
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-full px-5">
              <a href={`mailto:${p.socials.email}`}>
                <Mail className="mr-2 h-4 w-4" /> Contact
              </a>
            </Button>
            <Button asChild variant="success" className="rounded-full px-5">
              <Link href="/chat">
                <Terminal className="mr-2 h-4 w-4" aria-hidden /> Ask Ashish
              </Link>
            </Button>
          </div>

          <div
            className="animate-fade-in-up mx-auto mt-12 grid max-w-md grid-cols-3 gap-3"
            style={{ animationDelay: "360ms" }}
            aria-label="Portfolio stats"
          >
            {p.stats.map((s) => {
              const href =
                s.label === "Projects"
                  ? "#projects"
                  : s.label === "Internships"
                    ? "#experience"
                    : s.label === "Certifications"
                      ? "#certifications"
                      : null;
              const cls =
                "flex flex-col items-center justify-center rounded-full border border-border/70 bg-card/40 px-4 py-3 transition hover:border-primary/50 sm:px-5";
              const body = (
                <>
                  <div className="font-mono text-xl font-bold text-foreground sm:text-2xl">
                    <CountUp value={s.value} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                </>
              );
              return href ? (
                <a key={s.label} href={href} aria-label={`Jump to ${s.label}`} className={cls}>
                  {body}
                </a>
              ) : (
                <div key={s.label} className={cls}>
                  {body}
                </div>
              );
            })}
          </div>
        </div>
        <Script src="/hero-mesh.js" strategy="lazyOnload" />
      </section>

      {/* ── About + Education ── */}
      <section id="about" className="scroll-mt-24 py-16">
        <Reveal>
          <SectionLabel>{"about"}</SectionLabel>
          <h2 className="mt-1 font-display text-3xl font-bold">About Me</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="text-lg font-semibold">Who I am</h3>
                </div>
                <p className="mt-4 leading-7 text-muted-foreground">{p.about}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {p.education.subjects.map((s) => (
                    <Badge key={s} variant="secondary" className="font-mono text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="text-lg font-semibold">Education</h3>
                </div>
                <div className="mt-4 font-mono text-sm font-semibold">
                  {p.education.degree}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {p.education.institution} ·{" "}
                  <span className="font-mono">{p.education.year}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {p.education.description}
                </p>
              </CardContent>
            </Card>
          </div>
        </Reveal>
      </section>

      {/* ── Skills ── */}
      <section id="skills" className="scroll-mt-24 py-12">
        <Reveal>
          <SectionLabel>{"skills"}</SectionLabel>
          <h2 className="mt-1 font-display text-3xl font-bold">Skills &amp; Tools</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {p.skills.map((cat, ci) => (
              <Reveal key={cat.category} delay={ci * 80}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-5 w-5 text-primary" aria-hidden />
                      <h3 className="text-lg font-semibold">{cat.category}</h3>
                    </div>
                    <ul className="mt-5 space-y-4">
                      {cat.items.map((sk) => {
                        const label =
                          "skillLevel" in sk && sk.skillLevel ? String(sk.skillLevel) : null;
                        return (
                          <li key={sk.name}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">{sk.name}</span>
                              {label ? (
                                <Badge
                                  variant="outline"
                                  className={`font-mono text-[10px] ${
                                    label === "Core" ? "border-primary/40 text-primary" : ""
                                  }`}
                                >
                                  {label}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {sk.desc}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Projects: count-card filters + grid ── */}
      <section id="projects" className="scroll-mt-24 py-16">
        <Reveal>
          <SectionLabel>{"projects"}</SectionLabel>
          <h2 className="mt-1 font-display text-3xl font-bold">Projects</h2>
          <ProjectsSection projects={p.projects} />
        </Reveal>
      </section>

      {/* ── Freelance work, strongest proof of shipping ── */}
      <section id="freelance" className="scroll-mt-24 py-16">
        <Reveal>
          <SectionLabel>{"freelance work"}</SectionLabel>
          <h2 className="font-display text-3xl font-bold">Freelance Work</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Client properties and my own products, designed, built and shipped
            end-to-end solo, 2025-present. Each client build has a full
            technical case study on the{" "}
            <Link href="/blog" className="text-primary hover:underline">
              blog
            </Link>
            .
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {freelance.map((proj, i) => (
              <Reveal key={proj.name} delay={(i % 2) * 80}>
                <Card className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_44px_hsl(var(--primary)/0.10)]">
                  <CardContent className="p-4 sm:p-5">
                    <BrowserFrame
                      src={proj.image ?? `/blog-images/${proj.caseStudy}.webp`}
                      alt={`${proj.name}, live website screenshot`}
                      url={proj.live.replace(/^https?:\/\//, "")}
                      width={proj.thumbW ?? THUMB_W}
                      height={proj.thumbH ?? THUMB_H}
                    />
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold">{proj.name}</h3>
                      {proj.live ? (
                        <a
                          href={proj.live}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Visit ${proj.name}`}
                          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border border-border/70 px-3 font-mono text-xs text-muted-foreground transition-colors duration-200 hover:border-primary/50 hover:text-primary"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Live
                        </a>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {proj.desc}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {proj.tech.map((t) => (
                        <Badge key={t} variant="outline" className="font-mono text-[11px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    {proj.caseStudy ? (
                      <Link
                        href={`/blog/${proj.caseStudy}`}
                        className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-primary transition-colors hover:underline"
                      >
                        Case study <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ) : null}
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Internships, vertical timeline ── */}
      <section id="experience" className="scroll-mt-24 py-16">
        <Reveal>
          <SectionLabel>{"experience"}</SectionLabel>
          <h2 className="font-display text-3xl font-bold">Internships &amp; Work</h2>
          <ol className="relative mt-8 ml-1.5 space-y-10 border-l border-border pl-8">
            {p.experience.map((exp) => (
              <li key={exp.org} className="relative">
                <span
                  className="absolute -left-[41px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background"
                  aria-hidden
                />
                <div className="font-mono text-xs text-muted-foreground">{exp.year}</div>
                <h3 className="mt-1 text-lg font-semibold">{exp.title}</h3>
                <div className="mt-0.5 text-sm text-muted-foreground">{exp.org}</div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {exp.desc}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {exp.tech.map((t) => (
                    <Badge key={t} variant="secondary" className="font-mono text-[11px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* ── Certifications ── */}
      <section id="certifications" className="scroll-mt-24 py-12">
        <Reveal>
          <SectionLabel>{"certifications"}</SectionLabel>
          <h2 className="font-display text-3xl font-bold">Certifications</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {p.certifications.map((cert) => (
              <Card key={cert.title} className="transition-colors duration-200 hover:border-primary/40">
                <CardContent className="flex items-center gap-5 p-5">
                  {cert.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cert.image}
                      alt={cert.title}
                      loading="lazy"
                      decoding="async"
                      width={cert.imageWidth ?? 1024}
                      height={cert.imageHeight ?? 1024}
                      className="h-24 w-24 shrink-0 rounded-lg border border-border/60 bg-muted/40 object-cover"
                    />
                  ) : null}
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <Award className="h-4 w-4 text-secondary" aria-hidden /> {cert.title}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {cert.issuer} · {cert.date}
                    </div>
                    {cert.status ? (
                      <div className="mt-1.5 font-mono text-xs text-muted-foreground">
                        {cert.status}
                      </div>
                    ) : null}
                    {cert.link ? (
                      <a
                        href={cert.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Verify credential <ArrowRight className="h-3 w-3" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Latest posts ── */}
      <section id="blog" className="scroll-mt-24 py-12">
        <Reveal>
          <div className="flex items-end justify-between gap-4">
            <div>
              <SectionLabel>{"blog"}</SectionLabel>
              <h2 className="mt-1 font-display text-3xl font-bold">Latest Posts</h2>
            </div>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/blog">
                All posts <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {latestPosts.map((post, i) => (
              <Reveal key={post.id} delay={i * 80}>
                <Card className="h-full transition-colors duration-200 hover:border-primary/40">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">
                        {post.category}
                      </Badge>
                      {post.readTime}
                    </div>
                    <h3 className="mt-3 font-semibold leading-snug">{post.title}</h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
                      {post.excerpt}
                    </p>
                    <Link
                      href={`/blog/${post.id}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Read <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Contact CTA band ── */}
      <section id="contact" className="scroll-mt-24 py-16">
        <Reveal>
          <div className="rounded-3xl border border-primary/20 bg-primary/[0.03] p-8 text-center shadow-[0_0_60px_hsl(var(--primary)/0.10),0_10px_40px_rgba(0,0,0,0.4)] sm:p-12">
            <SectionLabel>{"get in touch"}</SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              Want to collaborate or have a question?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Reach out by email, connect on LinkedIn, or ask me anything
              through the chat — projects, skills, security, all fair game.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                className="grad-btn rounded-full px-6 shadow-[0_0_60px_hsl(var(--primary)/0.10)]"
              >
                <a href={`mailto:${p.socials.email}`}>
                  <Mail className="mr-2 h-4 w-4" aria-hidden /> Email Me
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-5">
                <a
                  href={p.socials.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BadgeCheck className="mr-2 h-4 w-4" aria-hidden /> LinkedIn
                </a>
              </Button>
              <Button asChild variant="success" className="rounded-full px-5">
                <Link href="/chat">
                  <Terminal className="mr-2 h-4 w-4" aria-hidden /> Ask Ashish
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

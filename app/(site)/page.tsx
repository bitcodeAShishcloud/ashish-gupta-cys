import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Briefcase,
  GraduationCap,
  Github,
  Globe,
  LayoutGrid,
  Mail,
  Rocket,
  Shield,
  Terminal,
} from "lucide-react";
import { BLOG_POSTS, PORTFOLIO } from "@/lib/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* ── Hero ── */}
      <section className="flex min-h-[calc(100vh-72px)] flex-col justify-center py-16">
        <div className="animate-fade-in-up">
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="success" className="font-mono">
              <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
              open to opportunities
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">~/portfolio</span>
          </div>
          <SectionLabel>{"who am i"}</SectionLabel>
          <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">
            Hi, I&apos;m <span className="grad-text">{p.name}</span>
          </h1>
          <p className="mt-3 flex items-center gap-2 font-mono text-lg text-foreground sm:text-2xl">
            <Terminal className="h-5 w-5 text-secondary" />
            {p.role}
          </p>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {p.tagline}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <a href="#projects">
                <Rocket className="mr-2 h-4 w-4" /> View Projects
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`mailto:${p.socials.email}`}>
                <Mail className="mr-2 h-4 w-4" /> Contact
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/chat">
                <Terminal className="mr-2 h-4 w-4" /> Ask the AI
              </Link>
            </Button>
          </div>
          <div className="mt-12 grid max-w-md grid-cols-3 gap-3">
            {p.stats.map((s) => (
              <div key={s.label} className="grad-card rounded-lg p-4 text-center">
                <div className="font-mono text-2xl font-bold text-primary">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About + Education ── */}
      <section id="about" className="py-20">
        <SectionLabel>{"about"}</SectionLabel>
        <h2 className="mt-1 text-3xl font-bold">About Me</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" /> Who I am
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{p.about}</p>
              <div className="flex flex-wrap gap-2">
                {p.education.subjects.map((s) => (
                  <Badge key={s} variant="secondary" className="font-mono text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" /> Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm text-primary">
                {p.education.degree}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {p.education.institution} ·{" "}
                <span className="font-mono">{p.education.year}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {p.education.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Skills ── */}
      <section id="skills" className="py-12">
        <SectionLabel>{"skills"}</SectionLabel>
        <h2 className="mt-1 text-3xl font-bold">Skills & Tools</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {p.skills.map((cat) => (
            <Card key={cat.category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LayoutGrid className="h-5 w-5 text-primary" /> {cat.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cat.items.map((sk) => (
                  <div key={sk.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{sk.name}</span>
                      {"level" in sk && sk.level ? (
                        <span className="font-mono text-xs text-primary">{sk.level}%</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{sk.desc}</p>
                    {"level" in sk && sk.level ? (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Number(sk.level)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Projects ── */}
      <section id="projects" className="py-20">
        <SectionLabel>{"projects"}</SectionLabel>
        <h2 className="mt-1 text-3xl font-bold">Projects</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {p.projects.map((proj) => (
            <Card key={proj.name} className="group transition-colors hover:border-primary/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">{proj.name}</h3>
                  <div className="flex gap-1.5">
                    {proj.github ? (
                      <a
                        href={proj.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${proj.name} source code`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    ) : null}
                    {proj.live ? (
                      <a
                        href={proj.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${proj.name} live demo`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{proj.desc}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {proj.tech.map((t) => (
                    <Badge key={t} variant="outline" className="font-mono text-[11px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Experience ── */}
      <section id="experience" className="py-12">
        <SectionLabel>{"experience"}</SectionLabel>
        <h2 className="mt-1 text-3xl font-bold">Internships</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {p.experience.map((exp) => (
            <Card key={exp.org}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="h-5 w-5 text-primary" /> {exp.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-sm text-primary">
                  {exp.org} · {exp.year}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{exp.desc}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {exp.tech.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[11px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Certifications ── */}
      <section id="certifications" className="py-12">
        <SectionLabel>{"certifications"}</SectionLabel>
        <h2 className="mt-1 text-3xl font-bold">Certifications</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {p.certifications.map((cert) => (
            <Card key={cert.title}>
              <CardContent className="flex items-center gap-4 p-5">
                {cert.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cert.image}
                    alt={cert.title}
                    className="h-20 w-20 shrink-0 rounded-lg border border-border/60 object-cover"
                  />
                ) : null}
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <Award className="h-4 w-4 text-secondary" /> {cert.title}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {cert.issuer} · {cert.date}
                  </div>
                  {cert.status ? (
                    <div className="mt-1 font-mono text-xs text-primary">{cert.status}</div>
                  ) : null}
                  {cert.link ? (
                    <a
                      href={cert.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View credential <ArrowRight className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Latest posts ── */}
      <section id="blog" className="py-12">
        <div className="flex items-end justify-between">
          <div>
            <SectionLabel>{"blog"}</SectionLabel>
            <h2 className="mt-1 text-3xl font-bold">Latest Posts</h2>
          </div>
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/blog">
              All posts <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {latestPosts.map((post) => (
            <Card key={post.id} className="transition-colors hover:border-primary/40">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">
                    {post.category}
                  </Badge>
                  {post.readTime}
                </div>
                <h3 className="mt-3 font-semibold leading-snug">{post.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {post.excerpt}
                </p>
                <Link
                  href={`/blog/${post.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Read <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Contact CTA ── */}
      <section className="py-20">
        <Separator />
        <div className="grad-card mt-8 rounded-xl p-8 text-center">
          <SectionLabel>{"get in touch"}</SectionLabel>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Want to collaborate or have a question?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Reach out by email, connect on LinkedIn, or ask the AI assistant
            about my work and skills.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <a href={`mailto:${p.socials.email}`}>
                <Mail className="mr-2 h-4 w-4" /> Email Me
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={p.socials.linkedin} target="_blank" rel="noopener noreferrer">
                <BadgeCheck className="mr-2 h-4 w-4" /> LinkedIn
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/chat">
                <Terminal className="mr-2 h-4 w-4" /> Chat with AI
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

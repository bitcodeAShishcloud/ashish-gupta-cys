"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

type ProjectItem = {
  name: string;
  desc: string;
  tech: string[];
  github?: string;
  live?: string;
  caseStudy?: string;
  freelance?: boolean;
  category?: string;
};

const isFreelance = (p: ProjectItem) => p.category === "Freelancing" || !!p.freelance;
const isGitHub = (p: ProjectItem) => p.category === "GitHub" || (!p.freelance && !!p.github);
const isOther = (p: ProjectItem) => !isFreelance(p) && !isGitHub(p);

/*
 * Projects grid with count-cards (same visual language as the hero stats).
 * Clicking a card filters the grid: All / Freelancing / GitHub Projects / Other.
 * The "Other" card only appears when at least one project has no GitHub repo
 * and is not freelance client work.
 */
export function ProjectsSection({ projects }: { projects: ProjectItem[] }) {
  const [active, setActive] = useState("All Projects");

  const cats = useMemo(
    () =>
      [
        { name: "All Projects", count: projects.length },
        { name: "Freelancing", count: projects.filter(isFreelance).length },
        { name: "GitHub Projects", count: projects.filter(isGitHub).length },
        { name: "Other", count: projects.filter(isOther).length },
      ].filter((c) => c.count > 0 || c.name === "All Projects"),
    [projects],
  );

  const filtered = useMemo(() => {
    if (active === "All Projects") return projects;
    if (active === "Freelancing") return projects.filter(isFreelance);
    if (active === "GitHub Projects") return projects.filter(isGitHub);
    return projects.filter(isOther);
  }, [active, projects]);

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cats.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setActive(c.name)}
            aria-pressed={active === c.name}
            className={cn(
              "min-h-[44px] cursor-pointer rounded-xl border p-4 text-center transition-colors duration-200",
              active === c.name
                ? "border-success/70 bg-success/5 text-success"
                : "border-border/70 bg-card/40 text-muted-foreground hover:border-white/25 hover:text-foreground",
            )}
          >
            <div className="font-mono text-2xl font-bold">{c.count}</div>
            <div className="mt-1 text-xs">{c.name}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {filtered.map((proj, i) => (
          <Reveal key={proj.name} delay={(i % 2) * 80}>
            <Card className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_44px_hsl(var(--primary)/0.10)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">{proj.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {proj.github ? (
                      <a
                        href={proj.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${proj.name} source code on GitHub`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-border/70 px-3 font-mono text-xs text-muted-foreground transition-colors duration-200 hover:border-primary/50 hover:text-primary"
                      >
                        <Github className="h-3.5 w-3.5" aria-hidden /> GitHub
                      </a>
                    ) : null}
                    {proj.live ? (
                      <a
                        href={proj.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${proj.name} live demo`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-border/70 px-3 font-mono text-xs text-muted-foreground transition-colors duration-200 hover:border-primary/50 hover:text-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Live
                      </a>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{proj.desc}</p>
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

      {filtered.length === 0 ? (
        <div className="grad-card mt-6 rounded-xl p-8 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </div>
      ) : null}
    </>
  );
}

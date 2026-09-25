"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BLOG_CATEGORIES, BLOG_POSTS } from "@/lib/content";

export default function BlogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...BLOG_POSTS]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((p) => {
        const inCat = category === "All" || p.category === category;
        const inQuery =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q));
        return inCat && inQuery;
      });
  }, [query, category]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <p className="section-label font-mono text-xs uppercase tracking-widest text-primary">
        blog
      </p>
      <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Blog & Writeups</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Notes from the lab, projects, security topics and hands-on guides.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {["All", ...BLOG_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 font-mono text-xs transition",
                category === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/40",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post) => (
          <Card key={post.id} className="transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              {post.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.image}
                  alt={post.title}
                  loading="lazy"
                  decoding="async"
                  className="mb-4 h-36 w-full rounded-lg border border-border/60 object-cover"
                />
              ) : null}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {post.category}
                </Badge>
                <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {post.readTime}
                </span>
              </div>
              <h2 className="mt-3 font-semibold leading-snug">{post.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {post.excerpt}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.slice(0, 3).map((t) => (
                  <Badge key={t} variant="outline" className="font-mono text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <Link
                href={`/blog/${post.id}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Read post <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="grad-card mt-10 rounded-lg p-10 text-center text-muted-foreground">
          No posts match &ldquo;{query}&rdquo;.
        </div>
      ) : null}
    </div>
  );
}

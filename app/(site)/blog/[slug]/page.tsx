"use client";

import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { BLOG_POSTS } from "@/lib/content";

export default function BlogPostPage() {
  const params = useParams();
  const slug = String(params.slug);
  const post = BLOG_POSTS.find((p) => p.id === slug);
  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{post.category}</Badge>
          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" /> {post.date}
          </span>
          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {post.readTime}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Badge key={t} variant="outline" className="font-mono text-[11px]">
              <Tag className="mr-1 h-3 w-3" />
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {post.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image}
          alt={post.title}
          fetchPriority="high"
          decoding="async"
          className="mt-8 max-h-96 w-full rounded-xl border border-border/60 object-cover"
        />
      ) : null}

      <Card className="mt-8">
        <CardContent className="p-6 sm:p-8">
          <Markdown>{post.content}</Markdown>
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { Reveal } from "@/components/reveal";
import { BLOG_POSTS } from "@/lib/content";

const SITE_URL = "https://www.ashishcys.cyou";

/*
 * Server component: content is pre-rendered per slug (generateStaticParams),
 * so each post is a real HTML document, SEO, og tags and the reading
 * experience all work without waiting for the client bundle. Only the
 * markdown renderer is client (react-markdown), which keeps the page's
 * script payload small.
 */
export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.id }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = BLOG_POSTS.find((p) => p.id === params.slug);
  if (!post) return { title: "Post not found" };
  const img = post.image
    ? {
        url: post.image,
        width: post.imageWidth ?? 1200,
        height: post.imageHeight ?? 675,
        alt: post.title,
      }
    : { url: "/assets/og-image.webp", width: 1200, height: 630, alt: "Ashish Gupta, Cyber Security Portfolio" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      locale: "en_US",
      url: `/blog/${post.id}`,
      siteName: "Ashish Gupta, Cyber Security",
      title: post.title,
      description: post.excerpt,
      images: [img],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [img.url],
    },
    alternates: { canonical: `/blog/${post.id}` },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find((p) => p.id === params.slug);
  if (!post) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Person", name: "Ashish Gupta", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Ashish Gupta", url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.id}` },
    image: post.image
      ? `${SITE_URL}${post.image}`
      : `${SITE_URL}/assets/og-image.webp`,
    articleSection: post.category,
    keywords: post.tags.join(", "),
  };

  return (
    <div className="relative mx-auto max-w-3xl px-5 py-16">
      {/* soft radial brand glow behind the header */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[110px]"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to blog
      </Link>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{post.category}</Badge>
          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" aria-hidden /> {post.date}
          </span>
          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden /> {post.readTime}
          </span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Badge key={t} variant="outline" className="font-mono text-[11px]">
              <Tag className="mr-1 h-3 w-3" aria-hidden />
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {post.image ? (
        /* Exact aspect ratio + max-height reserve the layout box before the
           image loads, so there is no layout shift. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image}
          alt={post.title}
          fetchPriority="high"
          decoding="async"
          width={post.imageWidth}
          height={post.imageHeight}
          style={{
            aspectRatio: `${post.imageWidth ?? 1200} / ${post.imageHeight ?? 675}`,
          }}
          className="mt-8 max-h-[480px] w-full rounded-xl border border-border/60 bg-muted/30 object-cover object-top"
        />
      ) : null}

      <Reveal>
        <Card className="mt-8">
          <CardContent className="p-6 sm:p-8">
            <Markdown>{post.content}</Markdown>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

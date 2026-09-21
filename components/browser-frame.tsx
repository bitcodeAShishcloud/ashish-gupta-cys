import { cn } from "@/lib/utils";

/**
 * Static "browser window" wrapper for site screenshots: a decorative chrome
 * bar (traffic lights + mono url) around a lazy-loaded WebP image. The body
 * reserves its exact aspect-ratio so images never cause layout shift (CLS).
 */
export function BrowserFrame({
  src,
  alt,
  url,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  url: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_10px_40px_-20px_hsl(var(--primary)/0.35)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="flex shrink-0 gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
        </span>
        <span className="mono flex-1 truncate rounded-md bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground">
          {url}
        </span>
      </div>
      <div className="relative" style={{ aspectRatio: `${width} / ${height}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={width}
          height={height}
          className="absolute inset-0 h-full w-full bg-muted/30 object-cover object-top"
        />
      </div>
    </div>
  );
}

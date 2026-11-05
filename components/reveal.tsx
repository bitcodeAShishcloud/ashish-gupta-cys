"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One-time scroll reveal. Animates transform/opacity only (GPU-friendly),
 * respects `prefers-reduced-motion`, and never re-triggers.
 *
 * The hidden state comes from the `.js` class on <html> (set inline before
 * first paint), not from this component — so if hydration never happens the
 * content is still visible instead of sitting at opacity:0.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No animation path: reveal immediately, never trap content at opacity 0.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-visible");
      return;
    }

    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }

    // Anything already in view on load should appear without waiting for a
    // scroll event — otherwise the first screen looks empty until interaction.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);

    // Failsafe: reveal after 1.2s even if the observer never fires.
    const failsafe = window.setTimeout(() => el.classList.add("is-visible"), 1200);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts an integer up the first time it enters the viewport.
 * `value` may carry a trailing suffix ("10+"), the numeral animates, the
 * suffix stays static. Respects `prefers-reduced-motion`.
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const suffix = value.length > 1 && !/^\d+$/.test(value) ? value.slice(-1) : "";
  const target = parseInt(value, 10);
  // Server + first paint render the real number; the effect below only replays
  // it as animation. Never ship a bare "0" the visitor could mistake for data.
  const [display, setDisplay] = useState(Number.isNaN(target) ? 0 : target);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      Number.isNaN(target) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(Number.isNaN(target) ? 0 : target);
      return;
    }

    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || started) return;
          started = true;
          const t0 = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / duration);
            setDisplay(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          // Start from 0 only once the element is actually on screen.
          setDisplay(0);
          raf = requestAnimationFrame(tick);
          io.disconnect();
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [target, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}

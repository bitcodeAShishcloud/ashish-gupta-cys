"use client";

import { useEffect, useRef } from "react";

interface P {
  x: number;
  y: number;
  r: number; // core radius
  hue: number; // 187 cyan | 217 shield blue | 0 (white, sat=0)
  sat: number;
  light: number;
  phase: number; // twinkle phase
  speed: number; // twinkle rad/s
  vx: number; // drift px/s
  vy: number;
  base: number; // base alpha
}

/*
 * Ambient point-light field: tiny glowing dots ("pixels of light") that
 * twinkle and drift slowly upward, denser near the center of the screen.
 * Pure canvas, no dependencies. Honors prefers-reduced-motion (renders a
 * static field instead of animating).
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const density = 0.00022;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let parts: P[] = [];
    let raf = 0;
    let last = performance.now();

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    // Triangular distribution around 0 → dots cluster near the center
    const center = () => Math.random() + Math.random() - 1;

    const spawn = (): P => {
      const white = Math.random() < 0.35;
      const blue = !white && Math.random() < 0.45;
      const depth = Math.random();
      return {
        x: w / 2 + center() * w * 0.55,
        y: h / 2 + center() * h * 0.55,
        r: 0.5 + depth * 1.5,
        hue: white ? 0 : blue ? 217 : 187,
        sat: white ? 0 : 100,
        light: white ? 92 : 60 + depth * 10,
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.35, 1.4),
        vx: rand(-6, 6),
        vy: rand(-9, -2.5),
        base: 0.25 + depth * 0.5,
      };
    };

    function build() {
      const count = Math.max(60, Math.min(240, Math.round(w * h * density)));
      parts = Array.from({ length: count }, spawn);
    }

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduced) drawFrame(0);
    }

    function drawFrame(t: number) {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const tw = 0.5 + 0.5 * Math.sin(p.phase + t * p.speed);
        const a = p.base * (0.15 + 0.85 * tw);
        // soft halo
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${a * 0.18})`;
        ctx.arc(p.x, p.y, p.r * 4.5, 0, Math.PI * 2);
        ctx.fill();
        // bright core
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${Math.min(96, p.light + 18)}%, ${a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function step(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      for (const p of parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < -12) {
          p.y = h + 12;
          p.x = w / 2 + center() * w * 0.55;
        }
        if (p.x < -12) p.x = w + 12;
        else if (p.x > w + 12) p.x = -12;
      }
      drawFrame(t);
      raf = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener("resize", resize);
    if (!reduced) {
      raf = requestAnimationFrame((n) => {
        last = n;
        step(n);
      });
    }
    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[-1]" />;
}

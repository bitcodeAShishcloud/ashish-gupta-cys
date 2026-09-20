"use client";

import { useEffect, useRef } from "react";

/*
 * WebGL dot grid — a fixed grid of tiny square "pixel lights" that blink in
 * place (each cell re-rolls its opacity every ~2/speed seconds, matching the
 * cyberinvaders.tech reference). Denser toward the center via a radial
 * falloff. Pure WebGL2, no dependencies.
 *
 * Colors: neon violet #5e17eb — same palette as the reference.
 * Honors prefers-reduced-motion (renders one static frame, no blinking).
 */

const VERT = `#version 300 es
precision highp float;
in vec2 a_position;
uniform vec2 u_resolution;
out vec2 fragCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  fragCoord = (a_position + vec2(1.0)) * 0.5 * u_resolution;
  fragCoord.y = u_resolution.y - fragCoord.y;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 fragCoord;
uniform float u_time;
uniform float u_opacities[10];
uniform vec3 u_colors[6];
uniform float u_total_size;
uniform float u_dot_size;
uniform float u_speed;
uniform vec2 u_resolution;

out vec4 fragColor;

float random(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 st = fragCoord;
  // align the grid so a dot sits dead-center of the screen
  st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
  st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));

  float inGrid = step(0.0, st.x) * step(0.0, st.y);
  vec2 cell = floor(st / u_total_size);
  float cellSeed = random(cell);

  // blink: each cell picks a new opacity slot every flickerRate seconds
  float flickerRate = 2.0 / max(u_speed, 0.1);
  float jitter = random(cell + vec2(7.3, 5.1)) * flickerRate;
  float flickerTime = mod(u_time + jitter, 1000.0);
  float flickerIdx = random(cell + vec2(floor(flickerTime / flickerRate)));
  float opacity = u_opacities[clamp(int(flickerIdx * 10.0), 0, 9)];

  // small square dot mask
  float fx = fract(st.x / u_total_size);
  float fy = fract(st.y / u_total_size);
  float dotMask = (1.0 - step(u_dot_size / u_total_size, fx))
                * (1.0 - step(u_dot_size / u_total_size, fy));

  // intro reveal, from center outward
  vec2 centerGrid = u_resolution / 2.0 / u_total_size;
  float dist = distance(centerGrid, cell);
  float revealOffset = dist * 0.015 + random(cell + vec2(3.7)) * 0.2;
  float revealed = step(revealOffset, u_time * 0.5);

  // center-dense: full at the middle, ~20% at the corners
  float maxD = max(length(centerGrid), 1.0);
  float edge = mix(0.2, 1.0, clamp(1.0 - dist / maxD, 0.0, 1.0));

  float finalOpacity = opacity * dotMask * inGrid * revealed * edge;
  vec3 color = u_colors[clamp(int(cellSeed * 6.0), 0, 5)];
  fragColor = vec4(color, finalOpacity);
}`;

export function DotGrid() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    // Prefer WebGL2 (required for dynamic uniform-array indexing in the
    // fragment shader); fall back to a plain Canvas2D dot grid if absent.
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    }) as WebGL2RenderingContext | null;

    if (!gl) {
      return runCanvas2DFallback(canvas);
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Brand colors (RGB 0-1): violet family — mostly neon violet #5e17eb,
    // with lighter violet/lavender variants so the dots stay clearly visible
    // on the pure-black background.
    const colors = [
      94 / 255, 23 / 255, 235 / 255, // #5e17eb
      94 / 255, 23 / 255, 235 / 255, // #5e17eb
      139 / 255, 92 / 255, 246 / 255, // #8b5cf6 lighter violet
      139 / 255, 92 / 255, 246 / 255, // #8b5cf6
      167 / 255, 139 / 255, 250 / 255, // #a78bfa lavender
      167 / 255, 139 / 255, 250 / 255, // #a78bfa
    ];
    const opacities = [0.08, 0.08, 0.12, 0.12, 0.18, 0.18, 0.3, 0.42, 0.6, 0.85];
    const speed = 3;

    function compile(type: number, src: string) {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.warn("DotGrid shader compile failed:", gl!.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    // GL resources (program, buffer, attribute setup) are invalidated when
    // the context is lost, so everything below is wrapped in initGL() and
    // re-run after a restore.
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let loc = {
      res: null,
      time: null,
      opacities: null,
      colors: null,
      total: null,
      dot: null,
      speed: null,
    } as Record<string, WebGLUniformLocation | null>;

    function initGL(): boolean {
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;
      const prog = gl.createProgram();
      if (!prog) return false;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("DotGrid program link failed:", gl.getProgramInfoLog(prog));
        return false;
      }
      program = prog;
      gl.useProgram(prog);

      // fullscreen quad
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const aPos = gl.getAttribLocation(prog, "a_position");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      loc = {
        res: gl.getUniformLocation(prog, "u_resolution"),
        time: gl.getUniformLocation(prog, "u_time"),
        opacities: gl.getUniformLocation(prog, "u_opacities"),
        colors: gl.getUniformLocation(prog, "u_colors"),
        total: gl.getUniformLocation(prog, "u_total_size"),
        dot: gl.getUniformLocation(prog, "u_dot_size"),
        speed: gl.getUniformLocation(prog, "u_speed"),
      };
      gl.uniform1f(loc.speed, speed);
      gl.uniform1fv(loc.opacities, opacities);
      gl.uniform3fv(loc.colors, colors);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      return true;
    }

    if (!initGL()) return;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform2f(loc.res, canvas!.width, canvas!.height);
      // cell/dot sizes in CSS pixels, converted to device pixels
      gl!.uniform1f(loc.total, 20 * dpr);
      gl!.uniform1f(loc.dot, 4 * dpr);
      if (reduced) draw(40);
    }

    function draw(timeSec: number) {
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.uniform1f(loc.time, timeSec);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    }

    let raf = 0;
    let lost = false;
    const startRef = performance.now();
    function start(now: number) {
      draw((now - startRef) / 1000);
      raf = requestAnimationFrame(start);
    }

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      if (raf) cancelAnimationFrame(raf);
    };
    const onRestored = () => {
      if (lost && gl) {
        lost = false;
        // GL resources were invalidated by the context loss — rebuild them
        initGL();
        resize();
        if (!reduced) raf = requestAnimationFrame(start);
      }
    };
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);

    resize();
    window.addEventListener("resize", resize);
    if (!reduced) raf = requestAnimationFrame(start);

    return () => {
      window.removeEventListener("resize", resize);
      canvas?.removeEventListener("webglcontextlost", onLost);
      canvas?.removeEventListener("webglcontextrestored", onRestored);
      if (raf) cancelAnimationFrame(raf);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[-1]" />;
}

/*
 * Dependency-free fallback: draw the same grid of blinking squares on a
 * 2D canvas. Only used when WebGL2 is unavailable (very old browsers).
 */
function runCanvas2DFallback(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const colors: [number, number, number][] = [
    [94, 23, 235],
    [139, 92, 246],
    [167, 139, 250],
  ];
  let w = 0;
  let h = 0;
  let raf = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Per-cell static attributes so the blink is stable per cell
  const cellCount = () => {
    const cell = 20;
    return { cols: Math.ceil(w / cell) + 1, rows: Math.ceil(h / cell) + 1, cell };
  };
  function seed(i: number, n: number) {
    return Math.abs(Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1;
  }

  function draw(t: number) {
    ctx!.clearRect(0, 0, w, h);
    const { cols, rows, cell } = cellCount();
    const cx = w / 2;
    const cy = h / 2;
    const flickerRate = 2 / 3;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const px = x * cell + cell / 2 - cx + w / 2;
        const py = y * cell + cell / 2 - cy + h / 2;
        const d = Math.hypot(px - w / 2, py - h / 2);
        const maxD = Math.hypot(w, h) / 2;
        const edge = 0.2 + 0.8 * Math.max(0, 1 - d / maxD);
        const slot = Math.floor(seed(i, 1) * 10);
        const color = colors[slot % colors.length];
        let alpha = 0.06 + (slot / 9) * 0.55;
        if (!reduced) {
          const tick = Math.floor((t / flickerRate) + seed(i, 2) * flickerRate);
          alpha *= 0.4 + 0.6 * seed(i + tick, 3);
        }
        ctx!.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${(alpha * edge).toFixed(3)})`;
        ctx!.fillRect(px - 2, py - 2, 4, 4);
      }
    }
  }

  resize();
  window.addEventListener("resize", resize);
  if (!reduced) {
    const t0 = performance.now();
    const loop = (now: number) => {
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  } else {
    draw(0);
  }
  return () => {
    window.removeEventListener("resize", resize);
    if (raf) cancelAnimationFrame(raf);
  };
}

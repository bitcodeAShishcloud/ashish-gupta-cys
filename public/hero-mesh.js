/* Hero cursor-reactive triangular mesh (apmix-inspired, original implementation).
 * Vanilla Canvas2D, seeded PRNG, spring physics, sleeping loop.
 * DESKTOP-ONLY: enabled on >=1024px viewports with a fine pointer (mouse);
 * mobile/tablet stay clean (no canvas, no ghost cursor).
 * Deferred, CSP-safe (external file, no inline/eval). Decorative only. */
(function () {
  "use strict";

  // ── Config ──
  var CFG = {
    spacing: 56, spacingMobile: 48, jitter: 4,
    dotRadius: 1.25, restDotAlpha: 0.15, restLineAlpha: 0.065, maxAlpha: 0.45,
    radius: 150, repelStrength: 70, stiffness: 0.12, damping: 0.84,
    cursorLerp: 0.3, heatDecay: 1.3, fieldEase: 0.14,
    dprCap: 2, fadeMs: 500, buckets: 8
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktopMQ = window.matchMedia("(min-width: 1024px) and (pointer: fine)");

  var canvas = document.getElementById("hero-mesh");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var hero = canvas.closest("section") || canvas.parentElement;
  var inited = false, enabled = false;

  if (!desktopMQ.matches) {
    // mobile / tablet: no effect at all — hero looks as it did before
    canvas.style.display = "none";
  }

  // ── Lattice state ──
  var pos, home, vel, heat, vA, edges, N = 0;
  var W = 0, H = 0;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rebuild(w, h) {
    W = w; H = h;
    var dpr = Math.min(window.devicePixelRatio || 1, CFG.dprCap);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var S = w < 1280 ? CFG.spacingMobile : CFG.spacing;
    var rowH = S * Math.sqrt(3) / 2;
    var cols = Math.ceil(w / S) + 1;
    var rows = Math.ceil(h / rowH) + 1;
    N = cols * rows;

    pos = new Float32Array(N * 2);
    home = new Float32Array(N * 2);
    vel = new Float32Array(N * 2);
    heat = new Float32Array(N);
    vA = new Float32Array(N);

    var rnd = mulberry32(1337);
    for (var r = 0; r < rows; r++) {
      var off = (r % 2 ? S / 2 : 0);
      for (var c = 0; c < cols; c++) {
        var i = (r * cols + c) * 2;
        var x = c * S + off + (rnd() * 2 - 1) * CFG.jitter;
        var y = r * rowH + (rnd() * 2 - 1) * CFG.jitter;
        home[i] = x; home[i + 1] = y;
        pos[i] = x; pos[i + 1] = y;
      }
    }

    edges = [];
    for (var rr = 0; rr < rows; rr++) {
      for (var cc = 0; cc < cols; cc++) {
        var ii = rr * cols + cc;
        if (cc + 1 < cols) edges.push(ii, ii + 1);
        if (rr + 1 < rows) {
          edges.push(ii, (rr + 1) * cols + cc);
          if (cc + 1 < cols) edges.push(ii, (rr + 1) * cols + cc + 1);
        }
      }
    }
    drawRest();
  }

  // ── Cursor state ──
  var cx = -9999, cy = -9999, tx = -9999, ty = -9999;
  var active = false, fieldR = 0;

  function onMove(e) {
    if (!enabled) return;
    var rect = canvas.getBoundingClientRect();
    tx = e.clientX - rect.left;
    ty = e.clientY - rect.top;
    active = true;
    wake();
  }
  function onLeave() { active = false; }

  hero.addEventListener("pointermove", onMove, { passive: true });
  hero.addEventListener("pointerleave", onLeave, { passive: true });

  // ── Grading: pure white, 8 alpha buckets (white → bright) ──
  var strokeColors = [];
  (function () {
    for (var b = 0; b < CFG.buckets; b++) {
      var t = b / (CFG.buckets - 1);
      var a = CFG.restLineAlpha + (CFG.maxAlpha - CFG.restLineAlpha) * t;
      strokeColors.push("rgba(255,255,255," + a + ")");
    }
  })();

  // ── Physics / draw loop ──
  var raf = 0, last = 0, idle = true, activeBool = false;

  function tick(dt) {
    var targetR = active ? CFG.radius : 0;
    fieldR += (targetR - fieldR) * CFG.fieldEase;
    if (fieldR < 1) fieldR = 0;

    if (active) {
      cx += (tx - cx) * CFG.cursorLerp;
      cy += (ty - cy) * CFG.cursorLerp;
    } else {
      cx = -9999; cy = -9999;
    }

    var moving = fieldR > 1 || active;
    var i, j;
    var R = fieldR > 1 ? fieldR : 1;
    for (i = 0; i < N; i++) {
      j = i * 2;
      var px = pos[j], py = pos[j + 1];
      var fx = (home[j] - px) * CFG.stiffness;
      var fy = (home[j + 1] - py) * CFG.stiffness;

      if (fieldR > 1 && cx > -5000) {
        var dx = px - cx, dy = py - cy;
        var d2 = dx * dx + dy * dy;
        var f = Math.max(0, 1 - d2 / (R * R));
        var inv = d2 > 0.0001 ? 1 / Math.sqrt(d2) : 0;
        var push = f * CFG.repelStrength;
        fx += dx * inv * push;
        fy += dy * inv * push;
        heat[i] += f * dt * 2.4;
      }

      vel[j] = (vel[j] + fx * dt) * CFG.damping;
      vel[j + 1] = (vel[j + 1] + fy * dt) * CFG.damping;
      pos[j] += vel[j];
      pos[j + 1] += vel[j + 1];

      if (heat[i] > 0) heat[i] -= heat[i] * CFG.heatDecay * dt * 1.5;
      if (heat[i] < 0.001) heat[i] = 0;

      if (Math.abs(vel[j]) > 0.15 || Math.abs(vel[j + 1]) > 0.15 || heat[i] > 0.02) moving = true;
    }
    activeBool = moving;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var dr = CFG.dotRadius;
    var i, j;

    // vertex dots (rest)
    ctx.fillStyle = "rgba(255,255,255," + CFG.restDotAlpha + ")";
    for (i = 0; i < N; i++) {
      j = i * 2;
      ctx.fillRect(pos[j] - dr, pos[j + 1] - dr, dr * 2, dr * 2);
    }
    // brighter hot dots
    if (activeBool) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (i = 0; i < N; i++) {
        if (heat[i] > 0.05) {
          ctx.fillRect(pos[i * 2] - dr, pos[i * 2 + 1] - dr, dr * 2, dr * 2);
        }
      }
    }

    // per-vertex alpha = distance falloff + heat
    if (activeBool && fieldR > 1 && cx > -5000) {
      for (i = 0; i < N; i++) {
        j = i * 2;
        var ddx = pos[j] - cx, ddy = pos[j + 1] - cy;
        var nd = Math.max(0, 1 - Math.sqrt(ddx * ddx + ddy * ddy) / fieldR);
        var a = CFG.restLineAlpha + (CFG.maxAlpha - CFG.restLineAlpha) * nd + heat[i] * 0.25;
        vA[i] = a > CFG.maxAlpha ? CFG.maxAlpha : a;
      }
    } else {
      for (i = 0; i < N; i++) vA[i] = CFG.restLineAlpha;
    }

    // lines batched into alpha buckets, half-pixel snapped for crispness
    var B = CFG.buckets;
    var paths = [], counts = [];
    for (var k = 0; k < B; k++) { paths.push(new Path2D()); counts.push(0); }
    for (var e = 0; e < edges.length; e += 2) {
      var a0 = edges[e], a1 = edges[e + 1];
      var alpha = vA[a0] > vA[a1] ? vA[a0] : vA[a1];
      var buck = Math.floor((alpha - CFG.restLineAlpha) / (CFG.maxAlpha - CFG.restLineAlpha) * B);
      if (buck < 0) buck = 0; if (buck > B - 1) buck = B - 1;
      paths[buck].moveTo((pos[a0 * 2] * 2 | 0) / 2, (pos[a0 * 2 + 1] * 2 | 0) / 2);
      paths[buck].lineTo((pos[a1 * 2] * 2 | 0) / 2, (pos[a1 * 2 + 1] * 2 | 0) / 2);
      counts[buck]++;
    }
    ctx.lineWidth = 1;
    for (var b2 = 0; b2 < B; b2++) {
      if (!counts[b2]) continue;
      ctx.strokeStyle = strokeColors[b2];
      ctx.stroke(paths[b2]);
    }
  }

  function drawRest() {
    if (!home) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255," + CFG.restDotAlpha + ")";
    var dr = CFG.dotRadius;
    for (var i = 0; i < N; i++) {
      ctx.fillRect(home[i * 2] - dr, home[i * 2 + 1] - dr, dr * 2, dr * 2);
    }
    ctx.strokeStyle = "rgba(255,255,255," + CFG.restLineAlpha + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var e = 0; e < edges.length; e += 2) {
      var a0 = edges[e], a1 = edges[e + 1];
      ctx.moveTo(home[a0 * 2], home[a0 * 2 + 1]);
      ctx.lineTo(home[a1 * 2], home[a1 * 2 + 1]);
    }
    ctx.stroke();
  }

  function wake() {
    if (!enabled || reduceMotion) return;
    if (idle && raf === 0) {
      idle = false;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    tick(dt);
    if (!activeBool && fieldR <= 1 && !active) {
      idle = true;
      raf = 0;
      drawRest(); // pristine resting lattice, then full stop (0% idle CPU)
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  // ── Lifecycle ──
  var ro = new ResizeObserver(function (entries) {
    var cr = entries[0].contentRect;
    clearTimeout(ro._t);
    ro._t = setTimeout(function () {
      if (!enabled) return;
      rebuild(Math.round(cr.width), Math.round(cr.height));
      wake();
    }, 150);
  });
  try { ro.observe(canvas.parentElement); } catch (e) { }

  var io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) wake();
    else if (raf) { cancelAnimationFrame(raf); raf = 0; idle = true; }
  }, { threshold: 0.01 });
  try { io.observe(hero); } catch (e) { }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; idle = true; } }
    else wake();
  });

  function start() {
    var rect = hero.getBoundingClientRect();
    rebuild(Math.round(rect.width), Math.round(rect.height));
    canvas.style.display = "";
    canvas.style.transition = "opacity " + CFG.fadeMs + "ms ease";
    canvas.style.opacity = "1";
    wake();
  }

  function disable() {
    enabled = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    idle = true;
    canvas.style.display = "none";
    ctx.clearRect(0, 0, W, H);
  }

  function onMQ(e) {
    if (e.matches) {
      enabled = !reduceMotion;
      if (!inited) { inited = true; init(); }
      else { canvas.style.display = ""; wake(); }
    } else {
      disable();
    }
  }
  if (desktopMQ.addEventListener) desktopMQ.addEventListener("change", onMQ);
  else if (desktopMQ.addListener) desktopMQ.addListener(onMQ);

  function init() {
    canvas.style.opacity = "0";
    (window.requestIdleCallback || function (cb) { setTimeout(cb, 120); })(start);
  }

  // ── Boot ──
  if (desktopMQ.matches && reduceMotion) {
    // static lattice once; no interaction, no loop
    enabled = false;
    inited = true;
    var r0 = hero.getBoundingClientRect();
    rebuild(Math.round(r0.width), Math.round(r0.height));
    canvas.style.display = "";
    canvas.style.transition = "opacity " + CFG.fadeMs + "ms ease";
    canvas.style.opacity = "1";
  } else if (desktopMQ.matches) {
    enabled = true;
    inited = true;
    init();
  }
})();

/* Hero triangular lattice (apmix-inspired, original implementation).
 * STATIC by design: no cursor reaction, no animation loop, no listeners.
 * Draws the resting lattice once per resize, then stops. Desktop-only:
 * mobile and tablet keep the plain hero background.
 * Deferred, CSP-safe (external file, no inline/eval). Decorative only. */
(function () {
  "use strict";

  var CFG = {
    spacing: 56, spacingMobile: 48, jitter: 4,
    dotRadius: 1.25, restDotAlpha: 0.15, restLineAlpha: 0.065,
    dprCap: 2, fadeMs: 500
  };

  var desktopMQ = window.matchMedia("(min-width: 1024px) and (pointer: fine)");

  var canvas = document.getElementById("hero-mesh");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var hero = canvas.closest("section") || canvas.parentElement;

  if (!desktopMQ.matches) {
    // mobile / tablet: no lattice at all, hero stays as before
    canvas.style.display = "none";
    return;
  }

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

    var home = new Float32Array(cols * rows * 2);
    var rnd = mulberry32(1337);
    for (var r = 0; r < rows; r++) {
      var off = (r % 2 ? S / 2 : 0);
      for (var c = 0; c < cols; c++) {
        var i = (r * cols + c) * 2;
        home[i] = c * S + off + (rnd() * 2 - 1) * CFG.jitter;
        home[i + 1] = r * rowH + (rnd() * 2 - 1) * CFG.jitter;
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255," + CFG.restDotAlpha + ")";
    var dr = CFG.dotRadius;
    for (var v = 0; v < home.length; v += 2) {
      ctx.fillRect(home[v] - dr, home[v + 1] - dr, dr * 2, dr * 2);
    }
    ctx.strokeStyle = "rgba(255,255,255," + CFG.restLineAlpha + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var rr = 0; rr < rows; rr++) {
      for (var cc = 0; cc < cols; cc++) {
        var a = (rr * cols + cc) * 2;
        if (cc + 1 < cols) {
          var b = a + 2;
          ctx.moveTo(home[a], home[a + 1]);
          ctx.lineTo(home[b], home[b + 1]);
        }
        if (rr + 1 < rows) {
          var dl = ((rr + 1) * cols + cc) * 2;
          ctx.moveTo(home[a], home[a + 1]);
          ctx.lineTo(home[dl], home[dl + 1]);
          if (cc + 1 < cols) {
            var drr = dl + 2;
            ctx.moveTo(home[a], home[a + 1]);
            ctx.lineTo(home[drr], home[drr + 1]);
          }
        }
      }
    }
    ctx.stroke();
  }

  function draw() {
    var rect = hero.getBoundingClientRect();
    rebuild(Math.round(rect.width), Math.round(rect.height));
    canvas.style.display = "";
    canvas.style.transition = "opacity " + CFG.fadeMs + "ms ease";
    canvas.style.opacity = "0";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        canvas.style.opacity = "1";
      });
    });
  }

  var ro = new ResizeObserver(function (entries) {
    var cr = entries[0].contentRect;
    clearTimeout(ro._t);
    ro._t = setTimeout(function () {
      rebuild(Math.round(cr.width), Math.round(cr.height));
    }, 150);
  });
  try { ro.observe(canvas.parentElement); } catch (e) { }

  draw();
})();

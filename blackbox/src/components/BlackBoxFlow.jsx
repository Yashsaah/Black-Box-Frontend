import { useEffect, useRef } from "react";
import { useTheme } from "../lib/theme";

/* The name, shot rather than diagrammed.

   Raw data runs in from the left as strands of binary, disappears into an
   object nobody can see inside, and leaves the far side as sorted colour.

   Everything that makes it read as a photograph rather than a chart is doing
   a job: the key light picks out two arrises so the form is legible, the
   contact shadow and the floor reflection put it on a surface, the bloom on
   the output cables says they are emitting rather than painted, and the far
   strands are thinner and softer so the frame has depth. */

const IN = 34;
const OUT = 38;
// A spectrum with no amber — the site has no warm accent.
const HUES = [200, 192, 178, 165, 152, 262, 280, 300, 322, 208, 186, 272];
const BITS = "01";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const hex2rgb = (s) => {
  const t = s.replace("#", "").trim();
  const n = parseInt(t.length === 3 ? t.split("").map((c) => c + c).join("") : t, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const shade = ([r, g, b], k) =>
  k >= 0
    ? `rgb(${Math.round(r + (255 - r) * k)},${Math.round(g + (255 - g) * k)},${Math.round(
        b + (255 - b) * k
      )})`
    : `rgb(${Math.round(r * (1 + k))},${Math.round(g * (1 + k))},${Math.round(b * (1 + k))})`;

// Cubic bezier position and tangent, for placing glyphs along a cable.
const cub = (a, b, c, d, t) => {
  const m = 1 - t;
  return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d;
};
const cubT = (a, b, c, d, t) => {
  const m = 1 - t;
  return 3 * m * m * (b - a) + 6 * m * t * (c - b) + 3 * t * t * (d - c);
};

export default function BlackBoxFlow() {
  const wrap = useRef(null);
  const cv = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = cv.current;
    const box = wrap.current;
    if (!canvas || !box) return;
    const ctx = canvas.getContext("2d");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const css = getComputedStyle(document.documentElement);
    const light = document.documentElement.dataset.theme === "light";
    const FACE = hex2rgb(css.getPropertyValue("--box-face") || "#151a22");
    const TOP = hex2rgb(css.getPropertyValue("--box-top") || "#242c37");
    const SIDE = hex2rgb(css.getPropertyValue("--box-side") || "#0d1117");
    const BG = hex2rgb(css.getPropertyValue("--bg") || "#07080a");
    const wire = light ? "70,78,90" : "168,178,192";

    const hue = (h, a) => `hsla(${h}, ${light ? 74 : 86}%, ${light ? 46 : 63}%, ${a})`;

    let w = 0;
    let h = 0;
    let raf = 0;
    let t0 = 0;

    const seedRow = (n, spread, bits) =>
      Array.from({ length: n }, (_, i) => {
        const u = n === 1 ? 0.5 : i / (n - 1);
        // Depth drives width, brightness and softness together, the way one
        // distance would in a real lens.
        const depth = Math.random();
        return {
          u,
          y: 0.5 + (u - 0.5) * spread,
          jit: Math.random() * 2 - 1,
          off: Math.random(),
          sway: 0.5 + Math.random() * 0.9,
          depth,
          weight: 0.5 + depth * 1.9,
          hue: HUES[(i * 5) % HUES.length],
          bits: bits && i % 3 === 1,
          seed: Math.floor(Math.random() * 1e6),
        };
      });

    const ins = seedRow(IN, 1.2, true);
    const outs = seedRow(OUT, 1.42, false);

    const size = () => {
      const r = box.getBoundingClientRect();
      w = r.width;
      h = r.height;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now) => {
      if (!w || !h) {
        raf = requestAnimationFrame(frame);
        return;
      }
      if (!t0) t0 = now;
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);

      // --- staging -------------------------------------------------------
      // A slow drift, so the shot never sits perfectly still.
      const driftX = Math.sin(t * 0.17) * w * 0.006;
      const driftY = Math.cos(t * 0.13) * h * 0.008;

      const bw = w * 0.3;
      const bh = h * 0.3;
      const dx = w * 0.082;
      const dy = h * 0.17;
      const bx = w * 0.46 - bw / 2 - dx / 2 + driftX;
      const by = h * 0.5 - bh / 2 + dy / 2 + driftY;
      const gy = by + bh; // the surface the box stands on

      const inX = bx;
      const inY = by + bh * 0.52;
      const outX = bx + bw + dx * 0.55;
      const outY = by - dy * 0.55 + bh * 0.5;

      const key = 0.82 + 0.18 * Math.sin(t * 0.5); // key-light breath

      // --- cables --------------------------------------------------------
      const ctrl = (from, to, boxAt, s) => {
        const sway = Math.sin(t * s.sway + s.off * 9) * h * 0.028;
        const span = to[0] - from[0];
        return boxAt === "start"
          ? [
              [from[0] + span * 0.56, from[1]],
              [from[0] + span * 0.82, to[1] + sway],
            ]
          : [
              [from[0] + span * 0.18, from[1] + sway],
              [to[0] - span * 0.56, to[1]],
            ];
      };

      const curve = (from, to, c) => {
        ctx.beginPath();
        ctx.moveTo(from[0], from[1]);
        ctx.bezierCurveTo(c[0][0], c[0][1], c[1][0], c[1][1], to[0], to[1]);
      };

      const strand = (s, from, to, boxAt, colour, speed, glow) => {
        const c = ctrl(from, to, boxAt, s);
        const soft = (1 - s.depth) * 5; // far cables lose their edge

        // the cable
        curve(from, to, c);
        ctx.shadowBlur = soft;
        ctx.shadowColor = colour(0.5);
        ctx.lineWidth = s.weight;
        ctx.strokeStyle = colour(0.2 + s.depth * 0.34);
        ctx.stroke();

        // the signal on it, bloomed
        curve(from, to, c);
        ctx.shadowBlur = glow * (6 + s.depth * 16);
        ctx.shadowColor = colour(0.9);
        ctx.setLineDash([h * 0.1, h * 1.55]);
        ctx.lineDashOffset = -((t * speed + s.off * 900) % 2000);
        ctx.lineWidth = s.weight * 1.5;
        ctx.strokeStyle = colour(0.35 + s.depth * 0.65);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        return c;
      };

      // Binary riding the input cables — the raw material, before the box.
      const glyphs = (s, from, to, c) => {
        const n = 7;
        const flow = ((t * 0.09 + s.off) % 1) * (1 / n);
        ctx.font = `${(7 + s.depth * 4).toFixed(1)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < n; i++) {
          const u = i / n + flow;
          if (u > 0.93) continue;
          const x = cub(from[0], c[0][0], c[1][0], to[0], u);
          const y = cub(from[1], c[0][1], c[1][1], to[1], u);
          const tx = cubT(from[0], c[0][0], c[1][0], to[0], u);
          const ty = cubT(from[1], c[0][1], c[1][1], to[1], u);
          const a = (0.25 + s.depth * 0.6) * clamp01(u * 4) * clamp01((0.95 - u) * 5);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.atan2(ty, tx));
          ctx.fillStyle = `rgba(${wire},${a})`;
          ctx.fillText(BITS[(s.seed + i) % 2], 0, 0);
          ctx.restore();
        }
      };

      const drawCables = () => {
        ctx.lineCap = "round";
        for (const s of ins) {
          const from = [-w * 0.1, h * s.y + s.jit * h * 0.025];
          const to = [inX + bw * 0.5, inY + (s.u - 0.5) * bh * 0.66 + s.jit * bh * 0.04];
          const c = strand(s, from, to, "end", (a) => `rgba(${wire},${a})`, 205, 0.45);
          if (s.bits) glyphs(s, from, to, c);
        }
        for (const s of outs) {
          const from = [outX - bw * 0.5, outY + (s.u - 0.5) * bh * 0.7 + s.jit * bh * 0.04];
          const to = [w * 1.1, h * s.y + s.jit * h * 0.03];
          strand(s, from, to, "start", (a) => hue(s.hue, a), 245, 1);
        }
      };

      // --- the object ----------------------------------------------------
      const poly = (pts) => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
      };

      const FRONT = [
        [bx, by],
        [bx + bw, by],
        [bx + bw, by + bh],
        [bx, by + bh],
      ];
      const TOPF = [
        [bx, by],
        [bx + dx, by - dy],
        [bx + bw + dx, by - dy],
        [bx + bw, by],
      ];
      const SIDEF = [
        [bx + bw, by],
        [bx + bw + dx, by - dy],
        [bx + bw + dx, by - dy + bh],
        [bx + bw, by + bh],
      ];

      const drawBox = () => {
        // Top: brightest at the front-left arris where the key lands.
        let g = ctx.createLinearGradient(bx, by, bx + bw + dx, by - dy);
        g.addColorStop(0, shade(TOP, 0.22 * key));
        g.addColorStop(0.55, shade(TOP, 0.02));
        g.addColorStop(1, shade(TOP, -0.3));
        poly(TOPF);
        ctx.fillStyle = g;
        ctx.fill();

        // Front: falls off toward the floor, so the box has weight.
        g = ctx.createLinearGradient(bx, by, bx + bw * 0.35, by + bh);
        g.addColorStop(0, shade(FACE, 0.2 * key));
        g.addColorStop(0.62, shade(FACE, -0.02));
        g.addColorStop(1, shade(FACE, -0.34));
        poly(FRONT);
        ctx.fillStyle = g;
        ctx.fill();

        // Side: in shadow, but picking up spill from the output.
        g = ctx.createLinearGradient(bx + bw, by, bx + bw + dx, by + bh);
        g.addColorStop(0, shade(SIDE, -0.25));
        g.addColorStop(1, shade(SIDE, 0.06));
        poly(SIDEF);
        ctx.fillStyle = g;
        ctx.fill();

        // Chamfer: a hairline just inside the top face reads as a machined
        // edge rather than as an outline.
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.05 * key})`;
        poly([
          [bx + dx * 0.12, by - dy * 0.1],
          [bx + dx * 0.95, by - dy * 0.88],
          [bx + bw + dx * 0.9, by - dy * 0.88],
          [bx + bw * 0.97, by - dy * 0.05],
        ]);
        ctx.stroke();

        // Key-lit arrises, brightest nearest the light.
        const rim = ctx.createLinearGradient(bx, by - dy, bx + bw + dx, by + bh);
        rim.addColorStop(0, `rgba(255,255,255,${0.5 * key})`);
        rim.addColorStop(0.45, `rgba(255,255,255,${0.16 * key})`);
        rim.addColorStop(1, "rgba(255,255,255,0.04)");
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bx, by + bh);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + dx, by - dy);
        ctx.lineTo(bx + bw + dx, by - dy);
        ctx.lineTo(bx + bw + dx, by - dy + bh);
        ctx.stroke();

        // The seam where the output leaves the object.
        const seam = ctx.createLinearGradient(bx + bw, 0, bx + bw + dx * 1.6, 0);
        seam.addColorStop(0, hue(198, 0));
        seam.addColorStop(1, hue(198, 0.3 * key));
        poly(SIDEF);
        ctx.fillStyle = seam;
        ctx.fill();
      };

      const scene = () => {
        drawCables();
        drawBox();
      };

      // --- floor reflection ----------------------------------------------
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, gy, w, h - gy);
      ctx.clip();
      ctx.translate(0, gy * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = light ? 0.16 : 0.3;
      scene();
      ctx.restore();

      // Fade it out with depth, the way a polished surface would.
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const fade = ctx.createLinearGradient(0, gy, 0, gy + h * 0.42);
      fade.addColorStop(0, "rgba(0,0,0,0.35)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, gy, w, h - gy);
      ctx.restore();

      // --- studio glow, behind everything --------------------------------
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      const halo = ctx.createRadialGradient(
        bx + bw * 0.5,
        by + bh * 0.1,
        0,
        bx + bw * 0.5,
        by + bh * 0.1,
        Math.max(w, h) * 0.55
      );
      halo.addColorStop(0, light ? "rgba(255,255,255,0.4)" : "rgba(120,150,190,0.14)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // --- contact shadow, then the object itself -------------------------
      const sh = ctx.createRadialGradient(
        bx + bw * 0.55,
        gy + h * 0.012,
        0,
        bx + bw * 0.55,
        gy + h * 0.012,
        bw * 0.85
      );
      sh.addColorStop(0, `rgba(0,0,0,${light ? 0.34 : 0.72})`);
      sh.addColorStop(0.5, `rgba(0,0,0,${light ? 0.14 : 0.34})`);
      sh.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.translate(0, gy + h * 0.012);
      ctx.scale(1, 0.14);
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.arc(bx + bw * 0.55, 0, bw * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      scene();

      // --- anamorphic streak, starting clear of the object ----------------
      const fx = bx + bw + dx;
      const flare = ctx.createLinearGradient(fx, 0, fx + w * 0.42, 0);
      flare.addColorStop(0, hue(198, 0.2 * key));
      flare.addColorStop(1, hue(198, 0));
      ctx.fillStyle = flare;
      ctx.fillRect(fx, outY - h * 0.009, w * 0.42, h * 0.018);

      // --- vignette --------------------------------------------------------
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.28, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, `rgba(${BG[0]},${BG[1]},${BG[2]},${light ? 0.5 : 0.8})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      /* Feather the three inboard edges so the canvas has no visible
         boundary — the shot dissolves into the page instead of sitting in a
         rectangle, and the input cables fade in out of the dark. The right
         edge is left hard because it is the edge of the viewport. */
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const edgeMask = (x0, y0, x1, y1, span) => {
        const g2 = ctx.createLinearGradient(x0, y0, x1, y1);
        g2.addColorStop(0, "rgba(0,0,0,1)");
        g2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g2;
        ctx.fillRect(...span);
      };
      edgeMask(0, 0, w * 0.3, 0, [0, 0, w * 0.3, h]);
      edgeMask(0, 0, 0, h * 0.18, [0, 0, w, h * 0.18]);
      edgeMask(0, h, 0, h * 0.82, [0, h * 0.82, w, h * 0.18]);
      ctx.restore();

      raf = requestAnimationFrame(frame);
    };

    size();
    const ro = new ResizeObserver(size);
    ro.observe(box);

    if (calm) {
      t0 = performance.now() - 3000;
      raf = requestAnimationFrame((n) => {
        frame(n);
        cancelAnimationFrame(raf);
      });
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
      };
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme]);

  return (
    <div className="bbf" ref={wrap}>
      <canvas ref={cv} aria-hidden="true" />
      <span className="bbf__label bbf__label--in mono">Input · raw</span>
      <span className="bbf__label bbf__label--out mono">Output · structured</span>
      <span className="sr">
        An animation of binary data running into a black box and leaving the far side as sorted,
        coloured signal.
      </span>
    </div>
  );
}

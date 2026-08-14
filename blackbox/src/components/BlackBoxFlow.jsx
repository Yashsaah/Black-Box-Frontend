import { useEffect, useRef } from "react";
import { useTheme } from "../lib/theme";

/* The name, drawn.

   Undifferentiated strands run in from the left, disappear into a box nobody
   can see inside, and come back out the right sorted and coloured. Signal
   travels along every strand continuously — colourless going in, structured
   coming out. That is the whole argument of the group in one picture.

   The box stays black in both themes: a white box would invert the metaphor,
   so its faces come from their own tokens rather than from --panel. */

const IN = 30;
const OUT = 34;
// A spectrum with no amber in it — the site has no warm accent any more.
const HUES = [200, 192, 178, 165, 152, 262, 280, 300, 322, 208, 186, 272];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

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
    const face = css.getPropertyValue("--box-face").trim() || "#0e1116";
    const top = css.getPropertyValue("--box-top").trim() || "#151a21";
    const side = css.getPropertyValue("--box-side").trim() || "#0a0d11";
    const edge = css.getPropertyValue("--box-edge").trim() || "rgba(255,255,255,0.14)";
    const wire = light ? "60,66,76" : "150,158,170";

    const hue = (h, a) => `hsla(${h}, ${light ? 72 : 84}%, ${light ? 44 : 62}%, ${a})`;

    let w = 0;
    let h = 0;
    let raf = 0;
    let t0 = 0;

    // Fixed per-strand character, so the bundle doesn't reshuffle each frame.
    const seedRow = (n, spread) =>
      Array.from({ length: n }, (_, i) => {
        const u = n === 1 ? 0.5 : i / (n - 1);
        return {
          u,
          y: 0.5 + (u - 0.5) * spread,
          jit: Math.random() * 2 - 1,
          off: Math.random(),
          sway: 0.6 + Math.random() * 0.9,
          weight: 0.55 + Math.random() * 0.75,
          hue: HUES[i % HUES.length],
        };
      });

    const ins = seedRow(IN, 1.15);
    const outs = seedRow(OUT, 1.38);

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

      // --- box metrics, an oblique cuboid showing top, front and right ---
      const bw = w * 0.34;
      const bh = h * 0.3;
      const dx = w * 0.095;
      const dy = h * 0.17;
      const bx = w * 0.5 - bw / 2 - dx / 2;
      const by = h * 0.52 - bh / 2 + dy / 2;

      const inX = bx;
      const inY = by + bh * 0.52;
      const outX = bx + bw + dx * 0.55;
      const outY = by - dy * 0.55 + bh * 0.5;

      // --- ground shadow, so the box sits on something ---
      const gy = by + bh + h * 0.02;
      const g = ctx.createRadialGradient(bx + bw / 2, gy, 0, bx + bw / 2, gy, bw * 0.95);
      g.addColorStop(0, `rgba(0,0,0,${light ? 0.16 : 0.5})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(0, gy);
      ctx.scale(1, 0.2);
      ctx.beginPath();
      ctx.arc(bx + bw / 2, 0, bw * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- strands, drawn before the box so it occludes their ends ---
      /* The control point on the box side sits level with its endpoint, so a
         wire leaves the face horizontally the way a real cable would, and only
         bends once it is clear of the object. `boxAt` says which end that is. */
      const strand = (s, from, to, boxAt, colour, speed) => {
        const sway = Math.sin(t * s.sway + s.off * 9) * h * 0.03;
        const span = to[0] - from[0];
        // The long horizontal run before the bend is what makes these read as
        // cables leaving an object rather than as rays from a point.
        const c1 =
          boxAt === "start"
            ? [from[0] + span * 0.56, from[1]]
            : [from[0] + span * 0.18, from[1] + sway];
        const c2 =
          boxAt === "start"
            ? [from[0] + span * 0.82, to[1] + sway]
            : [to[0] - span * 0.56, to[1]];

        ctx.beginPath();
        ctx.moveTo(from[0], from[1]);
        ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], to[0], to[1]);

        // the wire itself
        ctx.lineWidth = s.weight;
        ctx.strokeStyle = colour(0.55);
        ctx.stroke();

        // signal running along it
        ctx.setLineDash([h * 0.1, h * 1.6]);
        ctx.lineDashOffset = -((t * speed + s.off * 900) % 2000);
        ctx.lineWidth = s.weight * 2.2;
        ctx.strokeStyle = colour(1);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      ctx.lineCap = "round";

      // Entry and exit points spread across the face as a ribbon rather than
      // pinching to one node, and sit well inside the silhouette so the ends
      // are hidden by the box.
      for (const s of ins) {
        const y0 = h * s.y + s.jit * h * 0.025;
        const ey = inY + (s.u - 0.5) * bh * 0.66 + s.jit * bh * 0.04;
        strand(s, [-w * 0.08, y0], [inX + bw * 0.5, ey], "end", (a) => `rgba(${wire},${a})`, 210);
      }

      for (const s of outs) {
        const y1 = h * s.y + s.jit * h * 0.03;
        const sy = outY + (s.u - 0.5) * bh * 0.7 + s.jit * bh * 0.04;
        strand(s, [outX - bw * 0.5, sy], [w * 1.08, y1], "start", (a) => hue(s.hue, a), 240);
      }

      // --- the box ---
      const path = (pts) => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
      };

      path([
        [bx, by],
        [bx + bw, by],
        [bx + bw, by + bh],
        [bx, by + bh],
      ]);
      ctx.fillStyle = face;
      ctx.fill();

      path([
        [bx, by],
        [bx + dx, by - dy],
        [bx + bw + dx, by - dy],
        [bx + bw, by],
      ]);
      ctx.fillStyle = top;
      ctx.fill();

      path([
        [bx + bw, by],
        [bx + bw + dx, by - dy],
        [bx + bw + dx, by - dy + bh],
        [bx + bw, by + bh],
      ]);
      ctx.fillStyle = side;
      ctx.fill();

      // A hairline round the silhouette keeps the object legible against a
      // panel that is nearly as dark as it is.
      ctx.lineWidth = 1;
      ctx.strokeStyle = light ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.07)";
      path([
        [bx, by],
        [bx + dx, by - dy],
        [bx + bw + dx, by - dy],
        [bx + bw + dx, by - dy + bh],
        [bx + bw, by + bh],
        [bx, by + bh],
      ]);
      ctx.stroke();

      // Edge highlights along the two lit arrises only — a full wireframe
      // would read as a diagram rather than as an object.
      ctx.strokeStyle = edge;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + dx, by - dy);
      ctx.lineTo(bx + bw + dx, by - dy);
      ctx.lineTo(bx + bw, by);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bw + dx, by - dy);
      ctx.lineTo(bx + bw + dx, by - dy + bh);
      ctx.stroke();

      // A slow breath of light where the output face meets the strands.
      const pulse = 0.35 + 0.65 * clamp01(Math.sin(t * 1.1) * 0.5 + 0.5);
      const seam = ctx.createLinearGradient(bx + bw, 0, bx + bw + dx, 0);
      seam.addColorStop(0, hue(200, 0));
      seam.addColorStop(1, hue(200, 0.22 * pulse));
      ctx.fillStyle = seam;
      path([
        [bx + bw, by],
        [bx + bw + dx, by - dy],
        [bx + bw + dx, by - dy + bh],
        [bx + bw, by + bh],
      ]);
      ctx.fill();

      raf = requestAnimationFrame(frame);
    };

    size();
    const ro = new ResizeObserver(size);
    ro.observe(box);

    if (calm) {
      t0 = performance.now() - 2000;
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
    <figure className="bbf">
      <div className="bbf__stage" ref={wrap}>
        <canvas ref={cv} aria-hidden="true" />
        <span className="bbf__tick bbf__tick--tl" aria-hidden="true" />
        <span className="bbf__tick bbf__tick--tr" aria-hidden="true" />
        <span className="bbf__tick bbf__tick--bl" aria-hidden="true" />
        <span className="bbf__tick bbf__tick--br" aria-hidden="true" />
        <span className="bbf__label bbf__label--in mono">Input</span>
        <span className="bbf__label bbf__label--out mono">Output</span>
      </div>
      <figcaption className="mono">
        Undifferentiated in, structured out — and no view of the middle
      </figcaption>
    </figure>
  );
}

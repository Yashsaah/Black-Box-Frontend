import { useEffect, useRef, useState } from "react";
import { useTheme } from "../lib/theme";

/* A sampler running in the open.

   Fifteen hundred points sit in noise. A sweep crosses the frame and, as it
   passes, the points it touches resolve into a structure — a manifold, a loss
   surface, an attractor — hold long enough to be read, then dissolve back to
   noise and the next form begins. It is the one picture that covers what all
   three of our threads are about: order pulled out of a distribution.

   Drawn in ink rather than in glow, so it reads the same on paper as it does
   on black. Scrolling disperses the cloud and hands the page over. */

const COUNT = 1900;
const CYCLE = 11000; // ms per noise → form → noise
const CAM = 3.15;
const FOCAL = 2.6;

const hex = (h) => {
  const s = h.replace("#", "").trim();
  const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t) => t * t * (3 - 2 * t);

const GOLDEN = Math.PI * (1 + Math.sqrt(5));

const FORMS = [
  {
    name: "latent manifold",
    // Fibonacci sphere — every point equidistant, no seams.
    at: (i, n) => {
      const k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / n);
      const th = GOLDEN * k;
      const s = Math.sin(phi);
      return [Math.cos(th) * s, Math.sin(th) * s * 0.94, Math.cos(phi)];
    },
  },
  {
    name: "loss surface",
    at: (i, n) => {
      const g = 40;
      const rows = Math.ceil(n / g);
      const a = (Math.floor(i / g) / (rows - 1) - 0.5) * 2;
      const b = ((i % g) / (g - 1) - 0.5) * 2;
      // Kept compact — spread this many points any wider and the surface
      // stops reading as a surface.
      return [b * 0.94, Math.sin(b * 2.6) * Math.cos(a * 2.6) * 0.5, a * 0.94];
    },
  },
  {
    name: "attractor",
    at: (i, n) => {
      const g = 30;
      const rings = Math.ceil(n / g);
      const u = (Math.floor(i / g) / rings) * Math.PI * 2;
      const v = ((i % g) / g) * Math.PI * 2;
      const R = 0.74;
      const r = 0.29;
      return [
        (R + r * Math.cos(v)) * Math.cos(u),
        r * Math.sin(v) + Math.sin(u * 3) * 0.12,
        (R + r * Math.cos(v)) * Math.sin(u),
      ];
    },
  },
];

export default function LatentField() {
  const wrap = useRef(null);
  const cv = useRef(null);
  const stepEl = useRef(null);
  const [form, setForm] = useState(FORMS[0].name);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = cv.current;
    const box = wrap.current;
    if (!canvas || !box) return;
    const ctx = canvas.getContext("2d");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const css = getComputedStyle(document.documentElement);
    const INK = hex(css.getPropertyValue("--ink") || "#f4f2ee");
    const FAINT = hex(css.getPropertyValue("--faint") || "#7e848e");
    const SIGNAL = hex(css.getPropertyValue("--signal") || "#ff6b4a");
    // Halos read as light on black and as smudge on paper, so paper gets less.
    const GLOW = document.documentElement.dataset.theme === "light" ? 0.45 : 1;

    let w = 0;
    let h = 0;
    let raf = 0;
    let t0 = 0;
    let cycle = -1;
    let fi = -1;
    let scroll = 0;

    // Base noise positions are fixed; the wobble on top keeps the cloud alive
    // without letting it random-walk out of frame.
    const pts = Array.from({ length: COUNT }, (_, i) => {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      // Roughly the radius the forms occupy. Any wider and full noise scatters
      // past the edges of the frame instead of filling it.
      const r = 0.7 + Math.random() * 0.62;
      const s = Math.sin(ph);
      return {
        bx: s * Math.cos(th) * r,
        by: s * Math.sin(th) * r * 0.72,
        bz: Math.cos(ph) * r,
        tx: 0,
        ty: 0,
        tz: 0,
        s: Math.random(),
        accent: i % 17 === 0,
      };
    });

    const setForm_ = (n) => {
      const fn = FORMS[n].at;
      for (let i = 0; i < COUNT; i++) {
        const [x, y, z] = fn(i, COUNT);
        pts[i].tx = x;
        pts[i].ty = y;
        pts[i].tz = z;
      }
    };

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
      const el = now - t0;
      const t = el / 1000;

      const c = Math.floor(el / CYCLE);
      if (c !== cycle) {
        cycle = c;
        fi = (fi + 1) % FORMS.length;
        setForm_(fi);
        setForm(FORMS[fi].name);
      }
      const ph = (el % CYCLE) / CYCLE;

      const r = box.getBoundingClientRect();
      const target = clamp01(-r.top / Math.max(r.height, 1));
      scroll += (target - scroll) * 0.08;

      // Fade the previous frame instead of clearing it — trails, on a canvas
      // that stays transparent so the page ground shows through.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      const denoising = ph < 0.36;
      const sweep = -1.6 + (ph / 0.36) * 3.2;

      const ry = t * 0.2 + scroll * 1.1;
      const rx = Math.sin(t * 0.14) * 0.24;
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      const cx = w * (w > 900 ? 0.72 : 0.5);
      const cy = h * 0.5;
      const S = Math.min(w, h) * 0.44;
      const spread = 1 + scroll * 1.4;
      const globalFade = 1 - scroll * 0.75;

      for (const p of pts) {
        let m;
        if (denoising) {
          // Mask against the target's *rotated* x, so what resolves is always
          // what the sampling line has actually crossed on screen.
          m = clamp01((sweep - (p.tx * cosY + p.tz * sinY)) / 0.55);
        } else if (ph < 0.74) {
          m = 1;
        } else {
          m = clamp01(1 - ((ph - 0.74) / 0.26) * 1.4 + p.s * 0.36);
        }
        m = ease(m);

        const nx = p.bx + Math.sin(t * 0.5 + p.s * 12) * 0.09;
        const ny = p.by + Math.cos(t * 0.43 + p.s * 21) * 0.09;
        const nz = p.bz + Math.sin(t * 0.37 + p.s * 33) * 0.09;

        let x = (nx + (p.tx - nx) * m) * spread;
        let y = (ny + (p.ty - ny) * m) * spread;
        let z = (nz + (p.tz - nz) * m) * spread;

        // rotate Y, then X
        const x1 = x * cosY + z * sinY;
        const z1 = z * cosY - x * sinY;
        const y1 = y * cosX - z1 * sinX;
        const z2 = z1 * cosX + y * sinX;

        const zc = CAM - z2;
        if (zc < 0.5) continue;
        const k = FOCAL / zc;
        const sx = cx + x1 * k * S;
        const sy = cy - y1 * k * S;
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;

        const dep = clamp01((1.34 - zc / CAM) * 1.5);
        // Noise has to read as a field, not as an empty frame, so the m = 0
        // floor is high. Resolving still roughly doubles both alpha and
        // radius, which is where the pop comes from.
        const a = (0.38 + 0.48 * m) * (0.3 + 0.7 * dep) * globalFade;
        if (a < 0.012) continue;

        const hot = p.accent && m > 0.35;
        if (hot) {
          const R = k * (7 + 16 * m);
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
          g.addColorStop(0, rgba(SIGNAL, 0.3 * a * GLOW));
          g.addColorStop(1, rgba(SIGNAL, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, R, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = rgba(hot ? SIGNAL : mix(FAINT, INK, m), a);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.7, k * (1.45 + 1.35 * m)), 0, Math.PI * 2);
        ctx.fill();
      }

      // The sampling head, crossing the frame ahead of the resolved points.
      if (denoising && globalFade > 0.05) {
        const k0 = FOCAL / CAM;
        const lx = cx + sweep * k0 * S;
        const top = cy - S * 1.05;
        const len = S * 2.1;
        const edge = Math.min(1, Math.min(ph, 0.36 - ph) / 0.05) * globalFade;
        const g = ctx.createLinearGradient(lx - 30, 0, lx + 30, 0);
        g.addColorStop(0, rgba(SIGNAL, 0));
        g.addColorStop(0.5, rgba(SIGNAL, 0.16 * edge));
        g.addColorStop(1, rgba(SIGNAL, 0));
        ctx.fillStyle = g;
        ctx.fillRect(lx - 30, top, 60, len);
        ctx.fillStyle = rgba(SIGNAL, 0.7 * edge);
        ctx.fillRect(lx - 0.6, top, 1.2, len);
      }

      if (stepEl.current) {
        const step = Math.round((denoising ? ph / 0.36 : 1) * 512);
        stepEl.current.textContent = String(step).padStart(3, "0");
      }

      raf = requestAnimationFrame(frame);
    };

    size();
    const ro = new ResizeObserver(size);
    ro.observe(box);

    if (calm) {
      // One resolved frame, no sampler, no drift.
      fi = 0;
      cycle = 0;
      setForm_(0);
      t0 = performance.now() - CYCLE * 0.5;
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
    <div className="field" ref={wrap}>
      <canvas ref={cv} aria-hidden="true" />
      <p className="field__hud mono" aria-hidden="true">
        <i className="field__blip" />
        sampling
        <span className="field__form">{form}</span>
        <span className="field__step" ref={stepEl}>
          000
        </span>
      </p>
      <span className="sr">
        An animated field of points that resolves out of noise into a structure, holds, and
        dissolves back into noise.
      </span>
    </div>
  );
}

import { useMemo } from "react";
import useInView from "../lib/useInView";

/* One live figure per research thread. Each draws itself the first time it
   scrolls into view — the curve gets traced, the heatmap blooms, the network
   prunes down to its winning ticket. All SVG, all on currentColor, so the pen
   colour and the theme swap come for free. */

// Deterministic, so the sparse network doesn't reshuffle between renders.
const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function DoubleDescent() {
  return (
    <>
      <path className="fig__axis" d="M14 12 V104 H206" />
      <path
        className="fig__curve"
        pathLength="1"
        d="M14 34 C 38 68, 56 86, 76 86 C 94 86, 102 48, 114 20 C 130 46, 158 84, 206 94"
      />
      <path className="fig__thresh" d="M114 14 V104" pathLength="1" />
      <circle className="fig__dot" cx="114" cy="20" r="3" />
      <circle className="fig__dot fig__dot--2" cx="196" cy="93" r="3" />
      <text className="fig__t" x="121" y="34">
        interpolation
      </text>
      <text className="fig__t fig__t--r" x="202" y="88">
        second descent
      </text>
    </>
  );
}

function GradCam() {
  const cells = useMemo(() => {
    const out = [];
    const hx = 6.4;
    const hy = 2.6; // hot spot, in cell coordinates
    for (let cxi = 0; cxi < 10; cxi++) {
      for (let cyi = 0; cyi < 5; cyi++) {
        const d = Math.hypot(cxi - hx, (cyi - hy) * 1.15);
        const heat = Math.max(0, 1 - d / 4.4);
        if (heat <= 0.02) continue;
        out.push({
          x: 16 + cxi * 19,
          y: 15 + cyi * 18,
          o: Math.pow(heat, 1.5),
          d: d * 90,
        });
      }
    }
    return out;
  }, []);

  return (
    <>
      <rect className="fig__frame" x="14" y="13" width="192" height="92" />
      {cells.map((c, i) => (
        <rect
          key={i}
          className="fig__cell"
          x={c.x}
          y={c.y}
          width="17"
          height="16"
          style={{ "--o": c.o, transitionDelay: `${c.d}ms`, animationDelay: `${600 + c.d}ms` }}
        />
      ))}
      {/* Sits on the hot cell — 16 + 6.4·19, 15 + 2.6·18, plus half a cell. */}
      <path className="fig__cross" d="M136 70 h21 M146 60 v20" />
      <text className="fig__t" x="18" y="118">
        last conv layer · gradient weighted
      </text>
    </>
  );
}

function Lottery() {
  const { nodes, edges } = useMemo(() => {
    const rng = lcg(20260814);
    const cols = [5, 6, 5];
    const xs = [30, 110, 190];
    const nodes = cols.map((count, c) =>
      Array.from({ length: count }, (_, i) => ({
        x: xs[c],
        y: 22 + (i / (count - 1)) * 74,
      }))
    );
    const edges = [];
    const at = (c, i, j) => edges.findIndex((e) => e.c === c && e.i === i && e.j === j);
    for (let c = 0; c < 2; c++) {
      for (let i = 0; i < nodes[c].length; i++) {
        const seen = new Set();
        for (let k = 0; k < 3; k++) {
          const j = Math.floor(rng() * nodes[c + 1].length);
          if (seen.has(j)) continue;
          seen.add(j);
          edges.push({ c, i, j, a: nodes[c][i], b: nodes[c + 1][j], keep: false });
        }
      }
    }

    // The winning ticket has to run the whole width — scattered surviving
    // stubs would read as noise, not as a subnetwork.
    const paths = [
      [0, 1, 0],
      [2, 3, 2],
      [4, 4, 4],
    ];
    for (const [a, b, c] of paths) {
      for (const [col, from, to] of [
        [0, a, b],
        [1, b, c],
      ]) {
        const hit = at(col, from, to);
        if (hit >= 0) edges[hit].keep = true;
        else
          edges.push({
            c: col,
            i: from,
            j: to,
            a: nodes[col][from],
            b: nodes[col + 1][to],
            keep: true,
          });
      }
    }
    return { nodes, edges };
  }, []);

  return (
    <>
      {edges.map((e, i) => (
        <line
          key={i}
          className={`fig__e ${e.keep ? "fig__e--keep" : ""}`}
          x1={e.a.x}
          y1={e.a.y}
          x2={e.b.x}
          y2={e.b.y}
          style={{ transitionDelay: `${(i % 9) * 70 + 300}ms` }}
        />
      ))}
      {nodes.flat().map((n, i) => (
        <circle key={i} className="fig__n" cx={n.x} cy={n.y} r="3.4" />
      ))}
      <text className="fig__t" x="14" y="118">
        dense → pruned → winning ticket
      </text>
    </>
  );
}

const FIGS = {
  "double-descent": DoubleDescent,
  "grad-cam": GradCam,
  lth: Lottery,
};

export default function ResearchFigure({ id }) {
  const [ref, inView] = useInView({ threshold: 0.4 });
  const Fig = FIGS[id];
  if (!Fig) return null;

  return (
    <svg
      ref={ref}
      className={`fig ${inView ? "is-in" : ""}`}
      viewBox="0 0 220 122"
      role="presentation"
      focusable="false"
    >
      <Fig />
    </svg>
  );
}

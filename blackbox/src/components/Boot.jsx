import { useEffect, useRef, useState } from "react";

/* Cold-open: the site holds for a beat while a counter fills, then wipes away.
   Once per session only — it should feel like arriving, not like waiting. */

const KEY = "bb:booted";
const RUN = 1500; // ms of counter
const OUT = 900; // ms of wipe, must match .boot transition in the CSS

const STAGES = [
  [0, "Loading weights"],
  [34, "Building layers"],
  [64, "Forward pass"],
  [90, "Ready"],
];

const skip = () => {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
};

export default function Boot() {
  const [off, setOff] = useState(skip);
  const [out, setOut] = useState(false);
  const [n, setN] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (off) return;
    document.documentElement.classList.add("is-booting");
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode — the boot just replays next visit */
    }

    const start = performance.now();
    let leave = 0;
    let end = 0;

    const tick = (now) => {
      const p = Math.min((now - start) / RUN, 1);
      // Fast off the line, easing into the last few counts.
      setN(Math.round((1 - Math.pow(1 - p, 2.6)) * 100));
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      leave = window.setTimeout(() => {
        setOut(true);
        document.documentElement.classList.remove("is-booting");
        end = window.setTimeout(() => setOff(true), OUT);
      }, 220);
    };

    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(leave);
      clearTimeout(end);
      document.documentElement.classList.remove("is-booting");
    };
  }, [off]);

  if (off) return null;

  const stage = STAGES.reduce((acc, s) => (n >= s[0] ? s[1] : acc), STAGES[0][1]);

  return (
    <div className={`boot ${out ? "is-out" : ""}`} role="status" aria-live="polite">
      <div className="boot__inner">
        <p className="boot__word">
          <span className="boot__outline">Black</span>{" "}
          <span className="boot__solid">
            Box
            <i className="boot__dot" aria-hidden="true" />
          </span>
        </p>
        <div className="boot__bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${n / 100})` }} />
        </div>
        <p className="boot__meta mono">
          <span>{stage}</span>
          <span className="boot__n">{String(n).padStart(3, "0")}</span>
        </p>
      </div>
    </div>
  );
}

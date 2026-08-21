import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SplitText from "../components/SplitText";
import { Reveal } from "../components/Layout";
import { runModel, demoHeatmap, hasBackend, pingBackend, DETECTORS } from "../lib/model";

const MAX_MB = 8;

export default function TryModel() {
  const [detector, setDetector] = useState(DETECTORS[0].id);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [opacity, setOpacity] = useState(0.55);
  const [online, setOnline] = useState(hasBackend ? null : false); // null = still checking
  const inputRef = useRef(null);

  const active = useMemo(
    () => DETECTORS.find((d) => d.id === detector) ?? DETECTORS[0],
    [detector]
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Health check, so the badge reports what the backend is actually doing.
  useEffect(() => {
    if (!hasBackend) return;
    let alive = true;
    pingBackend().then((ok) => {
      if (alive) setOnline(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  const accept = useCallback((f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("That file isn't an image. Use a JPG, PNG, or WebP.");
      setStatus("error");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`That image is over ${MAX_MB} MB. Pick a smaller one.`);
      setStatus("error");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    setStatus("idle");
  }, [preview]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      accept(e.dataTransfer.files?.[0]);
    },
    [accept]
  );

  // Paste an image straight from the clipboard.
  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) =>
        i.type.startsWith("image/")
      );
      if (item) accept(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  const run = useCallback(async () => {
    if (!file) return;
    setStatus("running");
    setError(null);
    try {
      const out = online ? await runModel(file, active.model) : await demoHeatmap(file);
      setResult(out);
      setStatus("done");
    } catch (err) {
      if (err?.message === "NO_BACKEND") {
        // shouldn't happen (the online flag guards it) but fall back cleanly
        const out = await demoHeatmap(file);
        setResult(out);
        setStatus("done");
        return;
      }
      // /health answering says nothing about /predict surviving the request —
      // once a real call fails, stop claiming the backend is online.
      setOnline(false);
      setError(
        "The model service didn't respond. Check the endpoint is running, or try again."
      );
      setStatus("error");
    }
  }, [file, online, active]);

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }, [preview]);

  return (
    <section className="band shell">
      <Reveal variant="fade">
        <p className="eyebrow">Try the model</p>
      </Reveal>
      <SplitText
        as="h1"
        className="display display--sm"
        text="Run a scan through the model and see what it sees"
      />
      <Reveal variant="fade" delay={240}>
        <p className="lede">
          Choose what to detect, drop in an image, and the model returns a prediction
          alongside a Grad-CAM overlay — a heatmap of the regions that actually drove its
          decision.
        </p>
      </Reveal>

      <Reveal variant="rise" delay={300}>
        <div className="tm__bar">
          <p className="eyebrow tm__bar-label">Detection type</p>
          <p className="mono tm__mode">
            <span className={`tm__dot ${online ? "tm__dot--live" : ""}`} aria-hidden="true" />
            {online === null ? "checking backend" : online ? "backend online" : "demo mode"}
          </p>
        </div>
      </Reveal>

      {/* Which detector to run */}
      <Reveal variant="fade" delay={340}>
        <div className="tm__tabs" role="tablist" aria-label="Detection type">
          {DETECTORS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={d.id === detector}
              className={`tm__tab ${d.id === detector ? "is-on" : ""}`}
              onClick={() => {
                setDetector(d.id);
                setResult(null);
                setError(null);
                setStatus("idle");
              }}
            >
              {d.name}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal variant="fade" delay={380}>
        <div className="tm__card">
          <h3 className="display">{active.title}</h3>
          <p>{active.blurb}</p>
        </div>
      </Reveal>

      {/* Upload */}
      <Reveal variant="scale" delay={160}>
        <div
          className={`tm__drop ${dragging ? "is-drag" : ""} ${preview ? "has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !preview && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !preview) inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr"
            onChange={(e) => accept(e.target.files?.[0])}
          />
          {preview ? (
            <div className="tm__chosen">
              <img src={preview} alt="Selected input" className="tm__thumb" />
              <div className="tm__chosen-meta">
                <span className="tm__filename">{file?.name}</span>
                <span className="mono tm__hint">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <div className="tm__actions">
                  <button
                    className="pen"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    Choose another
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="tm__prompt">
              <span className="tm__arrow" aria-hidden="true">
                ↑
              </span>
              <p className="mono tm__cta">Drag an image here, click to browse, or paste</p>
              <p className="mono tm__hint">JPG · PNG · WebP · up to {MAX_MB} MB</p>
            </div>
          )}
        </div>
      </Reveal>

      <div className="tm__actions tm__actions--run">
        <button
          className="pen pen--go"
          onClick={run}
          disabled={!file || status === "running"}
        >
          {status === "running" ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {status === "running" && (
        <p className="mono tm__status">
          <span className="tm__blink" aria-hidden="true" />
          {online ? "forward pass running on the server…" : "computing saliency in-browser…"}
        </p>
      )}

      {status === "error" && error && (
        <p className="mono tm__status tm__status--err">{error}</p>
      )}

      {/* Result */}
      {status === "done" && result && (
        <div className="tm__result">
          {(result.label || typeof result.confidence === "number") && (
            <div className="canvas__readout tm__readout">
              {result.label && (
                <span>
                  prediction <b>{result.label}</b>
                </span>
              )}
              {typeof result.confidence === "number" && (
                <span>
                  confidence <b>{(result.confidence * 100).toFixed(1)}%</b>
                </span>
              )}
            </div>
          )}

          <div className="tm__grid">
            <figure className="figure tm__fig">
              <img src={preview} alt="Original input" />
              <figcaption>Input · your image</figcaption>
            </figure>

            <figure className="figure tm__fig">
              <img src={result.heatmap} alt="Model heatmap" />
              <figcaption>Heatmap · where the network looked</figcaption>
            </figure>

            {result.overlay && (
              <figure className="figure tm__fig">
                <div className="tm__overlay">
                  <img src={preview} alt="" />
                  <img src={result.overlay} alt="Heatmap over input" style={{ opacity }} />
                </div>
                <figcaption>
                  <label className="tm__slider">
                    Overlay
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                    />
                  </label>
                </figcaption>
              </figure>
            )}
          </div>

          <div className="tm__actions tm__actions--end">
            <button className="pen" onClick={reset}>
              Try another image
            </button>
            {result.demo && (
              <span className="mono tm__hint">
                Demo output — connect the CNN endpoint for real Grad-CAM.
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

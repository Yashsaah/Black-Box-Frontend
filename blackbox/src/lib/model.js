// Talks to the Black Box CNN backend. There is no fallback: if the service is
// unreachable the page says so rather than showing a stand-in result.
//
// Set VITE_MODEL_API_URL (see TRY_MODEL.md) to point at your CNN service.

const API_URL = import.meta.env.VITE_MODEL_API_URL || "";
const MODEL_ID = import.meta.env.VITE_MODEL_ID || "";

export const hasBackend = Boolean(API_URL);

// What the visitor can point the model at. `model` is the id the backend's
// /models catalogue knows this detector by.
export const DETECTORS = [
  {
    id: "pneumonia",
    name: "Pneumonia",
    model: import.meta.env.VITE_MODEL_PNEUMONIA || MODEL_ID || "pneumonia-resnet50",
    title: "Pneumonia ResNet-50",
    blurb: "Detects pneumonia in chest X-rays and shows which regions drove the call.",
  },
  {
    id: "glaucoma",
    name: "Glaucoma",
    model: import.meta.env.VITE_MODEL_GLAUCOMA || "glaucoma-cnn",
    title: "Glaucoma ResNet-50",
    blurb: "Detects glaucoma in retinal fundus images and shows what the network fixated on.",
  },
];

// Is the service actually up? The badge lies otherwise: an endpoint URL being
// configured says nothing about whether anything is answering on it.
export async function pingBackend() {
  if (!API_URL) return false;
  const base = API_URL.replace(/\/predict\/?$/, "");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 70000);
  try {
    for (const path of ["/health", "/models", "/"]) {
      try {
        const res = await fetch(base + path, { signal: ctl.signal });
        if (res.ok) return true;
      } catch {
        // try the next probe
      }
    }
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// POST the image to the CNN service and normalise whatever it returns into a
// { heatmap, overlay, label, confidence } shape. The backend may answer with
// JSON (base64 or data-URL fields) or with a raw image body.
export async function runModel(file, model) {
  if (!API_URL) throw new Error("NO_BACKEND");

  const form = new FormData();
  // The backend's /predict takes the upload as `file`, plus an optional model id
  // from its /models catalogue (it falls back to DEFAULT_MODEL_ID when absent).
  form.append("file", file);
  const modelId = model || MODEL_ID;
  if (modelId) form.append("model", modelId);

  const res = await fetch(API_URL, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Model service returned ${res.status}`);

  const type = res.headers.get("content-type") || "";

  if (type.includes("application/json")) {
    const data = await res.json();
    // `heatmap_base64` is what our FastAPI service returns — already the CAM
    // blended over the original, so there is no separate overlay to slide.
    return {
      heatmap: asDataUrl(data.heatmap_base64 ?? data.heatmap),
      overlay: data.overlay ? asDataUrl(data.overlay) : null,
      label: data.predicted_label ?? data.label ?? data.prediction ?? null,
      confidence: typeof data.confidence === "number" ? data.confidence : null,
    };
  }

  // Raw image response — treat the whole body as the heatmap.
  const blob = await res.blob();
  return {
    heatmap: URL.createObjectURL(blob),
    overlay: null,
    label: null,
    confidence: null,
  };
}

function asDataUrl(v) {
  if (!v) return null;
  return v.startsWith("data:") || v.startsWith("http") || v.startsWith("blob:")
    ? v
    : `data:image/png;base64,${v}`;
}

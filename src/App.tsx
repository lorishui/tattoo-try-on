import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, PointerEvent } from "react";
import {
  asset,
  bodyPresets,
  defaultPlacement,
  initialPlacement,
  MAX_DESIGN_WIDTH,
  RENDER_WIDTH,
  RENDER_HEIGHT,
  designPresets,
  hostedDemo,
} from "./presets";
import type { Placement } from "./presets";
import {
  clamp,
  hitTestTattoo,
  drawPreview,
  loadImage,
  localPoint,
  makeCanvas,
  prepareTattoo,
  scaleFromPointer,
  rotationFromPointer,
  readUpload,
} from "./lib/image";
import { detectSkin } from "./lib/segmentation";

type BodyPreset = (typeof bodyPresets)[number];
type MaskState = "loading" | "ready" | "fallback" | "off";
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";

export default function App() {
  const [body, setBody] = useState<HTMLImageElement | null>(null);
  const [tattoo, setTattoo] = useState<HTMLImageElement | null>(null);
  const [bodyId, setBodyId] = useState("back");
  const [bodyLabel, setBodyLabel] = useState("Back");
  const [designId, setDesignId] = useState("botanical");
  const [designLabel, setDesignLabel] = useState("Botanical sprig");
  const [placement, setPlacement] = useState(defaultPlacement);
  const designWidthRef = useRef(300);
  const [removeWhite, setRemoveWhite] = useState(true);
  const [masking, setMasking] = useState(true);
  const [mask, setMask] = useState<HTMLCanvasElement | null>(null);
  const [maskState, setMaskState] = useState<MaskState>("loading");
  const [before, setBefore] = useState(false);
  const [selected, setSelected] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("Loading the example…");
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 600, height: 450 });
  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);
  const bodyRequest = useRef(0),
    designRequest = useRef(0);
  const drag = useRef<{
    id: number;
    pointer: { x: number; y: number };
    x: number;
    y: number;
  } | null>(null);
  const transform = useRef<{
    id: number;
    mode: "resize" | "rotate";
    center: { x: number; y: number };
    start: { x: number; y: number };
    size: number;
    rotation: number;
  } | null>(null);
  const prepared = useMemo(
    () => (tattoo ? prepareTattoo(tattoo, removeWhite) : null),
    [tattoo, removeWhite],
  );

  useEffect(() => {
    function deselectOutside(event: globalThis.PointerEvent) {
      const target = event.target;
      if (
        target === canvasRef.current ||
        (target instanceof Element && target.closest(".transform-box"))
      )
        return;
      setSelected(false);
    }
    function escapeSelection(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (document.activeElement?.closest(".transform-box"))
        canvasRef.current?.focus({ preventScroll: true });
      setSelected(false);
      drag.current = null;
      transform.current = null;
    }
    document.addEventListener("pointerdown", deselectOutside, true);
    document.addEventListener("keydown", escapeSelection);
    return () => {
      document.removeEventListener("pointerdown", deselectOutside, true);
      document.removeEventListener("keydown", escapeSelection);
    };
  }, []);

  function replaceTattoo(image: HTMLImageElement) {
    const width = Math.min(image.naturalWidth, MAX_DESIGN_WIDTH);
    const ratio = width / designWidthRef.current;
    designWidthRef.current = width;
    setTattoo(image);
    setPlacement((p) => ({ ...p, size: p.size * ratio }));
  }
  async function selectBody(preset: BodyPreset) {
    const request = ++bodyRequest.current;
    setError("");
    try {
      const next = await loadImage(asset(`body-parts/body-${preset.id}.png`));
      if (request !== bodyRequest.current) return;
      setBody(next);
      setSelected(true);
      setBodyId(preset.id);
      setBodyLabel(preset.label);
      setPlacement(initialPlacement(preset.id, designWidthRef.current));
      setNotice(`${preset.label} example loaded. Drag the design to place it.`);
    } catch (e) {
      if (request === bodyRequest.current) setError(errorMessage(e));
    }
  }
  async function selectDesign(id: string) {
    const request = ++designRequest.current;
    setError("");
    try {
      const next = await loadImage(asset(`designs/${id}.svg`));
      if (request !== designRequest.current) return;
      replaceTattoo(next);
      setSelected(true);
      setDesignId(id);
      setDesignLabel(designPresets.find((d) => d.id === id)!.label);
      setBefore(false);
      setNotice("Design loaded. Drag it on the photo or use the controls.");
    } catch (e) {
      if (request === designRequest.current) setError(errorMessage(e));
    }
  }
  async function upload(
    e: ChangeEvent<HTMLInputElement>,
    type: "body" | "design",
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const sequence = type === "body" ? bodyRequest : designRequest;
    const request = ++sequence.current;
    setError("");
    try {
      const image = await readUpload(file);
      if (request !== sequence.current) return;
      if (type === "body") {
        setBody(image);
        setBodyId("upload");
        setBodyLabel(file.name);
        setPlacement(initialPlacement("upload", designWidthRef.current));
      } else {
        replaceTattoo(image);
        setDesignId("upload");
        setDesignLabel(file.name);
      }
      setBefore(false);
      setSelected(true);
      setNotice(`${file.name} loaded. Your image stays in this browser.`);
    } catch (err) {
      if (request === sequence.current) setError(errorMessage(err));
    }
  }
  useEffect(() => {
    void selectBody(bodyPresets[0]);
    void selectDesign("botanical");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMask(null);
    if (!body || !masking) {
      setMaskState("off");
      return;
    }
    setMaskState("loading");
    // Let the loading state paint before the one-shot CPU inference.
    const timer = window.setTimeout(() => {
      void detectSkin(body)
        .then((result) => {
          if (!cancelled) {
            setMask(result);
            setMaskState("ready");
          }
        })
        .catch(() => {
          if (!cancelled) setMaskState("fallback");
        });
    }, 30);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [body, masking, retry]);

  useEffect(() => {
    if (body && canvasRef.current)
      drawPreview(
        canvasRef.current,
        body,
        prepared,
        placement,
        masking ? mask : null,
        before,
      );
  }, [body, prepared, placement, mask, masking, before]);

  function change<K extends keyof Placement>(key: K, value: Placement[K]) {
    setPlacement((p) => ({ ...p, [key]: value }));
  }
  function pointerDown(e: PointerEvent<HTMLElement>) {
    if (!body || !prepared || before || e.button !== 0 || !canvasRef.current)
      return;
    const pointer = localPoint(
      e.clientX,
      e.clientY,
      canvasRef.current.getBoundingClientRect(),
    );
    const inside = hitTestTattoo(
      pointer,
      placement,
      RENDER_HEIGHT / RENDER_WIDTH,
      prepared.height / prepared.width,
    );
    setSelected(inside);
    if (!inside) return;
    e.preventDefault();
    canvasRef.current.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: e.pointerId,
      pointer,
      x: placement.x,
      y: placement.y,
    };
  }
  function pointerMove(e: PointerEvent<HTMLElement>) {
    const started = drag.current;
    if (!started || started.id !== e.pointerId) return;
    const now = localPoint(
      e.clientX,
      e.clientY,
      canvasRef.current!.getBoundingClientRect(),
    );
    setPlacement((p) => ({
      ...p,
      x: clamp(started.x + now.x - started.pointer.x, 0, 1),
      y: clamp(started.y + now.y - started.pointer.y, 0, 1),
    }));
  }
  function startTransform(
    e: PointerEvent<HTMLButtonElement>,
    mode: "resize" | "rotate",
  ) {
    if (before || e.button !== 0 || !canvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const center = {
      x: rect.left + placement.x * rect.width,
      y: rect.top + placement.y * rect.height,
    };
    transform.current = {
      id: e.pointerId,
      mode,
      center,
      start: { x: e.clientX - center.x, y: e.clientY - center.y },
      size: placement.size,
      rotation: placement.rotation,
    };
  }
  function moveTransform(e: PointerEvent<HTMLButtonElement>) {
    const started = transform.current;
    if (!started || started.id !== e.pointerId) return;
    const now = {
      x: e.clientX - started.center.x,
      y: e.clientY - started.center.y,
    };
    if (started.mode === "resize")
      change("size", scaleFromPointer(started.size, started.start, now));
    else
      change(
        "rotation",
        rotationFromPointer(started.rotation, started.start, now),
      );
  }
  function handleKey(
    e: KeyboardEvent<HTMLButtonElement>,
    mode: "resize" | "rotate",
  ) {
    const sign = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[
      e.key
    ];
    if (!sign) return;
    e.preventDefault();
    if (mode === "resize")
      change(
        "size",
        clamp(placement.size + sign * (e.shiftKey ? 0.05 : 0.01), 0.05, 1.1),
      );
    else
      change(
        "rotation",
        rotationFromPointer(
          placement.rotation,
          { x: 1, y: 0 },
          {
            x: Math.cos((sign * (e.shiftKey ? 15 : 1) * Math.PI) / 180),
            y: Math.sin((sign * (e.shiftKey ? 15 : 1) * Math.PI) / 180),
          },
        ),
      );
  }
  function nudge(e: KeyboardEvent<HTMLElement>) {
    if (before) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(true);
      return;
    }
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[e.key];
    if (!direction || !selected) return;
    e.preventDefault();
    const amount = e.shiftKey ? 0.025 : 0.005;
    setPlacement((p) => ({
      ...p,
      x: clamp(p.x + direction[0] * amount, 0, 1),
      y: clamp(p.y + direction[1] * amount, 0, 1),
    }));
  }
  async function download() {
    if (!body || !prepared) return;
    setExporting(true);
    setError("");
    try {
      const output = makeCanvas(1, 1);
      drawPreview(
        output,
        body,
        prepared,
        placement,
        masking ? mask : null,
        false,
        "export",
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new Error("Export failed. Please try again.")),
          "image/png",
        ),
      );
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `tattoo-try-on-${Date.now()}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setNotice(`PNG exported at ${output.width} × ${output.height}.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }
  const ready = Boolean(body && prepared);
  const modelLoading = masking && maskState === "loading";

  return (
    <>
      <header className="topbar">
        <a className="wordmark" href="#workspace">
          <span className="mark" aria-hidden="true">
            ✳
          </span>{" "}
          <h1>Tattoo Try-On</h1>
        </a>
        <nav aria-label="Project">
          <a
            href="https://github.com/lorishui/tattoo-try-on"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source code ↗
          </a>
          <a
            className="hosted"
            href={hostedDemo}
            target="_blank"
            rel="noopener noreferrer"
          >
            stencilmytattoo.com ↗
          </a>
        </nav>
      </header>
      <main id="workspace">
        <div className="workspace">
          <aside
            id="inputs"
            className="controls"
            aria-label="Tattoo design and body photo"
          >
            <section>
              <div className="section-title">
                <span className="step">01</span>
                <h2>Choose your tattoo</h2>
              </div>
              <label className="upload compact">
                <span>
                  ↑ <strong>Upload tattoo design</strong>
                </span>
                <small>Transparent PNG works best</small>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Upload tattoo design"
                  onChange={(e) => void upload(e, "design")}
                />
              </label>
              <div className="design-grid">
                {designPresets.map((p) => (
                  <button
                    className={`design-option ${designId === p.id ? "selected" : ""}`}
                    aria-pressed={designId === p.id}
                    aria-label={`Use ${p.label} design`}
                    key={p.id}
                    onClick={() => void selectDesign(p.id)}
                  >
                    <img src={asset(`designs/${p.id}.svg`)} alt="" />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <div className="section-title">
                <span className="step">02</span>
                <h2>Choose a body area</h2>
              </div>
              <label className="upload">
                <span>
                  ↑ <strong>Upload body photo</strong>
                </span>
                <small>PNG, JPG or WebP · up to 10 MB</small>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Upload body photo"
                  onChange={(e) => void upload(e, "body")}
                />
              </label>
              <p className="sub-label">Or try a sample body</p>
              <div className="body-grid">
                {bodyPresets.map((p) => (
                  <button
                    className={`body-option ${bodyId === p.id ? "selected" : ""}`}
                    aria-pressed={bodyId === p.id}
                    aria-label={`Use ${p.label} sample`}
                    key={p.id}
                    onClick={() => void selectBody(p)}
                  >
                    <img
                      loading="lazy"
                      src={asset(`body-parts/body-${p.id}.png`)}
                      alt=""
                    />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <div className="section-title">
                <span className="step">03</span>
                <h2>Preview options</h2>
              </div>
              <div className="switches">
                <label>
                  <input
                    type="checkbox"
                    checked={removeWhite}
                    onChange={(e) => setRemoveWhite(e.target.checked)}
                  />{" "}
                  Remove white background
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={masking}
                    onChange={(e) => setMasking(e.target.checked)}
                  />{" "}
                  Keep ink on skin
                </label>
              </div>
            </section>
            <p className="privacy">
              Images stay on this device. Use photos you have permission to use.
              This is a 2D placement reference for your tattoo artist.
            </p>
          </aside>
          <section className="preview" aria-label="Live tattoo preview">
            <div className="preview-toolbar">
              <div>
                <span className="eyebrow">PLACEMENT PREVIEW</span>
                <p title={`${bodyLabel} · ${designLabel}`}>
                  {bodyLabel} <span>/</span> {designLabel}
                </p>
              </div>
              <div className="preview-actions">
                <button
                  className="primary"
                  onClick={() => void download()}
                  disabled={!ready || exporting || modelLoading}
                >
                  {exporting ? "Exporting…" : "Download PNG ↓"}
                </button>
                <button
                  className="text-button"
                  disabled={!ready}
                  onClick={() => {
                    setPlacement(
                      initialPlacement(bodyId, designWidthRef.current),
                    );
                    setBefore(false);
                    setSelected(true);
                  }}
                >
                  Reset
                </button>
                <button
                  className="text-button"
                  disabled={!ready || before}
                  aria-pressed={placement.mirror}
                  onClick={() => change("mirror", !placement.mirror)}
                >
                  Mirror
                </button>
                <button
                  className={`before-button ${before ? "active" : ""}`}
                  aria-pressed={before}
                  onClick={() => setBefore((b) => !b)}
                  disabled={!ready}
                >
                  {before ? "Show tattoo" : "View original"}
                </button>
              </div>
            </div>
            <div className="stage" ref={stageRef}>
              <div
                className="canvas-wrap"
                style={{
                  width: body
                    ? Math.max(
                        1,
                        Math.min(
                          stageSize.width,
                          (stageSize.height * RENDER_WIDTH) / RENDER_HEIGHT,
                        ),
                      )
                    : Math.min(stageSize.width, (stageSize.height * 2) / 3),
                }}
              >
                {!body && (
                  <div className="placeholder">Loading the sample photo…</div>
                )}
                <canvas
                  ref={canvasRef}
                  tabIndex={0}
                  role="img"
                  aria-label="Tattoo placement preview. Click the design to select and drag it. Click outside or press Escape to hide handles. Enter selects; arrow keys move the selected design."
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                  onLostPointerCapture={() => {
                    drag.current = null;
                  }}
                  onKeyDown={nudge}
                />
                {ready && prepared && selected && !before && (
                  <div
                    className="transform-box"
                    style={{
                      left: `${placement.x * 100}%`,
                      top: `${placement.y * 100}%`,
                      width: `${placement.size * 100}%`,
                      aspectRatio: `${prepared.width} / ${prepared.height}`,
                      transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                    }}
                  >
                    <button
                      className="move-handle"
                      aria-label="Move design"
                      title="Drag to move · arrow keys to nudge"
                      onPointerDown={pointerDown}
                      onPointerMove={pointerMove}
                      onPointerUp={() => {
                        drag.current = null;
                      }}
                      onPointerCancel={() => {
                        drag.current = null;
                      }}
                      onLostPointerCapture={() => {
                        drag.current = null;
                      }}
                      onKeyDown={nudge}
                    />
                    {(
                      [
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                        "rotate",
                      ] as const
                    ).map((corner) => {
                      const mode = corner === "rotate" ? "rotate" : "resize";
                      return (
                        <button
                          key={corner}
                          className={`transform-handle ${corner}`}
                          aria-label={
                            mode === "rotate"
                              ? "Rotate design"
                              : `Resize design ${corner}`
                          }
                          title={
                            mode === "rotate"
                              ? "Drag to rotate · arrows for 1°"
                              : "Drag to resize · arrows for 1%"
                          }
                          onPointerDown={(e) => startTransform(e, mode)}
                          onPointerMove={moveTransform}
                          onPointerUp={() => {
                            transform.current = null;
                          }}
                          onPointerCancel={() => {
                            transform.current = null;
                          }}
                          onLostPointerCapture={() => {
                            transform.current = null;
                          }}
                          onKeyDown={(e) => handleKey(e, mode)}
                        >
                          {mode === "rotate" ? "↻" : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="preview-bottom">
              <a className="inputs-link" href="#inputs">
                Photos &amp; designs ↓
              </a>
              <p className="hint">
                Click tattoo to edit · click outside to hide handles
              </p>
              <p className={`mask-status ${maskState}`} role="status">
                {!masking
                  ? "Skin detection off"
                  : maskState === "loading"
                    ? "Detecting skin on this device…"
                    : maskState === "ready"
                      ? "● Skin mask ready"
                      : "Skin detection unavailable. Unmasked preview shown."}
                {masking && maskState === "fallback" && (
                  <button
                    className="text-button"
                    onClick={() => setRetry((n) => n + 1)}
                  >
                    Retry
                  </button>
                )}
              </p>
            </div>
            <details className="precision-controls">
              <summary>Fine-tune values</summary>
              <fieldset disabled={before || !ready}>
                <legend className="sr-only">Precise design placement</legend>
                <Range
                  label="Size"
                  value={Math.round(placement.size * 100)}
                  min={5}
                  max={110}
                  unit="%"
                  onChange={(v) => change("size", v / 100)}
                />
                <Range
                  label="Rotation"
                  value={placement.rotation}
                  min={-180}
                  max={180}
                  unit="°"
                  onChange={(v) => change("rotation", v)}
                />
                <Range
                  label="Opacity"
                  value={Math.round(placement.opacity * 100)}
                  min={5}
                  max={100}
                  unit="%"
                  onChange={(v) => change("opacity", v / 100)}
                />
                <Range
                  label="Horizontal position"
                  value={Math.round(placement.x * 100)}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => change("x", v / 100)}
                />
                <Range
                  label="Vertical position"
                  value={Math.round(placement.y * 100)}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => change("y", v / 100)}
                />
              </fieldset>
            </details>
            <div className="feedback">
              <p
                className={error ? "error" : "notice"}
                role={error ? "alert" : "status"}
              >
                {error || notice}
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function Range({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const id = `range-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="range">
      <label htmlFor={id}>
        {label}
        <output>
          {value}
          {unit}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

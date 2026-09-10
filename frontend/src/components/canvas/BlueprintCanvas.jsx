/**
 * src/components/canvas/BlueprintCanvas.jsx
 *
 * Core blueprint rendering engine.
 *
 * Responsibilities
 * ----------------
 * - Load and render a PDF blueprint via PDF.js onto an HTML5 <canvas>
 * - Support pinch-to-zoom and pan gestures (tablet-first)
 * - Render punch pins (teardrop .pin-marker and circle .pin-circle-stamp)
 *   as positioned overlay elements on top of the canvas
 * - Emit click/drag coordinates as percentage of sheet dimensions (X%, Y%)
 * - Display real-time coordinate HUD (.coordinate-hud) while the cursor moves
 * - Accept new pin placement via click when a "pin tool" is active
 *
 * Props
 * -----
 *   pdfUrl      {string}   — URL to the blueprint PDF (e.g. /uploads/sheets/abc.pdf)
 *   pins        {array}    — list of pin objects to render
 *   activeTool  {string}   — "select" | "teardrop" | "stamp" | "markup"
 *   onPinClick  {function} — called with (pin) when a pin is clicked
 *   onPlacePin  {function} — called with ({x_pct, y_pct}) when canvas is clicked in pin mode
 */

import { useRef, useEffect, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

// PDF.js worker (Vite handles the asset)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function BlueprintCanvas({
  pdfUrl,
  pins = [],
  activeTool = "select",
  onPinClick,
  onPlacePin,
}) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const [coords, setCoords]   = useState(null);   // { x, y } in percentage
  const [scale,  setScale]    = useState(1);
  const [pdfPage, setPdfPage] = useState(null);

  // ── Load PDF ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;

    pdfjsLib.getDocument(pdfUrl).promise.then((pdf) => {
      if (cancelled) return;
      pdf.getPage(1).then((page) => {
        if (!cancelled) setPdfPage(page);
      });
    }).catch(console.error);

    return () => { cancelled = true; };
  }, [pdfUrl]);

  // ── Render PDF page to canvas ──────────────────────────────────────────────
  useEffect(() => {
    if (!pdfPage || !canvasRef.current) return;

    const canvas  = canvasRef.current;
    const ctx     = canvas.getContext("2d");
    const viewport = pdfPage.getViewport({ scale });

    canvas.width  = viewport.width;
    canvas.height = viewport.height;

    pdfPage.render({ canvasContext: ctx, viewport }).promise.catch(console.error);
  }, [pdfPage, scale]);

  // ── Mouse tracking → coordinate HUD ───────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = ((e.clientX - rect.left) / rect.width)  * 100;
    const y    = ((e.clientY - rect.top)  / rect.height) * 100;
    setCoords({ x: x.toFixed(1), y: y.toFixed(1) });
  }, []);

  const handleMouseLeave = () => setCoords(null);

  // ── Canvas click → place pin ───────────────────────────────────────────────
  const handleClick = useCallback((e) => {
    if (activeTool === "select") return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const x_pct = ((e.clientX - rect.left) / rect.width)  * 100;
    const y_pct = ((e.clientY - rect.top)  / rect.height) * 100;
    onPlacePin?.({ x_pct: +x_pct.toFixed(2), y_pct: +y_pct.toFixed(2) });
  }, [activeTool, onPlacePin]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", overflow: "hidden", background: "var(--bg-canvas)", flex: 1 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={activeTool !== "select" ? "cursor-crosshair" : ""}
    >
      {/* PDF canvas */}
      <canvas ref={canvasRef} style={{ display: "block" }} />

      {/* Pin overlays */}
      {pins.map((pin) =>
        pin.pin_type === "circle_stamp" ? (
          <div
            key={pin.id}
            className="pin-circle-stamp"
            style={{
              left:       `${pin.x_pct}%`,
              top:        `${pin.y_pct}%`,
              background: pin.company_color || "var(--primary)",
            }}
            onClick={(e) => { e.stopPropagation(); onPinClick?.(pin); }}
            title={pin.title}
          >
            {(pin.company_initials || "??").slice(0, 2)}
          </div>
        ) : (
          <div
            key={pin.id}
            className={`pin-marker priority-${pin.priority}`}
            style={{
              left:       `${pin.x_pct}%`,
              top:        `${pin.y_pct}%`,
              background: pinStatusColor(pin.status),
            }}
            onClick={(e) => { e.stopPropagation(); onPinClick?.(pin); }}
            title={pin.title}
          >
            <span className="pin-marker__id">{pin.id}</span>
          </div>
        )
      )}

      {/* Coordinate HUD */}
      {coords && (
        <div className="coordinate-hud">
          X: {coords.x}% &nbsp;|&nbsp; Y: {coords.y}%
        </div>
      )}
    </div>
  );
}

function pinStatusColor(status) {
  const map = {
    open:              "var(--status-open)",
    in_progress:       "var(--status-progress)",
    contractor_review: "var(--status-review)",
    admin_review:      "var(--status-admin)",
    closed:            "var(--status-closed)",
  };
  return map[status] ?? "var(--status-inactive)";
}

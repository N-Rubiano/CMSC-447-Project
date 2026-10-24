/**
 * stampRenderer.js
 * Canvas rendering utilities for PunchList Pro's Composite Stamp engine.
 *
 * A "Composite Stamp" is a vector annotation placed directly on the
 * architectural sheet canvas. It consists of:
 *
 *   ┌─────────────────────┐
 *   │   Outer glow ring   │  (status color, low opacity, animated in UI)
 *   │  ┌───────────────┐  │
 *   │  │  Filled circle│  │  (status color fill, white stroke)
 *   │  │    [APEX]     │  │  ← subcontractor initials, centered
 *   │  └───────────────┘  │
 *   │   TASK-00147        │  ← task ID badge, bottom-right of circle
 *   └─────────────────────┘
 *
 * ALL coordinates coming in are NORMALIZED (0–100% of sheet width/height).
 * The renderer converts them to canvas pixels on the fly.
 *
 * Public API:
 *   drawCompositeStamp(ctx, stamp, sheetWidth, sheetHeight)
 *   drawAllStamps(ctx, stamps, sheetWidth, sheetHeight)
 *   drawFocusPulse(ctx, pin, sheetWidth, sheetHeight, progress)  ← for animation
 *   hitTestStamp(stamps, clickX_pct, clickY_pct)                 ← click detection
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Circle radius as percentage of sheet width (normalized units). */
const STAMP_RADIUS_PCT = 2.5;

/** How far the badge sits outside the circle rim, in canvas pixels */
const BADGE_OFFSET_PX = 4;

/** Status → fill color map (mirrors CSS tokens) */
const STATUS_COLORS = {
  pending: '#F59E0B',
  open:    '#EF4444',
  closed:  '#22C55E',
};

/** Fallback color */
const DEFAULT_COLOR = '#EF4444';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the display color for a stamp.
 * Priority: stamp.color → status color → DEFAULT_COLOR
 */
export function resolveStampColor(stamp) {
  if (stamp?.color) return stamp.color;
  const s = (stamp?.status || '').toLowerCase();
  return STATUS_COLORS[s] || DEFAULT_COLOR;
}

/**
 * Convert normalized coordinates to canvas pixels.
 * @param {number} x_pct  0–100
 * @param {number} y_pct  0–100
 * @param {number} sheetWidth  canvas width in px
 * @param {number} sheetHeight canvas height in px
 */
export function pctToCanvas(x_pct, y_pct, sheetWidth, sheetHeight) {
  return {
    cx: (x_pct / 100) * sheetWidth,
    cy: (y_pct / 100) * sheetHeight,
  };
}

/**
 * Get the stamp radius in canvas pixels.
 * Clamps to a readable minimum/maximum regardless of sheet scale.
 */
export function getStampRadius(sheetWidth) {
  const r = (STAMP_RADIUS_PCT / 100) * sheetWidth;
  return Math.max(18, Math.min(r, 52));
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: DRAW A SINGLE COMPOSITE STAMP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * drawCompositeStamp(ctx, stamp, sheetWidth, sheetHeight)
 *
 * Renders a fully styled composite stamp onto the markup canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} stamp
 *   {
 *     x_pct:     number,   // normalized X (0-100)
 *     y_pct:     number,   // normalized Y (0-100)
 *     initials:  string,   // e.g. "APEX"
 *     task_id:   string,   // e.g. "TASK-00147"
 *     status:    string,   // 'Pending' | 'Open' | 'Closed'
 *     color?:    string,   // override hex color
 *     opacity?:  number,   // 0–1, defaults to 1 (use 0.6 for closed stamps)
 *     selected?: boolean,  // draw selection ring if true
 *     layer?:    string,   // 'draft' | 'published' — affects stroke style
 *   }
 * @param {number} sheetWidth
 * @param {number} sheetHeight
 */
export function drawCompositeStamp(ctx, stamp, sheetWidth, sheetHeight) {
  const { cx, cy } = pctToCanvas(stamp.x_pct, stamp.y_pct, sheetWidth, sheetHeight);
  const radius      = getStampRadius(sheetWidth);
  const color       = resolveStampColor(stamp);
  const opacity     = stamp.opacity ?? (stamp.status?.toLowerCase() === 'closed' ? 0.65 : 1.0);
  const isDraft     = stamp.layer === 'draft';

  ctx.save();
  ctx.globalAlpha = opacity;

  // ── 1. Glow / shadow ring ──────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(color, 0.18);
  ctx.fill();

  // ── 2. Main circle fill ────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(color, isDraft ? 0.55 : 0.82);
  ctx.fill();

  // ── 3. Circle stroke ──────────────────────────────────────────────────
  ctx.lineWidth  = isDraft ? 1.5 : 2.5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.setLineDash(isDraft ? [4, 3] : []);   // draft stamps use dashed outline
  ctx.stroke();
  ctx.setLineDash([]);

  // ── 4. Inner highlight arc (top-left gloss) ───────────────────────────
  ctx.beginPath();
  ctx.arc(cx - radius * 0.18, cy - radius * 0.22, radius * 0.55, Math.PI * 1.1, Math.PI * 1.8);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // ── 5. Initials text ──────────────────────────────────────────────────
  const initials   = (stamp.initials || '?').toUpperCase().substring(0, 4);
  const fontSize   = initials.length <= 2 ? Math.round(radius * 0.72) : Math.round(radius * 0.52);

  ctx.font         = `700 ${fontSize}px "Inter", "Helvetica Neue", sans-serif`;
  ctx.fillStyle    = '#FFFFFF';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Subtle text shadow for readability
  ctx.shadowColor  = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur   = 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillText(initials, cx, cy);
  ctx.shadowColor  = 'transparent';
  ctx.shadowBlur   = 0;

  // ── 6. Task ID badge (pill below & right of the circle) ───────────────
  if (stamp.task_id) {
    _drawTaskIdBadge(ctx, stamp.task_id, cx, cy, radius, color);
  }

  // ── 7. Selected highlight ring ────────────────────────────────────────
  if (stamp.selected) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 9, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK ID BADGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws a small pill-shaped badge adjacent to the stamp circle containing
 * the task ID (e.g. "TASK-104").
 */
function _drawTaskIdBadge(ctx, taskId, cx, cy, radius, accentColor) {
  const label    = String(taskId);
  const fontSize = Math.max(9, Math.min(11, radius * 0.36));

  ctx.font         = `600 ${fontSize}px "JetBrains Mono", "Courier New", monospace`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';

  const textWidth  = ctx.measureText(label).width;
  const padH       = 5;
  const padV       = 3;
  const badgeW     = textWidth + padH * 2;
  const badgeH     = fontSize + padV * 2;

  // Position: bottom-right tangent of the circle
  const badgeX = cx + radius * 0.72;
  const badgeY = cy + radius * 0.72;

  // Badge background (dark pill)
  ctx.beginPath();
  _roundRect(ctx, badgeX, badgeY - badgeH / 2, badgeW, badgeH, 4);
  ctx.fillStyle   = 'rgba(24, 24, 27, 0.88)';
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Badge text
  ctx.fillStyle = '#FAFAFA';
  ctx.fillText(label, badgeX + padH, badgeY);
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH DRAW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * drawAllStamps(ctx, stamps, sheetWidth, sheetHeight, layerFilters)
 *
 * Renders an array of stamp objects, optionally filtered by layer.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} stamps
 * @param {number} sheetWidth
 * @param {number} sheetHeight
 * @param {{ showDraft?: boolean, showPublished?: boolean, filterSubId?: string }} layerFilters
 */
export function drawAllStamps(ctx, stamps, sheetWidth, sheetHeight, layerFilters = {}) {
  const { showDraft = true, showPublished = true, filterSubId = null } = layerFilters;

  for (const stamp of stamps) {
    // Layer visibility filter
    if (stamp.layer === 'draft'     && !showDraft)     continue;
    if (stamp.layer === 'published' && !showPublished) continue;
    if (stamp.layer === 'archived') continue;

    // Subcontractor filter
    if (filterSubId && stamp.subcontractor_id !== filterSubId) continue;

    drawCompositeStamp(ctx, stamp, sheetWidth, sheetHeight);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOCUS PULSE ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * drawFocusPulse(ctx, pin, sheetWidth, sheetHeight, progress)
 *
 * Renders an expanding, fading ring around a pin — call this inside an
 * animation loop (requestAnimationFrame) for ~1500ms after navigation.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x_pct: number, y_pct: number, color?: string }} pin
 * @param {number} sheetWidth
 * @param {number} sheetHeight
 * @param {number} progress  0.0 → 1.0  (progress of the animation)
 */
export function drawFocusPulse(ctx, pin, sheetWidth, sheetHeight, progress) {
  const { cx, cy } = pctToCanvas(pin.x_pct, pin.y_pct, sheetWidth, sheetHeight);
  const baseRadius = getStampRadius(sheetWidth);
  const color      = pin.color || DEFAULT_COLOR;

  // Easing: ease-out cubic
  const eased = 1 - Math.pow(1 - progress, 3);

  // Ring expands from baseRadius to 3× baseRadius over the animation
  const ringRadius = baseRadius + eased * (baseRadius * 2.2);
  const ringAlpha  = (1 - eased) * 0.7;

  ctx.save();

  // Outer expanding ring
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(color, ringAlpha);
  ctx.lineWidth   = 3 * (1 - eased * 0.5);
  ctx.stroke();

  // Inner glow (stays near base radius)
  const innerAlpha = (1 - progress) * 0.35;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(color, innerAlpha);
  ctx.lineWidth   = 6;
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// HIT TESTING (for pin click detection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * hitTestStamp(stamps, click_x_pct, click_y_pct, sheetWidth)
 *
 * Returns the first stamp whose circle contains the normalized click point.
 * Used in SheetCanvas mouse/touch handlers to detect which stamp was clicked.
 *
 * @param {object[]} stamps
 * @param {number}   click_x_pct  0–100
 * @param {number}   click_y_pct  0–100
 * @param {number}   sheetWidth   px, used to compute radius in same unit space
 * @returns {object|null}
 */
export function hitTestStamp(stamps, click_x_pct, click_y_pct, sheetWidth) {
  // Work entirely in normalized (%) space
  // Convert radius from px back to % of sheetWidth for comparison
  const radiusPx   = getStampRadius(sheetWidth);
  const radius_pct = (radiusPx / sheetWidth) * 100;

  // Aspect ratio correction for Y axis
  // (stamps are circles in canvas px, not % space, so need aspect ratio)
  // We'll approximate: use (radius_pct * sheetWidth / sheetHeight) for y comparison
  // This is handled in the caller who has sheetHeight, so we use a generous hit radius:
  const hitRadius_pct = radius_pct * 1.3; // 30% generous for touch targets

  for (const stamp of stamps) {
    const dx = click_x_pct - stamp.x_pct;
    const dy = click_y_pct - stamp.y_pct;
    // Euclidean distance in % space (approximate, ignores aspect ratio)
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= hitRadius_pct) {
      return stamp;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a hex color string to an rgba() string with the given alpha.
 * @param {string} hex  e.g. "#EF4444"
 * @param {number} alpha  0–1
 */
export function hexToRgba(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Draw a rounded rectangle path.
 * Polyfill for ctx.roundRect() (not available in all browsers).
 */
function _roundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
}

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  MapPin,
  Layers as LayersIcon,
  Crosshair,
  Compass,
  Building2,
  Upload,
  Trash2
} from 'lucide-react';
import { renderPdfToCanvas, drawCadArchitecturalPlan } from '../services/pdfRenderer';
import { computeSubcontractorInitials } from './CircleStampModal';

export default function SheetCanvas({
  sheet,
  project,
  pins,
  markups,
  activeTool,
  toolOptions,
  selectedPinId,
  onSelectPin,
  onCreatePinAtCoords,
  onOpenCircleStampModal,
  onUpdatePinCoords,
  onUpdatePin,
  onDeletePin,
  currentUser,
  onSaveNewMarkup,
  onDeleteMarkup,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  focusPin,
  onFocusPinConsumed,
  onPinOverlayOpen,
  selectedBuildingId,
  selectedFloorId,
  selectedBuildingName,
  onOpenUploadBlueprint
}) {
  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const markupCanvasRef = useRef(null);

  // Pan & Zoom state
  const [transform, setTransform] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Hover cursor coordinates for real-time HUD
  const [cursorCoords, setCursorCoords] = useState({ x_pct: 0.5, y_pct: 0.5, grid: 'C-2' });

  // Drawing markup state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentPoints, setCurrentPoints] = useState([]);

  // Layer toggles
  const [showPins, setShowPins] = useState(true);
  const [showMarkups, setShowMarkups] = useState(true);

  // Hovered pin tooltip
  const [hoveredPin, setHoveredPin] = useState(null);

  // Pin Dragging & Repositioning state (for admin/GC pin placement)
  const [draggedPin, setDraggedPin] = useState(null); // { pinId, x_pct, y_pct }
  const dragRef = useRef(null); // { pinId, startClientX, startClientY, startXPct, startYPct, hasMoved }

  // Pin Corner Resizing state (for resizing circle stamps smaller / larger)
  const [resizingPin, setResizingPin] = useState(null); // { pinId, scale }
  const resizeRef = useRef(null); // { pinId, centerX, centerY, initialDist, startScale, currentScale }

  // Inline delete confirmation state for mistakenly placed stamps
  const [confirmDeletePinId, setConfirmDeletePinId] = useState(null);

  // Touch gesture state (for pinch zoom)
  const touchStateRef = useRef({ initialDistance: 0, initialScale: 1.0 });

  const imageUrl = sheet?.image_url || (sheet?.image_path ? `/uploads/${sheet.image_path.split(/[\\/]/).pop()}` : null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const isImageBlueprint = !!imageUrl && !imageLoadFailed;

  const [effectiveDims, setEffectiveDims] = useState({
    width: sheet?.width_pts || 1200,
    height: sheet?.height_pts || 800
  });

  const sheetWidth = effectiveDims.width;
  const sheetHeight = effectiveDims.height;

  // Reset dimensions and error state when sheet changes
  useEffect(() => {
    setImageLoadFailed(false);
    setEffectiveDims({
      width: sheet?.width_pts || 1200,
      height: sheet?.height_pts || 800
    });
  }, [sheet?.id, sheet?.width_pts, sheet?.height_pts, imageUrl]);

  // Center the sheet on initial mount and when dimensions change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    const scaleX = (clientWidth - 80) / sheetWidth;
    const scaleY = (clientHeight - 80) / sheetHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.0); // don't zoom in beyond 100%
    const fitX = (clientWidth - sheetWidth * fitScale) / 2;
    const fitY = (clientHeight - sheetHeight * fitScale) / 2;
    setTransform({ x: fitX, y: fitY, scale: fitScale });
  }, [sheet?.id, sheetWidth, sheetHeight]);

  const handleImageLoad = useCallback((e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth > 0 && naturalHeight > 0) {
      const aspect = naturalWidth / naturalHeight;
      const baseWidth = 1200;
      const baseHeight = Math.round(baseWidth / aspect);
      setEffectiveDims(prev => {
        if (prev.width === baseWidth && prev.height === baseHeight) return prev;
        return { width: baseWidth, height: baseHeight };
      });
    }
  }, []);

  const handleImageError = useCallback(() => {
    console.warn('Image blueprint failed to load, falling back to CAD render');
    setImageLoadFailed(true);
  }, []);

  // -------------------------------------------------------------
  // RENDER BASE ARCHITECTURAL SHEET (PDF or Procedural CAD)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!sheet) return;
    if (isImageBlueprint) return; // Handled natively by ultra-high-resolution <img> element

    const canvas = pdfCanvasRef.current;
    if (!canvas) return;

    if (sheet.file_path) {
      // Render from uploaded PDF with 4K resolution
      renderPdfToCanvas(`/api/sheets/${sheet.id}/pdf`, sheet.page_index || 0, canvas)
        .then(result => {
          if (!result.success) {
            canvas.width = 2400;
            canvas.height = 1600;
            drawCadArchitecturalPlan(canvas, sheet, project);
          } else if (result.width && result.height) {
            const aspect = result.width / result.height;
            const baseWidth = 1200;
            const baseHeight = Math.round(baseWidth / aspect);
            setEffectiveDims(prev => {
              if (prev.width === baseWidth && prev.height === baseHeight) return prev;
              return { width: baseWidth, height: baseHeight };
            });
          }
        });
    } else {
      // Render CAD Architectural Floor Plan in crisp 2400x1600
      canvas.width = 2400;
      canvas.height = 1600;
      drawCadArchitecturalPlan(canvas, sheet, project);
    }
  }, [sheet, project, isImageBlueprint]);

  // -------------------------------------------------------------
  // RENDER MARKUPS ON OVERLAY CANVAS
  // -------------------------------------------------------------
  const redrawMarkups = useCallback(() => {
    const canvas = markupCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dpr = canvas.width / sheetWidth || 1;
    if (dpr !== 1) {
      ctx.scale(dpr, dpr);
    }

    if (!showMarkups) {
      ctx.restore();
      return;
    }

    // Draw saved markups
    for (const m of markups) {
      try {
        let mData = m.data;
        while (typeof mData === 'string') {
          try {
            mData = JSON.parse(mData);
          } catch (e) {
            break;
          }
        }
        if (!mData || typeof mData !== 'object') continue;

        const color = mData.color || '#EF4444';
        const strokeWidth = mData.strokeWidth || 3;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (m.type === 'freehand' && mData.points && mData.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(mData.points[0].x * sheetWidth, mData.points[0].y * sheetHeight);
          for (let i = 1; i < mData.points.length; i++) {
            ctx.lineTo(mData.points[i].x * sheetWidth, mData.points[i].y * sheetHeight);
          }
          ctx.stroke();
        } else if (m.type === 'rectangle' && mData.start && mData.end) {
          const x = Math.min(mData.start.x, mData.end.x) * sheetWidth;
          const y = Math.min(mData.start.y, mData.end.y) * sheetHeight;
          const w = Math.abs(mData.end.x - mData.start.x) * sheetWidth;
          const h = Math.abs(mData.end.y - mData.start.y) * sheetHeight;
          ctx.strokeRect(x, y, w, h);
        } else if (m.type === 'circle' && mData.start && mData.end) {
          const cx = ((mData.start.x + mData.end.x) / 2) * sheetWidth;
          const cy = ((mData.start.y + mData.end.y) / 2) * sheetHeight;
          const rx = Math.abs(mData.end.x - mData.start.x) * (sheetWidth / 2);
          const ry = Math.abs(mData.end.y - mData.start.y) * (sheetHeight / 2);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (m.type === 'arrow' && mData.start && mData.end) {
          const sx = mData.start.x * sheetWidth;
          const sy = mData.start.y * sheetHeight;
          const ex = mData.end.x * sheetWidth;
          const ey = mData.end.y * sheetHeight;

          // Line
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(ey - sy, ex - sx);
          const headlen = 14;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - headlen * Math.cos(angle - Math.PI / 6), ey - headlen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(ex - headlen * Math.cos(angle + Math.PI / 6), ey - headlen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();

          if (mData.text) {
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(mData.text, sx + 4, sy - 6);
          }
        } else if (m.type === 'cloud' && mData.points && mData.points.length >= 2) {
          const minX = Math.min(...mData.points.map(p => p.x)) * sheetWidth;
          const maxX = Math.max(...mData.points.map(p => p.x)) * sheetWidth;
          const minY = Math.min(...mData.points.map(p => p.y)) * sheetHeight;
          const maxY = Math.max(...mData.points.map(p => p.y)) * sheetHeight;

          drawCloudScallops(ctx, minX, minY, maxX - minX, maxY - minY, color, strokeWidth);

          if (mData.label) {
            ctx.font = 'bold 10.5px JetBrains Mono, monospace';
            ctx.fillStyle = color;
            ctx.fillText(`[ ${mData.label} ]`, minX + 6, minY - 6);
          }
        } else if (m.type === 'dimension' && mData.start && mData.end) {
          const sx = mData.start.x * sheetWidth;
          const sy = mData.start.y * sheetHeight;
          const ex = mData.end.x * sheetWidth;
          const ey = mData.end.y * sheetHeight;
          const distPx = Math.hypot(ex - sx, ey - sy);
          const feetInches = `${Math.round(distPx / 20)}\'-${Math.round((distPx % 20) * 0.6)}"`;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // Tick marks at ends
          ctx.beginPath();
          ctx.moveTo(sx - 6, sy - 6);
          ctx.lineTo(sx + 6, sy + 6);
          ctx.moveTo(ex - 6, ey - 6);
          ctx.lineTo(ex + 6, ey + 6);
          ctx.stroke();

          ctx.font = 'bold 11px JetBrains Mono, monospace';
          ctx.fillStyle = '#60A5FA';
          ctx.textAlign = 'center';
          ctx.fillText(feetInches, (sx + ex) / 2, (sy + ey) / 2 - 6);
        }
      } catch (err) {
        console.warn('Error drawing markup item:', err);
      }
    }

    // Draw active drawing in progress
    if (isDrawing && drawStart) {
      ctx.strokeStyle = toolOptions?.color || '#EF4444';
      ctx.fillStyle = toolOptions?.color || '#EF4444';
      ctx.lineWidth = toolOptions?.strokeWidth || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'freehand' && currentPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x * sheetWidth, currentPoints[0].y * sheetHeight);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x * sheetWidth, currentPoints[i].y * sheetHeight);
        }
        ctx.stroke();
      } else if (activeTool === 'rectangle' && currentPoints.length > 0) {
        const last = currentPoints[currentPoints.length - 1];
        const x = Math.min(drawStart.x, last.x) * sheetWidth;
        const y = Math.min(drawStart.y, last.y) * sheetHeight;
        const w = Math.abs(last.x - drawStart.x) * sheetWidth;
        const h = Math.abs(last.y - drawStart.y) * sheetHeight;
        ctx.strokeRect(x, y, w, h);
      } else if (activeTool === 'circle' && currentPoints.length > 0) {
        const last = currentPoints[currentPoints.length - 1];
        const cx = ((drawStart.x + last.x) / 2) * sheetWidth;
        const cy = ((drawStart.y + last.y) / 2) * sheetHeight;
        const rx = Math.abs(last.x - drawStart.x) * (sheetWidth / 2);
        const ry = Math.abs(last.y - drawStart.y) * (sheetHeight / 2);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeTool === 'arrow' && currentPoints.length > 0) {
        const last = currentPoints[currentPoints.length - 1];
        const sx = drawStart.x * sheetWidth;
        const sy = drawStart.y * sheetHeight;
        const ex = last.x * sheetWidth;
        const ey = last.y * sheetHeight;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      } else if (activeTool === 'cloud' && currentPoints.length > 0) {
        const last = currentPoints[currentPoints.length - 1];
        const minX = Math.min(drawStart.x, last.x) * sheetWidth;
        const maxX = Math.max(drawStart.x, last.x) * sheetWidth;
        const minY = Math.min(drawStart.y, last.y) * sheetHeight;
        const maxY = Math.max(drawStart.y, last.y) * sheetHeight;
        drawCloudScallops(ctx, minX, minY, maxX - minX, maxY - minY, toolOptions?.color || '#EF4444', 3);
      } else if (activeTool === 'dimension' && currentPoints.length > 0) {
        const last = currentPoints[currentPoints.length - 1];
        const sx = drawStart.x * sheetWidth;
        const sy = drawStart.y * sheetHeight;
        const ex = last.x * sheetWidth;
        const ey = last.y * sheetHeight;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }
    ctx.restore();
  }, [markups, isDrawing, drawStart, currentPoints, activeTool, toolOptions, sheetWidth, sheetHeight, showMarkups]);

  useEffect(() => {
    redrawMarkups();
  }, [redrawMarkups]);

  function drawCloudScallops(ctx, x, y, width, height, color, strokeWidth) {
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    const scallopRadius = 14;

    ctx.beginPath();
    for (let cx = x; cx < x + width; cx += scallopRadius * 1.6) {
      ctx.arc(cx + scallopRadius * 0.8, y, scallopRadius * 0.8, Math.PI, 0, false);
    }
    for (let cy = y; cy < y + height; cy += scallopRadius * 1.6) {
      ctx.arc(x + width, cy + scallopRadius * 0.8, scallopRadius * 0.8, -Math.PI / 2, Math.PI / 2, false);
    }
    for (let cx = x + width; cx > x; cx -= scallopRadius * 1.6) {
      ctx.arc(cx - scallopRadius * 0.8, y + height, scallopRadius * 0.8, 0, Math.PI, false);
    }
    for (let cy = y + height; cy > y; cy -= scallopRadius * 1.6) {
      ctx.arc(x, cy - scallopRadius * 0.8, scallopRadius * 0.8, Math.PI / 2, -Math.PI / 2, false);
    }
    ctx.stroke();
  }

  // -------------------------------------------------------------
  // COORDINATE CALCULATION
  // -------------------------------------------------------------
  const getNormalizedCoords = (e) => {
    const container = containerRef.current;
    if (!container) return { x_pct: 0, y_pct: 0 };

    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const contentX = (screenX - transform.x) / transform.scale;
    const contentY = (screenY - transform.y) / transform.scale;

    const x_pct = Math.max(0, Math.min(1, contentX / sheetWidth));
    const y_pct = Math.max(0, Math.min(1, contentY / sheetHeight));

    // Calculate Grid Line estimate (A-F, 1-4)
    const gridCols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const gridRows = ['1', '2', '3', '4'];
    const colIdx = Math.min(5, Math.floor(x_pct * 6));
    const rowIdx = Math.min(3, Math.floor(y_pct * 4));
    const grid = `${gridCols[colIdx]}-${gridRows[rowIdx]}`;

    return { x_pct, y_pct, grid };
  };

  // -------------------------------------------------------------
  // MOUSE & TOUCH EVENT HANDLERS
  // -------------------------------------------------------------
  const handlePinPointerDown = (e, pin) => {
    e.stopPropagation();
    if (e.button && e.button !== 0) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      pinId: pin.id,
      startClientX: clientX,
      startClientY: clientY,
      startXPct: pin.x_pct,
      startYPct: pin.y_pct,
      hasMoved: false
    };
  };

  const handleResizePointerDown = (e, pin) => {
    e.stopPropagation();
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const pinEl = e.currentTarget.closest('.pin-circle-stamp');
    if (!pinEl) return;
    const rect = pinEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startScale = pin.stamp_scale || 1.0;
    const initialDist = Math.hypot(clientX - centerX, clientY - centerY) || 1;

    resizeRef.current = {
      pinId: pin.id,
      centerX,
      centerY,
      initialDist,
      startScale,
      currentScale: startScale
    };

    setResizingPin({
      pinId: pin.id,
      scale: startScale
    });
  };

  const handleQuickResize = (e, pin, delta) => {
    e.stopPropagation();
    e.preventDefault();
    const current = pin.stamp_scale || 1.0;
    const next = delta === 0 ? 1.0 : Math.max(0.45, Math.min(1.8, Math.round((current + delta) * 100) / 100));
    if (onUpdatePin) {
      onUpdatePin(pin.id, { stamp_scale: next });
    }
  };

  // Global mouseup/touchend to reliably finish dragging or resizing anywhere on screen
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (resizeRef.current) {
        const { pinId, currentScale, startScale } = resizeRef.current;
        resizeRef.current = null;
        setResizingPin(null);
        if (currentScale !== startScale && onUpdatePin) {
          onUpdatePin(pinId, { stamp_scale: currentScale });
        }
      }

      if (dragRef.current) {
        const { pinId, hasMoved } = dragRef.current;
        if (hasMoved && draggedPin && draggedPin.pinId === pinId) {
          if (onUpdatePinCoords) {
            onUpdatePinCoords(pinId, draggedPin.x_pct, draggedPin.y_pct);
          }
        }
        setTimeout(() => {
          dragRef.current = null;
        }, 50);
        setDraggedPin(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, [draggedPin, onUpdatePinCoords, onUpdatePin]);

  // Keyboard shortcut: Delete / Backspace key deletes the currently selected stamp/pin
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPinId && onDeletePin) {
        const pinToDelete = pins.find((p) => p.id === selectedPinId);
        if (pinToDelete) {
          e.preventDefault();
          const initials = pinToDelete.stamp_initials || computeSubcontractorInitials(pinToDelete.assigned_to_company || 'PL');
          if (window.confirm(`Delete stamp [${initials}] #${pinToDelete.item_number} "${pinToDelete.title}"?`)) {
            onDeletePin(selectedPinId, true);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPinId, onDeletePin, pins]);

  const handlePointerDown = (e) => {
    if (e.target.closest('.pin-marker') || e.target.closest('.pin-circle-stamp') || e.target.closest('.canvas-hud-button')) {
      return;
    }

    const coords = getNormalizedCoords(e);
    const { x_pct, y_pct, grid } = coords;

    if (activeTool === 'circle') {
      if (onOpenCircleStampModal) {
        onOpenCircleStampModal({ x_pct, y_pct, grid });
      }
      return;
    }

    if (activeTool === 'pin') {
      onCreatePinAtCoords({ x_pct, y_pct });
      return;
    }

    if (activeTool === 'select') {
      setIsPanning(true);
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setPanStart({ x: clientX - transform.x, y: clientY - transform.y });
      return;
    }

    if (['freehand', 'rectangle', 'arrow', 'cloud', 'dimension'].includes(activeTool)) {
      setIsDrawing(true);
      setDrawStart({ x: x_pct, y: y_pct });
      setCurrentPoints([{ x: x_pct, y: y_pct }]);
    }
  };

  const handlePointerMove = (e) => {
    // Corner resizing check first
    if (resizeRef.current) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const { centerX, centerY, initialDist, startScale, pinId } = resizeRef.current;

      const currentDist = Math.hypot(clientX - centerX, clientY - centerY);
      const ratio = currentDist / initialDist;
      const newScale = Math.max(0.45, Math.min(1.8, Math.round((startScale * ratio) * 100) / 100));

      resizeRef.current.currentScale = newScale;
      setResizingPin({
        pinId,
        scale: newScale
      });
      return;
    }

    const coords = getNormalizedCoords(e);
    setCursorCoords(coords);

    // Pin dragging & placement
    if (dragRef.current) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragRef.current.startClientX;
      const dy = clientY - dragRef.current.startClientY;

      if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 4) {
        dragRef.current.hasMoved = true;
      }

      if (dragRef.current.hasMoved) {
        const deltaXPct = dx / (sheetWidth * (transform?.scale || 1));
        const deltaYPct = dy / (sheetHeight * (transform?.scale || 1));

        const newXPct = Math.max(0.005, Math.min(0.995, dragRef.current.startXPct + deltaXPct));
        const newYPct = Math.max(0.005, Math.min(0.995, dragRef.current.startYPct + deltaYPct));

        setDraggedPin({
          pinId: dragRef.current.pinId,
          x_pct: newXPct,
          y_pct: newYPct
        });
      }
      return;
    }

    if (isPanning && activeTool === 'select') {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setTransform(prev => ({
        ...prev,
        x: clientX - panStart.x,
        y: clientY - panStart.y
      }));
    } else if (isDrawing) {
      if (activeTool === 'freehand') {
        setCurrentPoints(prev => [...prev, { x: coords.x_pct, y: coords.y_pct }]);
      } else {
        setCurrentPoints([{ x: coords.x_pct, y: coords.y_pct }]);
      }
    }
  };

  // Abort drawing if Escape key is pressed
  useEffect(() => {
    const handleAbort = (e) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false);
        setDrawStart(null);
        setCurrentPoints([]);
      }
    };
    window.addEventListener('keydown', handleAbort);
    return () => window.removeEventListener('keydown', handleAbort);
  }, [isDrawing]);

  const handlePointerUp = () => {
    if (resizeRef.current) {
      const { pinId, currentScale, startScale } = resizeRef.current;
      resizeRef.current = null;
      setResizingPin(null);
      if (currentScale !== startScale && onUpdatePin) {
        onUpdatePin(pinId, { stamp_scale: currentScale });
      }
      return;
    }

    if (dragRef.current) {
      const { pinId, hasMoved } = dragRef.current;
      if (hasMoved && draggedPin && draggedPin.pinId === pinId) {
        if (onUpdatePinCoords) {
          onUpdatePinCoords(pinId, draggedPin.x_pct, draggedPin.y_pct);
        }
      }
      setTimeout(() => {
        dragRef.current = null;
      }, 50);
      setDraggedPin(null);
    }

    if (isPanning) {
      setIsPanning(false);
    }

    if (isDrawing && drawStart && currentPoints.length > 0) {
      setIsDrawing(false);
      const endPoint = currentPoints[currentPoints.length - 1];

      let markupData = null;
      if (activeTool === 'freehand' && currentPoints.length > 1) {
        markupData = {
          color: toolOptions?.color || '#EF4444',
          strokeWidth: toolOptions?.strokeWidth || 3,
          points: currentPoints
        };
      } else if (activeTool === 'rectangle') {
        markupData = {
          color: toolOptions?.color || '#EF4444',
          strokeWidth: toolOptions?.strokeWidth || 3,
          start: drawStart,
          end: endPoint
        };
      } else if (activeTool === 'circle') {
        markupData = {
          color: toolOptions?.color || '#EF4444',
          strokeWidth: toolOptions?.strokeWidth || 3,
          start: drawStart,
          end: endPoint
        };
      } else if (activeTool === 'arrow') {
        markupData = {
          color: toolOptions?.color || '#EF4444',
          strokeWidth: toolOptions?.strokeWidth || 3,
          start: drawStart,
          end: endPoint
        };
      } else if (activeTool === 'cloud') {
        markupData = {
          color: toolOptions?.color || '#EF4444',
          strokeWidth: toolOptions?.strokeWidth || 3,
          points: [drawStart, endPoint],
          label: 'REVISION CLOUD'
        };
      } else if (activeTool === 'dimension') {
        markupData = {
          color: toolOptions?.color || '#38BDF8',
          strokeWidth: 2,
          start: drawStart,
          end: endPoint
        };
      }

      if (markupData) {
        onSaveNewMarkup({
          sheet_id: sheet.id,
          type: activeTool,
          data: markupData
        });
      }

      setDrawStart(null);
      setCurrentPoints([]);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
    const newScale = Math.max(0.1, Math.min(12.0, transform.scale * zoomFactor));

    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2 && transform) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStateRef.current = { initialDistance: dist, initialScale: transform.scale };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && transform) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStateRef.current.initialDistance;
      const newScale = Math.max(0.1, Math.min(12.0, touchStateRef.current.initialScale * factor));
      setTransform(prev => ({ ...prev, scale: newScale }));
    }
  };

  const handleZoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(12.0, (prev?.scale || 1.0) * 1.25) }));
  const handleZoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(0.1, (prev?.scale || 1.0) * 0.8) }));
  const handleFitScreen = () => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 80) / sheetWidth;
    const scaleY = (clientHeight - 80) / sheetHeight;
    const fitScale = Math.min(scaleX, scaleY);
    const fitX = (clientWidth - sheetWidth * fitScale) / 2;
    const fitY = (clientHeight - sheetHeight * fitScale) / 2;
    setTransform({ x: fitX, y: fitY, scale: fitScale });
  };
  const handleResetZoom = () => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 80) / sheetWidth;
    const scaleY = (clientHeight - 80) / sheetHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.0);
    const fitX = (clientWidth - sheetWidth * fitScale) / 2;
    const fitY = (clientHeight - sheetHeight * fitScale) / 2;
    setTransform({ x: fitX, y: fitY, scale: fitScale });
  };

  // Safe fallback while initial center-position is being computed
  const t = transform || { x: 0, y: 0, scale: 1.0 };
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 2;

  // Requirement 5 & 8: Empty State when no blueprint exists for selected floor
  if (!sheet && (selectedBuildingId || selectedFloorId)) {
    return (
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-canvas, #F0ECE1)',
        padding: 24
      }}>
        <div style={{
          maxWidth: 500,
          width: '100%',
          backgroundColor: 'var(--bg-surface-1, #FFFFFF)',
          border: '1px solid var(--border-default, #DCD5C8)',
          borderRadius: 12,
          padding: '36px 28px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(40, 30, 20, 0.08)'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <Building2 size={28} color="#D97706" />
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main, #18181B)', margin: '0 0 10px' }}>
            No blueprint available for this floor yet.
          </h3>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--bg-surface-2, #F7F5F0)',
            border: '1px solid var(--border-default, #DCD5C8)',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 16
          }}>
            <span style={{ color: '#5C3A21', fontWeight: 800 }}>
              Building: {selectedBuildingName || selectedBuildingId}
            </span>
            <span style={{ color: '#DCD5C8' }}>•</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>
              Floor: {selectedFloorId || 'Not Selected'}
            </span>
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--text-secondary, #44403C)', lineHeight: 1.5, margin: '0 0 20px' }}>
            A blueprint drawing has not yet been attached for this floor. You can upload a PDF or image plan when ready, or select another floor from the top navigation bar.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {onOpenUploadBlueprint && (
              <button
                onClick={() => onOpenUploadBlueprint?.({
                  buildingName: selectedBuildingName,
                  floorLevel: selectedFloorId
                })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
                }}
              >
                <Upload size={14} /> Upload Floor Blueprint
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchStart={(e) => { handleTouchStart(e); handlePointerDown(e); }}
      onTouchMove={(e) => { handleTouchMove(e); handlePointerMove(e); }}
      onTouchEnd={handlePointerUp}
      onWheel={handleWheel}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-canvas)',
        cursor: activeTool === 'pin' ? 'crosshair' : (activeTool === 'select' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair')
      }}
    >
      {/* Selected Location HUD Badge (Requirement 8) */}
      {(selectedBuildingName || selectedFloorId) && (
        <div style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 25,
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-default, #DCD5C8)',
          borderRadius: 8,
          padding: '5px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11.5,
          fontWeight: 800,
          boxShadow: '0 2px 8px rgba(40, 30, 20, 0.08)',
          pointerEvents: 'none'
        }}>
          <Building2 size={13} color="#D97706" />
          <span style={{ color: '#5C3A21' }}>{selectedBuildingName || selectedBuildingId}</span>
          {selectedFloorId && (
            <>
              <span style={{ color: '#DCD5C8' }}>•</span>
              <span style={{ color: '#D97706' }}>{selectedFloorId}</span>
            </>
          )}
        </div>
      )}

      {/* Transformed Drawing Content Box */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: sheetWidth,
          height: sheetHeight,
          transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
          transformOrigin: '0 0',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85)',
          borderRadius: 2
        }}
      >
        {/* Layer 1: Base Architectural Blueprint (Image / PDF / CAD) */}
        {isImageBlueprint ? (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={sheet.name || 'Blueprint'}
            onLoad={handleImageLoad}
            onError={handleImageError}
            draggable={false}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              display: 'block',
              pointerEvents: 'none',
              userSelect: 'none',
              imageRendering: '-webkit-optimize-contrast'
            }}
          />
        ) : (
          <canvas
            ref={pdfCanvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'block',
              imageRendering: '-webkit-optimize-contrast'
            }}
          />
        )}

        {/* Layer 2: Vector Markup Canvas */}
        <canvas
          ref={markupCanvasRef}
          width={Math.round(sheetWidth * dpr)}
          height={Math.round(sheetHeight * dpr)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: showMarkups ? 'block' : 'none'
          }}
        />

        {/* Layer 3: Punch-List Stamped Circles & Pins */}
        {showPins && pins.map((pin) => {
          const isSelected = pin.id === selectedPinId;
          const isDraggingThis = draggedPin?.pinId === pin.id;
          const isResizingThis = resizingPin?.pinId === pin.id;
          const currentScale = isResizingThis ? resizingPin.scale : (pin.stamp_scale || 1.0);
          const diameter = Math.round(36 * currentScale);
          const initialsFontSize = Math.max(7, Math.round(13 * currentScale));
          const subFontSize = Math.max(5, Math.round(8 * currentScale));
          const borderWidth = Math.max(1.5, Math.round(2.5 * currentScale));

          const displayX = isDraggingThis ? draggedPin.x_pct : pin.x_pct;
          const displayY = isDraggingThis ? draggedPin.y_pct : pin.y_pct;

          const statusBg = {
            open: '#DC2626',
            in_review: '#D97706',
            closed: '#15803D',
            rejected: '#78716C'
          }[pin.status] || '#DC2626';

          const isCritical = pin.priority === 'critical' && pin.status !== 'closed';
          const initials = pin.stamp_initials || computeSubcontractorInitials(pin.assigned_to_company || pin.trade || pin.discipline || 'PL');

          return (
            <div
              key={pin.id}
              className={`pin-circle-stamp ${isSelected ? 'selected' : ''} ${isDraggingThis ? 'is-dragging' : ''}`}
              style={{
                left: `${displayX * 100}%`,
                top: `${displayY * 100}%`,
                width: `${diameter}px`,
                height: `${diameter}px`
              }}
              onMouseDown={(e) => handlePinPointerDown(e, pin)}
              onTouchStart={(e) => handlePinPointerDown(e, pin)}
              onClick={(e) => {
                e.stopPropagation();
                if (dragRef.current?.hasMoved) return;
                onSelectPin(pin);
              }}
              onMouseEnter={() => setHoveredPin(pin)}
              onMouseLeave={() => setHoveredPin(null)}
              title={`[${initials}] ${pin.title} (${pin.assigned_to_company || 'Unassigned'}) - Click to view, Drag corner to resize`}
            >
              {/* Critical pulse animation */}
              {isCritical && <div className="pin-pulse" />}

              {/* Subcontractor Initials Stamped Circle */}
              <div
                className="pin-circle-stamp-inner"
                style={{
                  backgroundColor: statusBg,
                  borderColor: '#FFFFFF',
                  borderWidth: `${borderWidth}px`,
                  boxShadow: isSelected
                    ? `0 0 16px ${statusBg}, 0 6px 16px rgba(0,0,0,0.5)`
                    : '0 4px 12px rgba(0,0,0,0.35)'
                }}
              >
                <span className="pin-circle-initials" style={{ fontSize: `${initialsFontSize}px` }}>{initials}</span>
                <span className="pin-circle-sub" style={{ fontSize: `${subFontSize}px` }}>#{pin.item_number}</span>
              </div>

              {/* Corner Resize Handle & Quick Size Pill (When Selected) */}
              {isSelected && (
                <>
                  <div
                    className="pin-resize-handle"
                    onMouseDown={(e) => handleResizePointerDown(e, pin)}
                    onTouchStart={(e) => handleResizePointerDown(e, pin)}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag corner to resize stamp smaller or larger"
                  >
                    <div className="pin-resize-handle-icon" />
                  </div>

                  <div className="pin-size-toolbar" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="pin-size-btn"
                      onClick={(e) => handleQuickResize(e, pin, -0.15)}
                      title="Make stamp smaller"
                    >
                      −
                    </button>
                    <span className="pin-size-label">
                      {Math.round(currentScale * 100)}%
                    </span>
                    <button
                      type="button"
                      className="pin-size-btn"
                      onClick={(e) => handleQuickResize(e, pin, +0.15)}
                      title="Make stamp larger"
                    >
                      +
                    </button>
                    {onDeletePin && (
                      <>
                        <div className="pin-size-divider" />
                        {confirmDeletePinId === pin.id ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontSize: 9, color: '#F87171', fontWeight: 800 }}>Del?</span>
                            <button
                              type="button"
                              className="pin-size-btn"
                              style={{ color: '#EF4444', fontWeight: 900, background: 'rgba(239, 68, 68, 0.25)' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePin(pin.id, true);
                                setConfirmDeletePinId(null);
                              }}
                              title="Confirm: Delete this stamp"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="pin-size-btn"
                              style={{ color: '#9CA3AF' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeletePinId(null);
                              }}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="pin-size-btn pin-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeletePinId(pin.id);
                            }}
                            title="Delete stamp (remove mistaken placement)"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Dragging coordinate indicator */}
              {isDraggingThis && (
                <div className="pin-drag-hint">
                  {(displayX * 100).toFixed(1)}%, {(displayY * 100).toFixed(1)}%
                </div>
              )}

              {/* Hover / Selected Callout Tag */}
              {!isDraggingThis && (isSelected || hoveredPin?.id === pin.id) && (
                <div className="pin-tag" style={{ borderLeft: `3px solid ${statusBg}`, top: 4, left: diameter + 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: '#18181B' }}>{pin.title}</span>
                    <span style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: 3,
                      backgroundColor: statusBg,
                      color: '#FFFFFF'
                    }}>
                      {pin.status?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    <strong style={{ color: '#D97706' }}>[{initials}]</strong> {pin.assigned_to_company || 'Unassigned Subcontractor'} • {pin.discipline?.toUpperCase()}
                  </div>
                  {pin.root_cause && (
                    <div style={{ fontSize: 9.5, color: '#6B7280', marginTop: 1 }}>
                      Root Cause: {pin.root_cause}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 4, paddingTop: 4, borderTop: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 9, color: '#9CA3AF', fontStyle: 'italic' }}>
                      Drag corner to resize • Del to remove
                    </span>
                    {onDeletePin && (
                      confirmDeletePinId === pin.id ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 9.5, color: '#DC2626', fontWeight: 800 }}>Confirm?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePin(pin.id, true);
                              setConfirmDeletePinId(null);
                            }}
                            style={{
                              background: '#EF4444',
                              border: 'none',
                              color: '#FFFFFF',
                              borderRadius: 3,
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '1px 6px',
                              cursor: 'pointer'
                            }}
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeletePinId(null);
                            }}
                            style={{
                              background: '#E5E7EB',
                              border: 'none',
                              color: '#374151',
                              borderRadius: 3,
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 5px',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeletePinId(pin.id);
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#DC2626',
                            cursor: 'pointer',
                            fontSize: 9.5,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 3,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                          title="Delete this mistakenly placed stamp"
                        >
                          <Trash2 size={10} /> Delete
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Real-Time Precision Coordinate HUD (Bottom Center) */}
      <div className="coordinate-hud">
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5C3A21', fontWeight: 800 }}>
          <Crosshair size={13} color="#D97706" />
          <span>GRID: {cursorCoords.grid}</span>
        </div>
        <div style={{ width: 1, height: 12, backgroundColor: 'var(--border-default)' }} />
        <span>X: {(cursorCoords.x_pct * 100).toFixed(1)}%</span>
        <span>Y: {(cursorCoords.y_pct * 100).toFixed(1)}%</span>
        <div style={{ width: 1, height: 12, backgroundColor: 'var(--border-default)' }} />
        <span style={{ color: '#D97706', fontWeight: 700 }}>SCALE: {sheet?.scale_ratio || '1/4" = 1\'-0"'}</span>
      </div>

      {/* Floating Canvas HUD Controls (Bottom Right) */}
      <div className="canvas-hud-controls">
        <button
          onClick={handleZoomIn}
          className="btn-ghost canvas-hud-button"
          style={{ width: 34, height: 34, padding: 0 }}
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={handleZoomOut}
          className="btn-ghost canvas-hud-button"
          style={{ width: 34, height: 34, padding: 0 }}
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <span style={{ fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--font-mono)', minWidth: 42, textAlign: 'center', color: '#5C3A21' }}>
          {Math.round(t.scale * 100)}%
        </span>
        <button
          onClick={handleFitScreen}
          className="btn-ghost canvas-hud-button"
          style={{ width: 34, height: 34, padding: 0 }}
          title="Fit to Screen"
        >
          <Maximize2 size={15} />
        </button>
        <div style={{ width: 1, height: 18, backgroundColor: 'var(--border-default)' }} />

        {/* Undo Markup Action */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="btn-ghost canvas-hud-button"
          style={{ width: 34, height: 34, padding: 0, opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
          title="Undo Markup (Ctrl+Z / ⌘Z)"
        >
          <RotateCcw size={15} style={{ transform: 'scaleX(-1)' }} />
        </button>

        {/* Toggle Pins Visibility */}
        <button
          onClick={() => setShowPins(!showPins)}
          className={`btn-ghost canvas-hud-button ${showPins ? '' : 'text-muted'}`}
          style={{ width: 34, height: 34, padding: 0, color: showPins ? '#DC2626' : 'var(--text-muted)' }}
          title={showPins ? 'Hide Punch Pins' : 'Show Punch Pins'}
        >
          <MapPin size={15} />
        </button>

        {/* Toggle Markups Visibility */}
        <button
          onClick={() => setShowMarkups(!showMarkups)}
          className={`btn-ghost canvas-hud-button ${showMarkups ? '' : 'text-muted'}`}
          style={{ width: 34, height: 34, padding: 0, color: showMarkups ? '#D97706' : 'var(--text-muted)' }}
          title={showMarkups ? 'Hide Vector Markups' : 'Show Vector Markups'}
        >
          <LayersIcon size={15} />
        </button>
      </div>
    </div>
  );
}

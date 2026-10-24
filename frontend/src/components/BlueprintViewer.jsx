import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  Ruler,
  Layers as LayersIcon,
  X,
  Send,
  Check,
  RotateCcw,
  Crosshair,
  Compass,
  Building,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Plus,
  Upload,
  RefreshCw
} from 'lucide-react';
import { TRADES } from '../data/mockData';

export default function BlueprintViewer({
  sheets,
  activeSheet,
  onSelectSheet,
  punchItems,
  selectedPinId,
  onSelectPin,
  onCloseDrawer,
  onUpdatePunchStatus,
  onAddComment,
  onOpenPhotoLightbox,
  onCreatePinAtCoords,
  onOpenUploadModal,
  selectedBuilding,
  selectedFloor,
  currentUser
}) {
  const containerRef = useRef(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Cursor coordinates over the 1400x900 sheet
  const [cursorCoords, setCursorCoords] = useState({ x_pct: '50.0', y_pct: '50.0', grid: 'D-3' });

  // Tool states
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'dropPin' | 'measure'
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [layers, setLayers] = useState({ pins: true, grid: true, rooms: true, dimensions: true });

  // Measurement tool state
  const [measurePoints, setMeasurePoints] = useState([]);

  // Comment input in slide-over drawer
  const [newCommentText, setNewCommentText] = useState('');

  // Active sheet pins
  const currentSheetPins = activeSheet ? punchItems.filter(p => p.sheetId === activeSheet.id) : [];
  const selectedPin = punchItems.find(p => p.id === selectedPinId);

  // Reset zoom & pan to fit sheet on mount or sheet change
  const handleFitToSheet = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const sheetW = activeSheet?.dimensions?.width || 1400;
    const sheetH = activeSheet?.dimensions?.height || 900;
    const scaleX = (clientWidth - 80) / sheetW;
    const scaleY = (clientHeight - 80) / sheetH;
    const initialScale = Math.min(scaleX, scaleY, 1.2);
    setZoom(initialScale);
    setPan({
      x: (clientWidth - sheetW * initialScale) / 2,
      y: (clientHeight - sheetH * initialScale) / 2
    });
  }, [activeSheet]);

  useEffect(() => {
    handleFitToSheet();
  }, [activeSheet, handleFitToSheet]);

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(prevZoom => {
      const nextZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.3), 3.0);
      return nextZoom;
    });
  };

  // Double click to zoom in
  const handleDoubleClick = (e) => {
    if (e.target.closest('.cad-pin-wrapper')) return;
    setZoom(prev => Math.min(prev * 1.4, 3.0));
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    // If clicking a pin or floating HUD, don't start pan
    if (e.target.closest('.cad-pin-wrapper') || e.target.closest('.floating-hud') || e.target.closest('.slide-over-drawer')) {
      return;
    }
    if (activeTool === 'dropPin') {
      handleCanvasDropPin(e);
      return;
    }
    if (activeTool === 'measure') {
      handleMeasureClick(e);
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const sheetW = activeSheet.dimensions?.width || 1400;
    const sheetH = activeSheet.dimensions?.height || 900;

    // Calculate mouse position relative to the transformed sheet
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    const xPct = Math.min(Math.max((mouseX / sheetW) * 100, 0), 100).toFixed(1);
    const yPct = Math.min(Math.max((mouseY / sheetH) * 100, 0), 100).toFixed(1);

    // Compute CAD grid column and row
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rows = ['1', '2', '3', '4', '5', '6'];
    const colIdx = Math.min(Math.floor((mouseX / sheetW) * cols.length), cols.length - 1);
    const rowIdx = Math.min(Math.floor((mouseY / sheetH) * rows.length), rows.length - 1);
    const gridRef = `${cols[Math.max(colIdx, 0)]}-${rows[Math.max(rowIdx, 0)]}`;

    setCursorCoords({ x_pct: xPct, y_pct: yPct, grid: gridRef });

    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Drop-pin creation on click
  const handleCanvasDropPin = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const sheetW = activeSheet.dimensions?.width || 1400;
    const sheetH = activeSheet.dimensions?.height || 900;
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    const xPct = parseFloat(((mouseX / sheetW) * 100).toFixed(1));
    const yPct = parseFloat(((mouseY / sheetH) * 100).toFixed(1));

    onCreatePinAtCoords({
      x_pct: xPct,
      y_pct: yPct,
      gridLocation: cursorCoords.grid,
      sheetId: activeSheet.id,
      sheetNumber: activeSheet.number
    });
    setActiveTool('select');
  };

  // Measurement click
  const handleMeasureClick = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    if (measurePoints.length >= 2) {
      setMeasurePoints([{ x: mouseX, y: mouseY }]);
    } else {
      setMeasurePoints(prev => [...prev, { x: mouseX, y: mouseY }]);
    }
  };

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPin) return;
    onAddComment(selectedPin.id, newCommentText.trim());
    setNewCommentText('');
  };

  // Calculate trades present on active sheet
  const tradesOnSheetMap = {};
  currentSheetPins.forEach(p => {
    tradesOnSheetMap[p.trade] = (tradesOnSheetMap[p.trade] || 0) + 1;
  });
  const tradesOnSheetList = Object.keys(tradesOnSheetMap).map(tradeKey => ({
    ...TRADES[tradeKey],
    count: tradesOnSheetMap[tradeKey]
  }));

  // Calculate measurement distance if 2 points exist (scale: 1/8" = 1'-0" ~ 12px = 1 foot)
  let measureDistFeet = null;
  if (measurePoints.length === 2) {
    const dx = measurePoints[1].x - measurePoints[0].x;
    const dy = measurePoints[1].y - measurePoints[0].y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const feet = (pixelDist / 12).toFixed(1);
    measureDistFeet = `${feet}' - 0"`;
  }

  // Empty State: No blueprint available for this floor yet
  if (!activeSheet) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg)',
        padding: '40px 24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: 76,
          height: 76,
          borderRadius: 18,
          backgroundColor: 'var(--surface-muted)',
          border: '2px dashed var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          color: 'var(--amber)'
        }}>
          <LayersIcon size={36} strokeWidth={1.7} />
        </div>

        <div className="eyebrow" style={{ color: 'var(--timber)', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{selectedBuilding?.name || 'UMBC Campus'}</span>
          {selectedFloor && (
            <>
              <span>·</span>
              <span style={{ color: 'var(--amber)', fontWeight: 800 }}>{selectedFloor}</span>
            </>
          )}
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>
          No blueprint available for this floor yet.
        </h2>

        <p style={{ maxWidth: 460, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          {selectedBuilding?.name ? (
            <>
              No architectural drawing sheet or CAD floor plan has been attached for <strong>{selectedBuilding.name}</strong> ({selectedFloor || 'Selected Floor'}).
              You can upload an architectural set or image blueprint to start pinning punch items for this floor.
            </>
          ) : (
            'Select a UMBC Building and Floor from the top navigation bar to view its architectural blueprint.'
          )}
        </p>

        {onOpenUploadModal && selectedBuilding && (
          <button
            onClick={() => onOpenUploadModal('new')}
            className="btn btn-primary"
            style={{ height: 42, padding: '0 20px', fontSize: 13 }}
          >
            <Upload size={16} strokeWidth={2.4} />
            <span>Upload Blueprint for {selectedFloor || 'Floor'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: activeTool === 'dropPin' ? 'crosshair' : isPanning ? 'grabbing' : 'grab',
        backgroundColor: 'var(--bg-canvas)',
        backgroundImage: `
          radial-gradient(#D6D1C4 1px, transparent 1px),
          radial-gradient(#D6D1C4 1px, #EDE8DE 1px)
        `,
        backgroundSize: '24px 24px',
        userSelect: 'none'
      }}
    >
      {/* -------------------------------------------------------------
          CANVAS DRAWING SHEET (Uploaded Image or Inline SVG + Pins)
          ------------------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 80ms ease-out',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08)',
          backgroundColor: '#FFFFFF',
          width: activeSheet?.dimensions?.width || 1400,
          height: activeSheet?.dimensions?.height || 900
        }}
      >
        {/* Inner wrapper — provides position:relative context for image + SVG overlay */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>

        {/* ── Mode A: Uploaded Blueprint Image ─────────────────────── */}
        {activeSheet?.image_url ? (
          <>
            {/* Uploaded image fills the full canvas */}
            <img
              src={activeSheet.image_url}
              alt={activeSheet.title || activeSheet.name || 'Blueprint'}
              style={{
                display: 'block',
                width: activeSheet?.dimensions?.width || 1400,
                height: activeSheet?.dimensions?.height || 900,
                objectFit: 'contain',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
              draggable={false}
            />

            {/* SVG Annotation Overlay — pins, measurement, title block */}
            <svg
              width={activeSheet?.dimensions?.width || 1400}
              height={activeSheet?.dimensions?.height || 900}
              viewBox={`0 0 ${activeSheet?.dimensions?.width || 1400} ${activeSheet?.dimensions?.height || 900}`}
              style={{ position: 'absolute', top: 0, left: 0, display: 'block', pointerEvents: 'none' }}
            >
              {/* Measurement Dimension Overlay Line */}
              {measurePoints.length === 2 && (
                <g stroke="var(--amber)" strokeWidth="3">
                  <line x1={measurePoints[0].x} y1={measurePoints[0].y} x2={measurePoints[1].x} y2={measurePoints[1].y} strokeDasharray="6 4" />
                  <circle cx={measurePoints[0].x} cy={measurePoints[0].y} r="5" fill="var(--amber)" />
                  <circle cx={measurePoints[1].x} cy={measurePoints[1].y} r="5" fill="var(--amber)" />
                  <rect
                    x={(measurePoints[0].x + measurePoints[1].x) / 2 - 40}
                    y={(measurePoints[0].y + measurePoints[1].y) / 2 - 24}
                    width="80"
                    height="22"
                    rx="4"
                    fill="#18181B"
                  />
                  <text
                    x={(measurePoints[0].x + measurePoints[1].x) / 2}
                    y={(measurePoints[0].y + measurePoints[1].y) / 2 - 9}
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                  >
                    {measureDistFeet}
                  </text>
                </g>
              )}

              {/* Sheet label badge — top-left corner overlay */}
              <g transform={`translate(12, ${(activeSheet?.dimensions?.height || 900) - 50})`}>
                <rect width="240" height="38" rx="6" fill="rgba(24,24,27,0.82)" />
                <text x="10" y="15" fontSize="10" fontWeight="700" fill="var(--amber)" fontFamily="var(--font-mono)" letterSpacing="0.06em">
                  {activeSheet.building_name || 'UPLOADED BLUEPRINT'}
                </text>
                <text x="10" y="29" fontSize="12" fontWeight="800" fill="#FFFFFF" fontFamily="var(--font-mono)">
                  {activeSheet.number || activeSheet.sheet_number} · {activeSheet.floor_level || activeSheet.revision || 'Rev 1'}
                </text>
              </g>
            </svg>
          </>
        ) : (
          /* ── Mode B: Hardcoded SVG Floor Plan (no image_url) ──────── */
          <svg
            width="1400"
            height="900"
            viewBox="0 0 1400 900"
            style={{ display: 'block' }}
          >
          <defs>
            <pattern id="hatch-core" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#E4E4E7" strokeWidth="1.5" />
            </pattern>
            <pattern id="dot-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#E4DFD5" />
            </pattern>
          </defs>

          {/* Background sheet grid */}
          <rect width="1400" height="900" fill="#FFFFFF" />
          <rect width="1400" height="900" fill="url(#dot-grid)" />

          {/* Exterior Building Boundary */}
          <polygon
            points="80,60 1320,60 1320,840 80,840"
            fill="none"
            stroke="#18181B"
            strokeWidth="5"
          />

          {/* Exterior Mullions & Glass Windows */}
          <g stroke="#0284C7" strokeWidth="2.5" opacity="0.6">
            <line x1="80" y1="180" x2="80" y2="720" strokeDasharray="8 8" />
            <line x1="1320" y1="180" x2="1320" y2="720" strokeDasharray="8 8" />
            <line x1="240" y1="60" x2="1160" y2="60" strokeDasharray="8 8" />
            <line x1="240" y1="840" x2="1160" y2="840" strokeDasharray="8 8" />
          </g>

          {/* Gridlines labeled A–H / 1–6 */}
          {layers.grid && (
            <g opacity="0.85">
              {/* Vertical Column Gridlines A–H */}
              {[
                { label: 'A', x: 180 },
                { label: 'B', x: 340 },
                { label: 'C', x: 500 },
                { label: 'D', x: 660 },
                { label: 'E', x: 820 },
                { label: 'F', x: 980 },
                { label: 'G', x: 1140 },
                { label: 'H', x: 1260 }
              ].map((col) => (
                <g key={col.label}>
                  <line x1={col.x} y1="30" x2={col.x} y2="870" stroke="#71717A" strokeWidth="1" strokeDasharray="10 4 2 4" />
                  <circle cx={col.x} cy="30" r="14" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
                  <text x={col.x} y="35" textAnchor="middle" fontSize="13" fontWeight="bold" fontFamily="var(--font-mono)" fill="#18181B">{col.label}</text>
                  <circle cx={col.x} cy="870" r="14" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
                  <text x={col.x} y="875" textAnchor="middle" fontSize="13" fontWeight="bold" fontFamily="var(--font-mono)" fill="#18181B">{col.label}</text>
                </g>
              ))}

              {/* Horizontal Gridlines 1–6 */}
              {[
                { label: '1', y: 120 },
                { label: '2', y: 260 },
                { label: '3', y: 400 },
                { label: '4', y: 540 },
                { label: '5', y: 680 },
                { label: '6', y: 800 }
              ].map((row) => (
                <g key={row.label}>
                  <line x1="50" y1={row.y} x2="1350" y2={row.y} stroke="#71717A" strokeWidth="1" strokeDasharray="10 4 2 4" />
                  <circle cx="50" cy={row.y} r="14" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
                  <text x="50" y={row.y + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fontFamily="var(--font-mono)" fill="#18181B">{row.label}</text>
                  <circle cx="1350" cy={row.y} r="14" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
                  <text x="1350" y={row.y + 5} textAnchor="middle" fontSize="13" fontWeight="bold" fontFamily="var(--font-mono)" fill="#18181B">{row.label}</text>
                </g>
              ))}
            </g>
          )}

          {/* Central Structural Core (Stairs, Elevators, Shafts) */}
          <rect x="580" y="300" width="340" height="300" fill="url(#hatch-core)" stroke="#18181B" strokeWidth="4" />

          {/* Dual Elevator Shafts */}
          <rect x="610" y="330" width="80" height="90" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
          <line x1="610" y1="330" x2="690" y2="420" stroke="#71717A" strokeWidth="1.5" />
          <line x1="690" y1="330" x2="610" y2="420" stroke="#71717A" strokeWidth="1.5" />
          <text x="650" y="380" textAnchor="middle" fontSize="11" fontWeight="700" fill="#18181B" fontFamily="var(--font-mono)">ELEV 1</text>

          <rect x="710" y="330" width="80" height="90" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
          <line x1="710" y1="330" x2="790" y2="420" stroke="#71717A" strokeWidth="1.5" />
          <line x1="790" y1="330" x2="710" y2="420" stroke="#71717A" strokeWidth="1.5" />
          <text x="750" y="380" textAnchor="middle" fontSize="11" fontWeight="700" fill="#18181B" fontFamily="var(--font-mono)">ELEV 2</text>

          {/* Emergency Stairwell ST-03 */}
          <rect x="610" y="450" width="130" height="120" fill="#FFFFFF" stroke="#18181B" strokeWidth="3" />
          {/* Stair treads */}
          {[465, 480, 495, 510, 525, 540, 555].map((stY, i) => (
            <line key={i} x1="615" y1={stY} x2="735" y2={stY} stroke="#A1A1AA" strokeWidth="1.5" />
          ))}
          <path d="M680 560 L680 470 L720 470" fill="none" stroke="#DC2626" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="675" y="515" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#5C3A21" fontFamily="var(--font-mono)">STAIR ST-03</text>

          {/* Core Restrooms */}
          <rect x="760" y="450" width="130" height="120" fill="#FFFFFF" stroke="#18181B" strokeWidth="2" />
          <line x1="760" y1="510" x2="890" y2="510" stroke="#18181B" strokeWidth="1.5" />
          <text x="825" y="485" textAnchor="middle" fontSize="11" fontWeight="700" fill="#18181B">M RESTROOM</text>
          <text x="825" y="545" textAnchor="middle" fontSize="11" fontWeight="700" fill="#18181B">W RESTROOM</text>

          {/* Major Architectural Partitions & Room Layouts */}
          {/* Conference Room 304 */}
          <rect x="780" y="100" width="280" height="160" fill="#FAFAF9" stroke="#18181B" strokeWidth="3" />
          <ellipse cx="920" cy="180" rx="70" ry="35" fill="#FFFFFF" stroke="#71717A" strokeWidth="1.5" />
          {/* Door Swing */}
          <path d="M780 200 A 35 35 0 0 1 815 235" fill="none" stroke="#5C3A21" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="780" y1="200" x2="780" y2="235" stroke="#5C3A21" strokeWidth="2.5" />

          {/* Executive Boardroom 308 */}
          <rect x="1080" y="320" width="220" height="240" fill="#FAFAF9" stroke="#18181B" strokeWidth="3" />
          <rect x="1120" y="380" width="140" height="110" rx="8" fill="#FFFFFF" stroke="#71717A" strokeWidth="1.5" />

          {/* West Open Office Floorplate */}
          <rect x="120" y="240" width="420" height="420" fill="#FAFAF9" stroke="#18181B" strokeWidth="3" />
          {/* Workstation Pods */}
          <rect x="160" y="280" width="140" height="120" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" strokeDasharray="4 4" />
          <rect x="340" y="280" width="140" height="120" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" strokeDasharray="4 4" />
          <rect x="160" y="440" width="140" height="120" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" strokeDasharray="4 4" />
          <rect x="340" y="440" width="140" height="120" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Room Labels */}
          {layers.rooms && (
            <g>
              <text x="920" y="185" textAnchor="middle" fontSize="13" fontWeight="800" fill="#18181B" letterSpacing="0.06em">CONF ROOM 304</text>
              <text x="1190" y="440" textAnchor="middle" fontSize="13" fontWeight="800" fill="#18181B" letterSpacing="0.06em">EXEC BOARDROOM</text>
              <text x="330" y="260" textAnchor="middle" fontSize="14" fontWeight="800" fill="#18181B" letterSpacing="0.06em">OPEN OFFICE WEST</text>
              <text x="750" y="280" textAnchor="middle" fontSize="13" fontWeight="800" fill="#18181B" letterSpacing="0.06em">MAIN CORRIDOR 3-N</text>
              <text x="750" y="640" textAnchor="middle" fontSize="13" fontWeight="800" fill="#18181B" letterSpacing="0.06em">COLLAB LOUNGE</text>
              <text x="1190" y="720" textAnchor="middle" fontSize="13" fontWeight="800" fill="#18181B" letterSpacing="0.06em">TERRACE PERIMETER</text>
            </g>
          )}

          {/* Title Block (Lower Right Corner): A-301 · LEVEL 03 · 1/8" = 1'-0" */}
          <g transform="translate(1010, 710)">
            <rect width="290" height="115" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
            <line x1="0" y1="35" x2="290" y2="35" stroke="#18181B" strokeWidth="1.5" />
            <line x1="0" y1="75" x2="290" y2="75" stroke="#18181B" strokeWidth="1.5" />
            <line x1="180" y1="75" x2="180" y2="115" stroke="#18181B" strokeWidth="1.5" />

            <text x="12" y="24" fontSize="11" fontWeight="800" fill="var(--timber)" letterSpacing="0.08em">APEX CONSTRUCTION GC</text>
            <text x="12" y="54" fontSize="14" fontWeight="800" fill="#18181B" letterSpacing="-0.02em">{activeSheet?.title || activeSheet?.name || 'Architectural Floor Plan'}</text>
            <text x="12" y="76" fontSize="11" fontWeight="700" fill="#71717A" fontFamily="var(--font-mono)">SCALE: {activeSheet?.scale || '1/8" = 1\'-0"'}</text>
            <text x="12" y="98" fontSize="11" fontWeight="700" fill="var(--amber)" fontFamily="var(--font-mono)">{activeSheet?.revision || activeSheet?.version || 'Rev 1'}</text>
            <text x="195" y="98" fontSize="18" fontWeight="900" fill="var(--amber)" fontFamily="var(--font-mono)">{activeSheet?.number || activeSheet?.sheet_number || 'A-101'}</text>
          </g>

          {/* Measurement Dimension Overlay Line */}
          {measurePoints.length === 2 && (
            <g stroke="var(--amber)" strokeWidth="3">
              <line x1={measurePoints[0].x} y1={measurePoints[0].y} x2={measurePoints[1].x} y2={measurePoints[1].y} strokeDasharray="6 4" />
              <circle cx={measurePoints[0].x} cy={measurePoints[0].y} r="5" fill="var(--amber)" />
              <circle cx={measurePoints[1].x} cy={measurePoints[1].y} r="5" fill="var(--amber)" />
              <rect
                x={(measurePoints[0].x + measurePoints[1].x) / 2 - 40}
                y={(measurePoints[0].y + measurePoints[1].y) / 2 - 24}
                width="80"
                height="22"
                rx="4"
                fill="#18181B"
              />
              <text
                x={(measurePoints[0].x + measurePoints[1].x) / 2}
                y={(measurePoints[0].y + measurePoints[1].y) / 2 - 9}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {measureDistFeet}
              </text>
            </g>
          )}
          </svg>
        )} {/* end ternary: Mode A image | Mode B SVG */}

        {/* -------------------------------------------------------------
            PUNCH PINS (Teardrop CAD markers + Trade Stamp Overlays)
            ------------------------------------------------------------- */}
        {layers.pins && currentSheetPins.map((pin) => {
          const isSelected = selectedPinId === pin.id;
          const isCritical = pin.priority === 'Critical' && pin.status !== 'Resolved';
          const tr = TRADES[pin.trade] || TRADES.AC;

          // Convert percentage coordinates to pixel coordinates within 1400x900 canvas
          const leftPx = (pin.x_pct / 100) * 1400;
          const topPx = (pin.y_pct / 100) * 900;

          return (
            <div
              key={pin.id}
              className={`cad-pin-wrapper ${isSelected ? 'selected' : ''}`}
              style={{ left: leftPx, top: topPx }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPin(pin);
              }}
              title={`${pin.id} · [${pin.trade}] ${pin.title}`}
            >
              {/* Critical Pulsing Halo */}
              {isCritical && <div className="cad-pin-halo" />}

              {/* Selected Highlight Ring */}
              {isSelected && <div className="cad-pin-selected-ring" />}

              {/* Teardrop CAD Pin SVG */}
              <svg width="36" height="48" viewBox="0 0 36 48" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))' }}>
                <path
                  d="M18 2 C9.16 2 2 9.16 2 18 C2 28.5 18 46 18 46 C18 46 34 28.5 34 18 C34 9.16 26.84 2 18 2 Z"
                  fill={tr.color}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                {/* Punch item number inside pin head */}
                <text
                  x="18"
                  y="20"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="var(--font-mono)"
                >
                  {pin.number}
                </text>
              </svg>

              {/* Overlapping 2-Letter Trade Stamp Badge */}
              <div
                className="trade-stamp-badge sm"
                style={{
                  position: 'absolute',
                  right: -6,
                  bottom: 12,
                  backgroundColor: '#18181B',
                  border: `2px solid ${tr.color}`,
                  color: '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                }}
              >
                {pin.trade}
              </div>
            </div>
          );
        })}
        </div> {/* end inner relative wrapper */}
      </div>

      {/* -------------------------------------------------------------
          FLOATING GLASS HUD PANELS
          ------------------------------------------------------------- */}

      {/* 1. TOP-LEFT: Sheet Tab Switcher (A-301, A-302, M-301, E-301, S-201) */}
      <div
        className="glass-hud floating-hud"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: 6,
          display: 'flex',
          gap: 6,
          zIndex: 25
        }}
      >
        {sheets.map((s) => {
          const isActive = s.id === activeSheet.id;
          const pinCount = punchItems.filter(p => p.sheetId === s.id && p.status !== 'Resolved').length;
          return (
            <button
              key={s.id}
              onClick={() => onSelectSheet(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--ink)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--ink)',
                fontWeight: 700,
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                transition: 'all var(--ease-quick)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>{s.number || s.sheet_number}</span>
              {pinCount > 0 && (
                <span style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: isActive ? 'var(--amber)' : '#E4E4E7',
                  color: isActive ? '#FFFFFF' : 'var(--ink)'
                }}>
                  {pinCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Upload Blueprint Sheet Button */}
        <button
          onClick={() => onOpenUploadModal && onOpenUploadModal('new')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px dashed var(--amber)',
            cursor: 'pointer',
            backgroundColor: 'rgba(217, 119, 6, 0.08)',
            color: 'var(--amber)',
            fontWeight: 700,
            fontSize: 12,
            transition: 'all var(--ease-quick)'
          }}
          title="Upload New Blueprint Sheet"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Add Sheet</span>
        </button>
      </div>

      {/* 2. TOP-RIGHT: Vertical Toolbar (Drop-pin, Measure, Layers, Zoom in/out %, Fit) */}
      <div
        className="glass-hud floating-hud"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 25
        }}
      >
        {/* Upload Blueprint / Revision (Admin & GC only) */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'general_contractor') && (
          <button
            onClick={() => onOpenUploadModal && onOpenUploadModal('new')}
            className="btn-icon"
            title="Upload New Blueprint or Revision"
            style={{ borderRadius: 8 }}
          >
            <Upload size={19} />
          </button>
        )}

        {/* Drop Pin Mode (Admin, GC, Architect, Field Inspector — not Owner or Sub) */}
        {currentUser?.role !== 'owner' && currentUser?.role !== 'sub_contractor' && (
          <button
            onClick={() => setActiveTool(activeTool === 'dropPin' ? 'select' : 'dropPin')}
            className="btn-icon"
            title="Drop New Punch Pin (click sheet to place)"
            style={{
              backgroundColor: activeTool === 'dropPin' ? 'var(--amber)' : 'transparent',
              color: activeTool === 'dropPin' ? '#FFFFFF' : 'var(--ink)',
              borderRadius: 8
            }}
          >
            <MapPin size={19} />
          </button>
        )}

        {/* Measure Tool */}
        <button
          onClick={() => {
            setActiveTool(activeTool === 'measure' ? 'select' : 'measure');
            setMeasurePoints([]);
          }}
          className="btn-icon"
          title="Measure Distance on Sheet"
          style={{
            backgroundColor: activeTool === 'measure' ? 'var(--amber)' : 'transparent',
            color: activeTool === 'measure' ? '#FFFFFF' : 'var(--ink)',
            borderRadius: 8
          }}
        >
          <Ruler size={19} />
        </button>

        {/* Layers Toggle */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowLayersMenu(!showLayersMenu)}
            className="btn-icon"
            title="Toggle Blueprint Layers"
            style={{
              backgroundColor: showLayersMenu ? 'var(--surface-hover)' : 'transparent',
              color: 'var(--ink)',
              borderRadius: 8
            }}
          >
            <LayersIcon size={19} />
          </button>

          {showLayersMenu && (
            <div
              className="glass-hud"
              style={{
                position: 'absolute',
                right: '110%',
                top: 0,
                width: 190,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 40
              }}
            >
              <div className="eyebrow" style={{ color: 'var(--timber)', padding: '2px 4px' }}>
                Sheet Layers
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.pins} onChange={(e) => setLayers({ ...layers, pins: e.target.checked })} />
                <span>Punch Pins</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.grid} onChange={(e) => setLayers({ ...layers, grid: e.target.checked })} />
                <span>Column Gridlines</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.rooms} onChange={(e) => setLayers({ ...layers, rooms: e.target.checked })} />
                <span>Room Names</span>
              </label>
            </div>
          )}
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '2px 4px' }} />

        {/* Zoom In */}
        <button
          onClick={() => setZoom(z => Math.min(z * 1.25, 3.0))}
          className="btn-icon"
          title="Zoom In"
          style={{ borderRadius: 8 }}
        >
          <ZoomIn size={19} />
        </button>

        {/* Live Zoom % Readout */}
        <div style={{
          textAlign: 'center',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: 'var(--text-muted)',
          padding: '2px 0'
        }}>
          {Math.round(zoom * 100)}%
        </div>

        {/* Zoom Out */}
        <button
          onClick={() => setZoom(z => Math.max(z * 0.8, 0.3))}
          className="btn-icon"
          title="Zoom Out"
          style={{ borderRadius: 8 }}
        >
          <ZoomOut size={19} />
        </button>

        {/* Fit to Sheet Reset */}
        <button
          onClick={handleFitToSheet}
          className="btn-icon"
          title="Fit Drawing to Screen"
          style={{ borderRadius: 8 }}
        >
          <Maximize2 size={19} />
        </button>
      </div>

      {/* 3. BOTTOM-LEFT: "Trades on Sheet" Legend */}
      <div
        className="glass-hud floating-hud"
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          padding: '10px 14px',
          maxWidth: 320,
          zIndex: 25
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 6, color: 'var(--timber)' }}>
          Trades on Sheet ({currentSheetPins.length} pins)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tradesOnSheetList.map((t) => (
            <div
              key={t.code}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 6,
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border-subtle)',
                fontSize: 11
              }}
            >
              <span className="trade-stamp-badge sm" style={{ backgroundColor: t.color }}>
                {t.code}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.name.split('/')[0]}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>
                ({t.count})
              </span>
            </div>
          ))}
          {tradesOnSheetList.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No punch pins on this sheet.</div>
          )}
        </div>
      </div>

      {/* 4. BOTTOM-CENTER: Live Coordinate HUD Chip */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25
        }}
      >
        <div className="hud-coord-chip">
          <Crosshair size={14} color="var(--amber)" />
          <span>X {cursorCoords.x_pct}% · Y {cursorCoords.y_pct}%</span>
          <span style={{ color: '#71717A' }}>|</span>
          <span style={{ color: '#FCD34D' }}>GRID {cursorCoords.grid}</span>
        </div>
      </div>

      {/* -------------------------------------------------------------
          SLIDE-OVER DETAIL DRAWER (480px)
          ------------------------------------------------------------- */}
      {selectedPin && (
        <>
          <div className="drawer-backdrop" onClick={onCloseDrawer} />
          <div className="slide-over-drawer">
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              backgroundColor: 'var(--surface-muted)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  className="trade-stamp-badge lg"
                  style={{ backgroundColor: TRADES[selectedPin.trade]?.color || 'var(--amber)' }}
                >
                  {selectedPin.trade}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="chip-mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      {selectedPin.id}
                    </span>
                    <span className={`chip chip-priority-${selectedPin.priority.toLowerCase()}`}>
                      {selectedPin.priority}
                    </span>
                    <span className={`chip chip-status-${selectedPin.status === 'In Progress' ? 'progress' : selectedPin.status === 'In Review' ? 'review' : selectedPin.status.toLowerCase()}`}>
                      {selectedPin.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {TRADES[selectedPin.trade]?.name}
                  </div>
                </div>
              </div>

              <button
                onClick={onCloseDrawer}
                className="btn-icon"
                style={{ width: 32, height: 32 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {/* Title & Description */}
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 12 }}>
                {selectedPin.title}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                {selectedPin.description}
              </p>

              {/* Meta Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                marginBottom: 24
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Assignee</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{selectedPin.assignee}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Company</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{selectedPin.company}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Location</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{selectedPin.room}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Coordinates</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--timber)' }}>
                    X {selectedPin.x_pct}% · Y {selectedPin.y_pct}% ({selectedPin.gridLocation})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Due Date</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{selectedPin.dueDate}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Created</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{selectedPin.createdAt.split('T')[0]}</div>
                </div>
              </div>

              {/* Field Photo Thumbnails */}
              {selectedPin.photos && selectedPin.photos.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div className="eyebrow" style={{ marginBottom: 8, color: 'var(--timber)' }}>
                    Field Photos ({selectedPin.photos.length})
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {selectedPin.photos.map((photoUrl, idx) => (
                      <img
                        key={idx}
                        src={photoUrl}
                        alt="Field observation"
                        onClick={() => onOpenPhotoLightbox({
                          title: selectedPin.title,
                          punchId: selectedPin.id,
                          trade: selectedPin.trade,
                          gridLocation: selectedPin.gridLocation,
                          date: selectedPin.createdAt.split('T')[0],
                          capturedBy: selectedPin.createdBy,
                          url: photoUrl
                        })}
                        style={{
                          width: 100,
                          height: 80,
                          borderRadius: 8,
                          objectFit: 'cover',
                          cursor: 'pointer',
                          border: '1.5px solid var(--border)',
                          transition: 'transform 120ms ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div style={{ marginBottom: 24 }}>
                <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--timber)' }}>
                  Audit History & Timeline
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedPin.history && selectedPin.history.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--amber)', marginTop: 5 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{h.action}</span>
                        <span style={{ color: 'var(--text-muted)' }}> by {h.by}</span>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{h.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments Stream */}
              <div style={{ marginBottom: 24 }}>
                <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--timber)' }}>
                  Discussion ({selectedPin.comments ? selectedPin.comments.length : 0})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  {selectedPin.comments && selectedPin.comments.map((c) => (
                    <div key={c.id} style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--surface-muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{c.author} ({c.role})</span>
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{c.time}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.text}</div>
                    </div>
                  ))}
                  {(!selectedPin.comments || selectedPin.comments.length === 0) && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No comments recorded yet.</div>
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleSendComment} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Add field note or directive..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="input-field"
                    style={{ flex: 1, height: 38 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ height: 38, padding: '0 12px' }}>
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 12,
              backgroundColor: 'var(--surface)'
            }}>
              <button
                onClick={() => {
                  const nextStatus = selectedPin.status === 'Resolved' ? 'Open' : 'Resolved';
                  onUpdatePunchStatus(selectedPin.id, nextStatus);
                }}
                className="btn btn-primary"
                style={{ flex: 1, height: 42 }}
              >
                <Check size={16} strokeWidth={2.5} />
                <span>{selectedPin.status === 'Resolved' ? 'Reopen Punch' : 'Mark Resolved'}</span>
              </button>

              <button
                onClick={() => {
                  alert(`Reassigning ${selectedPin.id}: Assigned foreman notified.`);
                }}
                className="btn btn-ghost"
                style={{ flex: 1, height: 42 }}
              >
                <span>Reassign Trade</span>
              </button>

              <button
                onClick={() => onOpenUploadModal && onOpenUploadModal('version', activeSheet)}
                className="btn btn-ghost"
                style={{ height: 42, padding: '0 14px' }}
                title="Upload Latest Revision for this Sheet"
              >
                <RefreshCw size={15} />
                <span>Revision</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer,
  MapPin,
  PenTool,
  Cloud,
  Square,
  Circle,
  MoveRight,
  Ruler,
  Download,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import './Toolbar.css';

export default function Toolbar({
  activeTool,
  onSelectTool,
  toolOptions,
  onChangeOptions,
  onClearMarkups,
  onOpenExport,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showStylePopover, setShowStylePopover] = useState(false);
  const popoverRef = useRef(null);

  const tools = [
    { id: 'select', label: 'Pan / Select (V)', icon: MousePointer },
    { id: 'pin', label: 'Drop Punch Pin (P)', icon: MapPin, highlight: true },
    { id: 'freehand', label: 'Freehand Pen (B)', icon: PenTool, hasStyle: true },
    { id: 'cloud', label: 'Revision Cloud (C)', icon: Cloud, hasStyle: true },
    { id: 'rectangle', label: 'Rectangle Box (R)', icon: Square, hasStyle: true },
    { id: 'circle', label: 'Circle Stamp / Subcontractor (O)', icon: Circle, highlight: true },
    { id: 'arrow', label: 'Arrow Callout (A)', icon: MoveRight, hasStyle: true },
    { id: 'dimension', label: 'Dimension / Measure (D)', icon: Ruler, hasStyle: true }
  ];

  const colors = [
    { value: '#DC2626', label: 'Crimson Red (Critical Defect)' },
    { value: '#D97706', label: 'Construction Amber (Review)' },
    { value: '#EAB308', label: 'Safety Yellow (Electrical/Warning)' },
    { value: '#5C3A21', label: 'Timber Brown (Architectural)' },
    { value: '#18181B', label: 'Deep Black (Structural)' },
    { value: '#FFFFFF', label: 'White (High Contrast)' }
  ];

  const strokeWidths = [
    { value: 2, label: '2px (Fine)' },
    { value: 4, label: '4px (Med)' },
    { value: 8, label: '8px (Bold)' }
  ];

  const currentToolObj = tools.find(t => t.id === activeTool) || tools[0];
  const CurrentIcon = currentToolObj.icon;
  const isDrawingTool = ['freehand', 'cloud', 'rectangle', 'circle', 'arrow', 'dimension'].includes(activeTool);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowStylePopover(false);
      }
    }
    if (showStylePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showStylePopover]);

  // If minimized, display compact pill with active tool & expand toggle
  if (isMinimized) {
    return (
      <div className="floating-toolbar-container">
        <div
          className="floating-toolbar-collapsed"
          onClick={() => setIsMinimized(false)}
          title="Click to expand markup tools"
        >
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: currentToolObj.highlight ? '#DC2626' : '#5C3A21',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CurrentIcon size={14} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-main)' }}>
            {currentToolObj.label.split('(')[0].trim()}
          </span>
          <ChevronDown size={14} color="var(--text-muted)" />
        </div>
      </div>
    );
  }

  return (
    <div className="floating-toolbar-container" ref={popoverRef}>
      <div className="floating-toolbar">
        {/* Primary Tool Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {tools.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTool(t.id);
                  if (t.hasStyle) {
                    // if selecting drawing tool, allow user to quickly see style
                  }
                }}
                className={`toolbar-btn ${isActive ? 'active' : ''} ${t.highlight ? 'highlight' : ''}`}
                title={t.label}
                aria-label={t.label}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>

        <div className="toolbar-divider" />

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="toolbar-btn"
            style={{
              opacity: canUndo ? 1 : 0.35,
              cursor: canUndo ? 'pointer' : 'not-allowed'
            }}
            title="Undo Drawing / Markup (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="toolbar-btn"
            style={{
              opacity: canRedo ? 1 : 0.35,
              cursor: canRedo ? 'pointer' : 'not-allowed'
            }}
            title="Redo Drawing / Markup (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* Style / Palette Popover Trigger (When drawing tools are active) */}
        {isDrawingTool && (
          <>
            <div className="toolbar-divider" />
            <button
              onClick={() => setShowStylePopover(!showStylePopover)}
              className={`toolbar-style-trigger ${showStylePopover ? 'active' : ''}`}
              title="Change Line Color and Stroke Thickness"
            >
              <div
                className="toolbar-color-swatch"
                style={{ backgroundColor: toolOptions?.color || '#DC2626' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {toolOptions?.strokeWidth || 4}px
              </span>
              <SlidersHorizontal size={12} color="var(--text-muted)" />
            </button>
          </>
        )}

        <div className="toolbar-divider" />

        {/* Quick Export Button */}
        <button
          onClick={onOpenExport}
          className="toolbar-btn"
          style={{
            color: '#92400E',
            backgroundColor: '#FFFBEB',
            borderColor: '#FCD34D',
            width: 'auto',
            padding: '0 10px',
            gap: 5
          }}
          title="Export Annotated PDF or Punch List"
        >
          <Download size={14} color="#D97706" />
          <span className="toolbar-export-text" style={{ fontSize: 11, fontWeight: 800 }}>Export</span>
        </button>

        {/* Minimize Button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="toolbar-btn"
          style={{ width: 28, height: 28, minWidth: 28 }}
          title="Minimize Toolbar"
        >
          <ChevronUp size={14} />
        </button>
      </div>

      {/* Style Popover for Drawing Options */}
      {isDrawingTool && showStylePopover && (
        <div className="toolbar-palette-popover">
          <div>
            <div className="toolbar-palette-section-title">Color Palette</div>
            <div className="toolbar-colors-grid" style={{ marginTop: 6 }}>
              {colors.map((c) => (
                <div
                  key={c.value}
                  onClick={() => onChangeOptions({ color: c.value })}
                  className={`toolbar-color-option ${toolOptions?.color === c.value ? 'selected' : ''}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: 'var(--border-default)' }} />

          <div>
            <div className="toolbar-palette-section-title">Stroke Weight</div>
            <div className="toolbar-widths-row" style={{ marginTop: 6 }}>
              {strokeWidths.map((sw) => (
                <button
                  key={sw.value}
                  onClick={() => onChangeOptions({ strokeWidth: sw.value })}
                  className={`toolbar-width-btn ${toolOptions?.strokeWidth === sw.value ? 'selected' : ''}`}
                >
                  {sw.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

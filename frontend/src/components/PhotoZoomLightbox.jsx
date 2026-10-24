import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import './PhotoZoomLightbox.css';

export default function PhotoZoomLightbox({
  imageUrl,
  title = 'Inspection Photo',
  caption = '',
  uploadedBy = '',
  createdAt = '',
  onClose
}) {
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setScale((prev) => Math.max(0.5, Math.min(8.0, prev * factor)));
  };

  // Drag pan
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => setScale((s) => Math.min(8.0, s * 1.25));
  const handleZoomOut = () => setScale((s) => Math.max(0.5, s * 0.8));
  const handleReset = () => {
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = imageUrl.split('.').pop().split('?')[0] || 'jpg';
      a.download = `blueprint-inspection-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = 'inspection-photo.jpg';
      a.target = '_blank';
      a.click();
    }
  };

  return (
    <div className="photo-lightbox-backdrop" onClick={onClose}>
      <div className="photo-lightbox-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header HUD */}
        <div className="photo-lightbox-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="photo-lightbox-badge">
              <ImageIcon size={15} color="#D97706" />
            </div>
            <div>
              <h3 className="photo-lightbox-title">{title}</h3>
              {caption && <p className="photo-lightbox-caption">{caption}</p>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Download Button */}
            <button
              className="photo-lightbox-btn primary"
              onClick={handleDownload}
              title="Download full quality photo"
            >
              <Download size={14} />
              <span>Download</span>
            </button>

            {/* Close Button */}
            <button
              className="photo-lightbox-btn ghost"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Zoom & Pan Viewport */}
        <div
          ref={containerRef}
          className="photo-lightbox-viewport"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default') }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="photo-lightbox-img"
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center'
            }}
          />
        </div>

        {/* Floating Zoom HUD Controls */}
        <div className="photo-lightbox-hud">
          <button className="photo-hud-btn" onClick={handleZoomOut} title="Zoom Out (-)">
            <ZoomOut size={15} />
          </button>
          <span className="photo-hud-zoom-text">{Math.round(scale * 100)}%</span>
          <button className="photo-hud-btn" onClick={handleZoomIn} title="Zoom In (+)">
            <ZoomIn size={15} />
          </button>
          <div className="photo-hud-divider" />
          <button className="photo-hud-btn" onClick={handleReset} title="Reset Zoom / Fit">
            <RotateCcw size={15} />
          </button>
          {uploadedBy && (
            <>
              <div className="photo-hud-divider" />
              <span className="photo-hud-meta">By {uploadedBy}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

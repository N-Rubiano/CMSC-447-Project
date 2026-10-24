import React, { useState } from 'react';
import {
  Camera,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { FIELD_PHOTOS, TRADES } from '../data/mockData';

export default function PhotosPage({ onSelectPunchById }) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const activePhoto = selectedPhotoIndex !== null ? FIELD_PHOTOS[selectedPhotoIndex] : null;

  const handlePrev = (e) => {
    e.stopPropagation();
    setLightboxZoom(1);
    setSelectedPhotoIndex(prev => (prev > 0 ? prev - 1 : FIELD_PHOTOS.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setLightboxZoom(1);
    setSelectedPhotoIndex(prev => (prev < FIELD_PHOTOS.length - 1 ? prev + 1 : 0));
  };

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '24px 28px',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--timber)', marginBottom: 4 }}>
            Visual Audit Trail
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>
            Geotagged Field Photos
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            High-resolution visual punch observations linked directly to drawing coordinates.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="chip-mono" style={{ fontSize: 12 }}>
            {FIELD_PHOTOS.length} Captured Images
          </span>
        </div>
      </div>

      {/* Grid of Geotagged Field Photos — or empty state */}
      {FIELD_PHOTOS.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 0',
          gap: 16,
          color: 'var(--text-muted)'
        }}>
          <Camera size={48} strokeWidth={1.2} color="var(--border)" />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)' }}>No field photos yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
            Photos will appear here once punch items with attached images are created on a building floor blueprint.
          </div>
        </div>
      ) : (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 20
      }}>
        {FIELD_PHOTOS.map((photo, index) => {
          const tr = TRADES[photo.trade] || TRADES.AC;
          return (
            <div
              key={photo.id}
              onClick={() => {
                setSelectedPhotoIndex(index);
                setLightboxZoom(1);
              }}
              className="card"
              style={{
                position: 'relative',
                height: 260,
                borderRadius: 'var(--radius-card)',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
            >
              {/* Image */}
              <img
                src={photo.url}
                alt={photo.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 250ms ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />

              {/* Trade Stamp Overlay in Top Corner */}
              <div style={{
                position: 'absolute',
                top: 14,
                left: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span
                  className="trade-stamp-badge"
                  style={{
                    backgroundColor: tr.color,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    border: '1.5px solid #FFFFFF'
                  }}
                >
                  {photo.trade}
                </span>
                <span className="chip-mono" style={{ background: 'rgba(24, 24, 27, 0.85)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {photo.punchId}
                </span>
              </div>

              {/* Bottom Gradient Caption */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '36px 16px 14px',
                background: 'linear-gradient(to top, rgba(24, 24, 27, 0.95) 0%, rgba(24, 24, 27, 0.6) 65%, transparent 100%)',
                color: '#FFFFFF'
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {photo.title}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 4,
                  fontSize: 11,
                  color: '#D4D4D8',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span>Grid {photo.gridLocation} • {photo.room}</span>
                  <span>{photo.date.split(' ')[0]}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* -------------------------------------------------------------
          INTERACTIVE PHOTO LIGHTBOX
          ------------------------------------------------------------- */}
      {activePhoto && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPhotoIndex(null)}
          style={{
            zIndex: 200,
            padding: 0,
            backgroundColor: 'rgba(15, 15, 17, 0.95)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100vw',
              height: '100vh',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button Top Right */}
            <button
              onClick={() => setSelectedPhotoIndex(null)}
              className="btn-icon"
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 40,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF'
              }}
            >
              <X size={20} />
            </button>

            {/* Left Prev Arrow Button */}
            <button
              onClick={handlePrev}
              className="btn-icon"
              style={{
                position: 'absolute',
                left: 24,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 30,
                width: 46,
                height: 46,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF'
              }}
            >
              <ChevronLeft size={28} />
            </button>

            {/* Right Next Arrow Button */}
            <button
              onClick={handleNext}
              className="btn-icon"
              style={{
                position: 'absolute',
                right: 384, // clear side metadata panel
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 30,
                width: 46,
                height: 46,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF'
              }}
            >
              <ChevronRight size={28} />
            </button>

            {/* Main Photo Zoom Canvas Area */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              padding: '40px 60px'
            }}>
              <div
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src={activePhoto.url}
                  alt={activePhoto.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '85vh',
                    objectFit: 'contain',
                    transform: `scale(${lightboxZoom})`,
                    transition: 'transform 180ms ease',
                    borderRadius: 8,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                    cursor: lightboxZoom === 1 ? 'zoom-in' : 'zoom-out'
                  }}
                  onClick={() => setLightboxZoom(prev => (prev === 1 ? 1.7 : 1))}
                />
              </div>

              {/* Floating Zoom Controls Bar */}
              <div style={{
                position: 'absolute',
                bottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(24, 24, 27, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF'
              }}>
                <button
                  onClick={() => setLightboxZoom(z => Math.max(z - 0.3, 0.7))}
                  className="btn-icon"
                  style={{ width: 32, height: 32, color: '#FFFFFF' }}
                >
                  <ZoomOut size={16} />
                </button>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', minWidth: 46, textAlign: 'center' }}>
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  onClick={() => setLightboxZoom(z => Math.min(z + 0.3, 3))}
                  className="btn-icon"
                  style={{ width: 32, height: 32, color: '#FFFFFF' }}
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setLightboxZoom(1)}
                  className="btn-icon"
                  style={{ width: 32, height: 32, color: '#FFFFFF' }}
                  title="Reset Zoom"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            {/* Side Metadata Panel (360px) */}
            <div style={{
              width: 360,
              backgroundColor: '#18181B',
              borderLeft: '1px solid #27272A',
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#FFFFFF'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span
                    className="trade-stamp-badge lg"
                    style={{ backgroundColor: TRADES[activePhoto.trade]?.color || 'var(--amber)' }}
                  >
                    {activePhoto.trade}
                  </span>
                  <div>
                    <span className="chip-mono" style={{ backgroundColor: '#27272A', color: '#F4F4F5', border: '1px solid #3F3F46' }}>
                      {activePhoto.punchId}
                    </span>
                    <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 3 }}>
                      {TRADES[activePhoto.trade]?.name}
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', marginBottom: 12 }}>
                  {activePhoto.title}
                </h3>

                <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.6, marginBottom: 24 }}>
                  {activePhoto.caption}
                </p>

                {/* Metadata List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, backgroundColor: '#222226', borderRadius: 8, border: '1px solid #2E2E33' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPin size={16} color="var(--amber)" />
                    <div>
                      <div style={{ fontSize: 11, color: '#A1A1AA' }}>Location / Grid</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{activePhoto.room} (Grid {activePhoto.gridLocation})</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <User size={16} color="var(--timber)" />
                    <div>
                      <div style={{ fontSize: 11, color: '#A1A1AA' }}>Captured By</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{activePhoto.capturedBy}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={16} color="#0284C7" />
                    <div>
                      <div style={{ fontSize: 11, color: '#A1A1AA' }}>Timestamp</div>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>{activePhoto.date} EDT</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button: Open Punch Item */}
              <button
                onClick={() => {
                  setSelectedPhotoIndex(null);
                  onSelectPunchById(activePhoto.punchId);
                }}
                className="btn btn-primary"
                style={{ width: '100%', height: 44 }}
              >
                <span>Open Punch Item on Blueprint</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
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
  Maximize2,
  Building2,
  Layers
} from 'lucide-react';
import { TRADES } from '../data/mockData';
import { api } from '../services/api';

const DISCIPLINE_TO_TRADE = {
  architectural: 'AC',
  mechanical: 'MP',
  plumbing: 'MP',
  electrical: 'EL',
  fire: 'FP',
  'fire protection': 'FP',
  structural: 'ST',
  glazing: 'GL',
  drywall: 'DW',
  flooring: 'FL',
};

function resolveTradeInfo(pin) {
  const raw = (pin?.trade || pin?.stamp_initials || '').toString().trim().toUpperCase();
  if (raw && TRADES[raw]) return TRADES[raw];
  const disc = (pin?.discipline || '').toString().trim().toLowerCase();
  const mappedCode = DISCIPLINE_TO_TRADE[disc];
  if (mappedCode && TRADES[mappedCode]) return TRADES[mappedCode];
  if (raw) return { code: raw.slice(0, 2), name: raw, color: '#D97706' };
  return TRADES.AC || { code: 'AC', name: 'Architectural', color: '#4F46E5' };
}

function formatPinLabel(pin, fallbackId = '') {
  if (pin?.item_number != null) return `#${pin.item_number}`;
  if (pin?.pin_item_number != null) return `#${pin.pin_item_number}`;
  const id = String(pin?.id || fallbackId || '');
  if (id.startsWith('pin-')) return `#${id.slice(4, 10).toUpperCase()}`;
  return id || '—';
}

function formatStageLabel(type = 'progress') {
  const t = String(type || 'progress').toLowerCase();
  if (t === 'resolved' || t === 'completion') return 'Completion';
  if (t === 'issue') return 'Issue';
  return 'Progress';
}

export default function PhotosPage({ project, sheets = [], punchItems = [], onSelectPunchById }) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [stageFilter, setStageFilter] = useState('all'); // 'all' | 'progress' | 'issue' | 'resolved'
  const [serverPhotos, setServerPhotos] = useState([]);

  useEffect(() => {
    let active = true;
    if (!project?.id) {
      setServerPhotos([]);
      return undefined;
    }
    api.getProjectPhotos(project.id)
      .then((rows) => {
        if (active && Array.isArray(rows)) setServerPhotos(rows);
      })
      .catch((err) => {
        console.warn('Could not load project photos:', err);
      });
    return () => { active = false; };
  }, [project?.id, punchItems]);

  const sheetById = useMemo(() => {
    const map = new Map();
    for (const s of sheets) map.set(s.id, s);
    return map;
  }, [sheets]);

  const pinById = useMemo(() => {
    const map = new Map();
    for (const p of punchItems) map.set(p.id, p);
    return map;
  }, [punchItems]);

  const photos = useMemo(() => {
    const byKey = new Map();

    // 1. Live photos attached to punchItems in memory (immediate sync on upload)
    for (const pin of punchItems) {
      const pinPhotos = Array.isArray(pin.photos) ? pin.photos : [];
      const sheet = sheetById.get(pin.sheet_id || pin.sheetId);
      const tr = resolveTradeInfo(pin);
      for (let i = 0; i < pinPhotos.length; i++) {
        const entry = pinPhotos[i];
        const url = typeof entry === 'string' ? entry : entry?.url;
        if (!url) continue;
        const entryId = (typeof entry === 'object' && entry?.id) || `${pin.id}-photo-${i}`;
        const rawType = (typeof entry === 'object' && entry?.type) || 'progress';
        const key = (typeof entry === 'object' && entry?.id) || url;
        byKey.set(key, {
          id: entryId,
          url,
          type: String(rawType).toLowerCase(),
          stageLabel: formatStageLabel(rawType),
          title: pin.title || 'Field Observation',
          caption: (typeof entry === 'object' && entry?.caption) || pin.description || 'Field progress photo.',
          trade: tr.code,
          tradeName: tr.name,
          tradeColor: tr.color,
          punchId: pin.id,
          pinLabel: formatPinLabel(pin),
          pinStatus: pin.status || 'Open',
          projectName: project?.name || 'UMBC Campus',
          projectCode: project?.code || '',
          buildingName: sheet?.building_name || pin.building_name || '',
          floorLevel: sheet?.floor_level || pin.floor_level || '',
          sheetNumber: sheet?.sheet_number || sheet?.number || '',
          room: pin.room || pin.room_location || sheet?.name || 'Site Location',
          gridLocation: pin.gridLocation || pin.grid_location || '',
          capturedBy: (typeof entry === 'object' && entry?.uploaded_by) || pin.createdBy || pin.created_by_name || 'Field Inspector',
          date: ((typeof entry === 'object' && entry?.created_at) || pin.createdAt || pin.created_at || '').slice(0, 10) || 'Recent',
        });
      }
    }

    // 2. Persisted photos from /api/projects/:id/photos (ensures full sync across reloads/floors)
    for (const sp of serverPhotos) {
      const key = sp.id || sp.url;
      if (!sp.url || byKey.has(key)) continue;
      const pin = pinById.get(sp.pin_id);
      const sheet = sheetById.get(sp.sheet_id || pin?.sheet_id);
      const tr = resolveTradeInfo(pin || {});
      byKey.set(key, {
        id: sp.id,
        url: sp.url,
        type: String(sp.type || 'progress').toLowerCase(),
        stageLabel: formatStageLabel(sp.type),
        title: sp.pin_title || pin?.title || 'Field Observation',
        caption: sp.caption || sp.comment_body || 'Field progress photo.',
        trade: tr.code,
        tradeName: tr.name,
        tradeColor: tr.color,
        punchId: sp.pin_id,
        pinLabel: formatPinLabel(pin || sp, sp.pin_id),
        pinStatus: sp.pin_status || pin?.status || 'Open',
        projectName: project?.name || 'UMBC Campus',
        projectCode: project?.code || '',
        buildingName: sheet?.building_name || '',
        floorLevel: sheet?.floor_level || '',
        sheetNumber: sp.sheet_number || sheet?.sheet_number || '',
        room: sp.location || pin?.room_location || 'Site Location',
        gridLocation: pin?.gridLocation || pin?.grid_location || '',
        capturedBy: sp.uploaded_by || 'Field Inspector',
        date: String(sp.created_at || '').slice(0, 10) || 'Recent',
      });
    }

    return Array.from(byKey.values());
  }, [punchItems, serverPhotos, sheetById, pinById, project]);

  const filteredPhotos = useMemo(() => {
    if (stageFilter === 'all') return photos;
    return photos.filter((p) => p.type === stageFilter);
  }, [photos, stageFilter]);

  const activePhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

  useEffect(() => {
    if (selectedPhotoIndex === null) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedPhotoIndex(null);
      if (e.key === 'ArrowLeft') {
        setLightboxZoom(1);
        setSelectedPhotoIndex(prev => (prev > 0 ? prev - 1 : filteredPhotos.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setLightboxZoom(1);
        setSelectedPhotoIndex(prev => (prev < filteredPhotos.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPhotoIndex, filteredPhotos.length]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setLightboxZoom(1);
    setSelectedPhotoIndex(prev => (prev > 0 ? prev - 1 : filteredPhotos.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setLightboxZoom(1);
    setSelectedPhotoIndex(prev => (prev < filteredPhotos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 999,
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--text-secondary)'
            }}>
              <Building2 size={12} color="var(--amber-hover)" aria-hidden="true" />
              <span>{project?.name || 'UMBC Campus'}</span>
              {project?.code && <span style={{ color: 'var(--text-muted)' }}>· {project.code}</span>}
            </span>
          </div>
          <h1 className="page-title">
            Progress &amp; Field Photos
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Site progress and inspection photos synced directly from punch items.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All (${photos.length})` },
            { id: 'progress', label: 'Progress' },
            { id: 'issue', label: 'Issue' },
            { id: 'resolved', label: 'Completion' },
          ].map((tab) => {
            const active = stageFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStageFilter(tab.id);
                  setSelectedPhotoIndex(null);
                }}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? '1px solid var(--ink)' : '1px solid var(--border)',
                  backgroundColor: active ? 'var(--ink)' : '#FFFFFF',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Field & Progress Photos — or empty state */}
      {filteredPhotos.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 24px',
          marginTop: 12,
          borderRadius: 12,
          border: '1px dashed var(--border)',
          backgroundColor: '#FFFFFF',
          gap: 10,
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#B45309',
            marginBottom: 4
          }}>
            <Camera size={22} aria-hidden="true" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
            {photos.length === 0 ? 'No progress or field photos yet' : 'No photos match this filter'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.55 }}>
            {photos.length === 0
              ? 'Open any punch item on a blueprint and upload a progress photo — it will sync here with full project details.'
              : 'Try switching the stage filter above to view all captured photos.'}
          </div>
        </div>
      ) : (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 18
      }}>
        {filteredPhotos.map((photo, index) => {
          const locationParts = [
            photo.buildingName,
            photo.floorLevel,
            photo.room,
          ].filter(Boolean);

          return (
            <div
              key={photo.id}
              onClick={() => {
                setSelectedPhotoIndex(index);
                setLightboxZoom(1);
              }}
              className="card photo-card"
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease, border-color 160ms ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(24, 24, 27, 0.08)';
                const img = e.currentTarget.querySelector('.photo-card__img');
                if (img) img.style.transform = 'scale(1.025)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                const img = e.currentTarget.querySelector('.photo-card__img');
                if (img) img.style.transform = 'scale(1)';
              }}
            >
              {/* Image Frame */}
              <div style={{ position: 'relative', aspectRatio: '16 / 10', backgroundColor: 'var(--surface-muted)', overflow: 'hidden' }}>
                <img
                  className="photo-card__img"
                  src={photo.url}
                  alt={photo.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                />

                {/* Top Badges */}
                <div style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  right: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      className="trade-stamp-badge"
                      style={{
                        backgroundColor: photo.tradeColor,
                        border: '1.5px solid #FFFFFF',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.22)'
                      }}
                    >
                      {photo.trade}
                    </span>
                    <span className="chip-mono" style={{ background: 'rgba(24, 24, 27, 0.82)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.18)' }}>
                      {photo.pinLabel}
                    </span>
                  </div>

                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 700,
                    backgroundColor: 'rgba(24, 24, 27, 0.82)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.18)'
                  }}>
                    {photo.stageLabel}
                  </span>
                </div>
              </div>

              {/* Clean Project Details Footer */}
              <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {photo.title}
                </div>

                {photo.caption && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {photo.caption}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  <Layers size={12} color="var(--amber-hover)" style={{ flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {photo.projectName}{locationParts.length ? ` · ${locationParts.join(' · ')}` : ''}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: 8,
                  borderTop: '1px solid var(--border-subtle, #EDE8DF)',
                  fontSize: 11,
                  color: 'var(--text-muted)'
                }}>
                  <span>{photo.capturedBy}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{photo.date}</span>
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
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.title || 'Field photo lightbox'}
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
              flexWrap: 'wrap',
              width: '100vw',
              height: '100vh',
              position: 'relative',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button Top Right */}
            <button
              type="button"
              onClick={() => setSelectedPhotoIndex(null)}
              className="btn-icon"
              aria-label="Close photo lightbox"
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 40,
                width: 40,
                height: 40,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF'
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>

            {/* Main Photo Zoom Canvas Area */}
            <div style={{
              flex: '1 1 560px',
              minHeight: '60vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              padding: '40px 64px'
            }}>
              {/* Left Prev Arrow Button */}
              <button
                type="button"
                onClick={handlePrev}
                className="btn-icon"
                aria-label="Previous photo"
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 30,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF'
                }}
              >
                <ChevronLeft size={26} aria-hidden="true" />
              </button>

              {/* Right Next Arrow Button */}
              <button
                type="button"
                onClick={handleNext}
                className="btn-icon"
                aria-label="Next photo"
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 30,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF'
                }}
              >
                <ChevronRight size={26} aria-hidden="true" />
              </button>
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
                  type="button"
                  onClick={() => setLightboxZoom(z => Math.max(z - 0.3, 0.7))}
                  className="btn-icon"
                  aria-label="Zoom out"
                  style={{ width: 38, height: 38, color: '#FFFFFF' }}
                >
                  <ZoomOut size={16} aria-hidden="true" />
                </button>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', minWidth: 46, textAlign: 'center' }}>
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxZoom(z => Math.min(z + 0.3, 3))}
                  className="btn-icon"
                  aria-label="Zoom in"
                  style={{ width: 38, height: 38, color: '#FFFFFF' }}
                >
                  <ZoomIn size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom(1)}
                  className="btn-icon"
                  aria-label="Reset zoom"
                  style={{ width: 38, height: 38, color: '#FFFFFF' }}
                  title="Reset Zoom"
                >
                  <Maximize2 size={16} aria-hidden="true" />
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
                    style={{ backgroundColor: activePhoto.tradeColor || TRADES[activePhoto.trade]?.color || 'var(--amber)' }}
                  >
                    {activePhoto.trade}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="chip-mono" style={{ backgroundColor: '#27272A', color: '#F4F4F5', border: '1px solid #3F3F46' }}>
                        {activePhoto.pinLabel || activePhoto.punchId}
                      </span>
                      <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, backgroundColor: 'rgba(217, 119, 6, 0.2)', color: '#FBBF24' }}>
                        {activePhoto.stageLabel || 'Progress'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 3 }}>
                      {activePhoto.tradeName || TRADES[activePhoto.trade]?.name}
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 10 }}>
                  {activePhoto.title}
                </h3>

                <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.6, marginBottom: 20 }}>
                  {activePhoto.caption}
                </p>

                {/* Metadata List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, backgroundColor: '#222226', borderRadius: 8, border: '1px solid #2E2E33' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Building2 size={16} color="var(--amber)" />
                    <div>
                      <div style={{ fontSize: 11, color: '#A1A1AA' }}>Project &amp; Floor</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
                        {activePhoto.projectName}
                        {activePhoto.buildingName ? ` · ${activePhoto.buildingName}` : ''}
                        {activePhoto.floorLevel ? ` · ${activePhoto.floorLevel}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPin size={16} color="var(--amber)" />
                    <div>
                      <div style={{ fontSize: 11, color: '#A1A1AA' }}>Location{activePhoto.gridLocation ? ' / Grid' : ''}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
                        {activePhoto.room}{activePhoto.gridLocation ? ` (Grid ${activePhoto.gridLocation})` : ''}
                      </div>
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

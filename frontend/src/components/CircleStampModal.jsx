import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Circle,
  Building,
  MapPin,
  Camera,
  Upload,
  ZoomIn,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import PhotoZoomLightbox from './PhotoZoomLightbox';
import { api } from '../services/api';
import './CircleStampModal.css';

export function computeSubcontractorInitials(name) {
  if (!name || typeof name !== 'string') return 'PL';
  const clean = name.trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (clean.length >= 2) {
    return clean.substring(0, 2).toUpperCase();
  }
  return clean.toUpperCase() || 'PL';
}

const DEFAULT_TRADE_SUBCONTRACTORS = [
  { id: 'sub-4', name: 'Apex Electrical Systems', trade: 'Electrical', initials: 'AE', discipline: 'electrical' },
  { id: 'sub-6', name: 'Metro Plumbing & Piping', trade: 'Plumbing', initials: 'MP', discipline: 'plumbing' },
  { id: 'sub-7', name: 'Summit HVAC & Mechanical', trade: 'HVAC / Mechanical', initials: 'SH', discipline: 'hvac' },
  { id: 'sub-2', name: 'Prime Drywall & Acoustic Ceilings', trade: 'Drywall & Framing', initials: 'PD', discipline: 'drywall' },
  { id: 'sub-8', name: 'Apex Concrete & Masonry', trade: 'Concrete & Masonry', initials: 'AC', discipline: 'concrete' },
  { id: 'sub-9', name: 'Spectrum Painting & Finishes', trade: 'Painting & Finishes', initials: 'SP', discipline: 'painting' },
  { id: 'sub-5', name: 'Olympic Glazing & Facades', trade: 'Architectural / Millwork', initials: 'OG', discipline: 'architectural' },
  { id: 'sub-3', name: 'Titan Structural Solutions', trade: 'Structural Steel', initials: 'TS', discipline: 'structural' },
  { id: 'sub-1', name: 'Beacon Fire Protection & MEP', trade: 'Fire Protection / Life Safety', initials: 'BF', discipline: 'fire_protection' }
];

const TRADES = [
  { id: 'electrical', label: 'Electrical', color: '#EAB308' },
  { id: 'plumbing', label: 'Plumbing', color: '#0284C7' },
  { id: 'hvac', label: 'HVAC / Mechanical', color: '#0D9488' },
  { id: 'drywall', label: 'Drywall & Framing', color: '#8B5CF6' },
  { id: 'concrete', label: 'Concrete & Masonry', color: '#78716C' },
  { id: 'painting', label: 'Painting & Finishes', color: '#EC4899' },
  { id: 'architectural', label: 'Architectural / Millwork', color: '#5C3A21' },
  { id: 'structural', label: 'Structural Steel', color: '#18181B' },
  { id: 'fire_protection', label: 'Fire Protection / Life Safety', color: '#DC2626' }
];

const ROOT_CAUSES = [
  'Workmanship / Craftsmanship Defect',
  'Design / Plan Conflict',
  'Material Defect / Damaged Product',
  'Damage by Other Trade',
  'Incomplete Scope / Omission',
  'Site Condition / Framing Tolerance',
  'Weather / Environmental Damage',
  'Other / Unspecified'
];

export default function CircleStampModal({
  isOpen,
  onClose,
  coords,
  sheet,
  project,
  companies = [],
  onSubmit
}) {
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState('electrical');
  const [status, setStatus] = useState('open');
  const [location, setLocation] = useState('');
  const [subcontractorList, setSubcontractorList] = useState([]);
  const [subcontractor, setSubcontractor] = useState('');
  const [customSubcontractor, setCustomSubcontractor] = useState('');
  const [rootCause, setRootCause] = useState(ROOT_CAUSES[0]);
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // Initialize location and load subcontractors
  useEffect(() => {
    if (!isOpen) return;

    const gridText = coords?.grid ? `Grid ${coords.grid}` : '';
    const sheetText = sheet?.name ? sheet.name : 'Sheet';
    setLocation([sheetText, gridText].filter(Boolean).join(' - '));

    const loadSubcontractors = async () => {
      let list = [];
      if (Array.isArray(companies) && companies.length > 0) {
        list = companies.filter(c => c.type === 'subcontractor' || c.trade || c.name);
      }
      if (list.length === 0) {
        try {
          const fetched = await api.getCompanies();
          if (Array.isArray(fetched) && fetched.length > 0) {
            const subs = fetched.filter(c => c.type === 'subcontractor' || c.trade);
            list = subs.length > 0 ? subs : fetched;
          }
        } catch (err) {
          console.warn('Could not load companies from API:', err);
        }
      }
      if (list.length === 0) {
        list = DEFAULT_TRADE_SUBCONTRACTORS;
      }
      setSubcontractorList(list);

      // Preselect matching subcontractor for current trade
      const matching = list.find(s =>
        (s.discipline && s.discipline.toLowerCase() === discipline.toLowerCase()) ||
        (s.trade && s.trade.toLowerCase().includes(discipline.toLowerCase())) ||
        (s.name && s.name.toLowerCase().includes(discipline.toLowerCase()))
      );
      if (matching) {
        setSubcontractor(matching.name);
      } else if (list.length > 0) {
        setSubcontractor(list[0].name);
      }
    };

    loadSubcontractors();
  }, [isOpen, coords, sheet, companies]);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  if (!isOpen) return null;

  const effectiveSubcontractor = subcontractor === '__custom__'
    ? customSubcontractor.trim() || 'Subcontractor'
    : subcontractor || 'Subcontractor';

  const initials = computeSubcontractorInitials(effectiveSubcontractor);

  const statusColors = {
    open: '#DC2626',
    in_progress: '#2563EB',
    in_review: '#D97706',
    closed: '#16A34A'
  };

  const currentColor = statusColors[status] || '#DC2626';

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a title for this inspection item');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        discipline,
        status,
        room_location: location.trim(),
        assigned_to_company: effectiveSubcontractor,
        root_cause: rootCause,
        stamp_initials: initials,
        description: description.trim(),
        x_pct: coords.x_pct,
        y_pct: coords.y_pct,
        photoFile
      });
      onClose();
    } catch (err) {
      console.error('Failed to create circle inspection stamp:', err);
      alert(err.message || 'Failed to create stamp');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="circle-stamp-backdrop" onClick={onClose}>
      <div className="circle-stamp-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with Live Circle Stamp Preview */}
        <div className="circle-stamp-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Live Stamp Circle */}
            <div
              className="circle-stamp-preview-head"
              style={{
                backgroundColor: currentColor,
                borderColor: '#FFFFFF',
                boxShadow: `0 0 16px ${currentColor}44, 0 4px 14px rgba(0,0,0,0.35)`
              }}
              title={`Blueprint Stamp: ${initials} (${effectiveSubcontractor})`}
            >
              <span className="circle-stamp-preview-initials">{initials}</span>
            </div>

            <div>
              <h2 className="circle-stamp-title">Create Blueprint Circle Stamp</h2>
              <p className="circle-stamp-subtitle">
                Punch item stamped at ({coords?.x_pct ? (coords.x_pct * 100).toFixed(1) : 50}%, {coords?.y_pct ? (coords.y_pct * 100).toFixed(1) : 50}%)
              </p>
            </div>
          </div>

          <button className="circle-stamp-close-btn" onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="circle-stamp-form">
          <div className="circle-stamp-grid">
            {/* Title */}
            <div className="circle-form-group full-width">
              <label className="circle-form-label">
                Title / Observation <span className="req">*</span>
              </label>
              <input
                type="text"
                className="circle-form-input"
                placeholder="e.g. Outlet missing faceplate / Damaged drywall header"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Trade / Discipline Dropdown */}
            <div className="circle-form-group">
              <label className="circle-form-label">
                <Wrench size={13} color="#D97706" />
                <span>Trade / Discipline</span>
              </label>
              <select
                className="circle-form-select"
                value={discipline}
                onChange={(e) => {
                  const newDisc = e.target.value;
                  setDiscipline(newDisc);
                  if (subcontractor !== '__custom__') {
                    const matching = subcontractorList.find(s =>
                      (s.discipline && s.discipline.toLowerCase() === newDisc.toLowerCase()) ||
                      (s.trade && s.trade.toLowerCase().includes(newDisc.toLowerCase())) ||
                      (s.name && s.name.toLowerCase().includes(newDisc.toLowerCase()))
                    );
                    if (matching) {
                      setSubcontractor(matching.name);
                    }
                  }
                }}
              >
                {TRADES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="circle-form-group">
              <label className="circle-form-label">
                <Clock size={13} color={currentColor} />
                <span>Status</span>
              </label>
              <select
                className="circle-form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ borderColor: currentColor, color: currentColor, fontWeight: 700 }}
              >
                <option value="open">🔴 Open (Pending Action)</option>
                <option value="in_progress">🔵 In Progress (Underway)</option>
                <option value="in_review">🟠 In Review (Subcontractor Complete)</option>
                <option value="closed">🟢 Closed (Verified & Signed Off)</option>
              </select>
            </div>

            {/* Subcontractor Stamp Dropdown */}
            <div className="circle-form-group full-width">
              <label className="circle-form-label">
                <Building size={13} color="#D97706" />
                <span>Stamp (Subcontractor / Trade)</span>
                <span className="circle-stamp-pill" style={{ backgroundColor: `${currentColor}22`, color: currentColor }}>
                  Stamp: [{initials}]
                </span>
              </label>
              <select
                className="circle-form-select"
                value={subcontractor}
                onChange={(e) => setSubcontractor(e.target.value)}
              >
                {subcontractorList.map((c) => {
                  const cInitials = c.initials || computeSubcontractorInitials(c.name);
                  return (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name} {c.trade ? `(${c.trade})` : ''} — [{cInitials}]
                    </option>
                  );
                })}
                <option value="__custom__">➕ Enter Custom Subcontractor Name...</option>
              </select>

              {subcontractor === '__custom__' && (
                <input
                  type="text"
                  className="circle-form-input"
                  style={{ marginTop: 8 }}
                  placeholder="Enter Subcontractor or Vendor Name (e.g. Acme Fire Protection)"
                  value={customSubcontractor}
                  onChange={(e) => setCustomSubcontractor(e.target.value)}
                  required
                />
              )}
            </div>

            {/* Location */}
            <div className="circle-form-group">
              <label className="circle-form-label">
                <MapPin size={13} color="#D97706" />
                <span>Location / Grid</span>
              </label>
              <input
                type="text"
                className="circle-form-input"
                placeholder="e.g. Ground Floor Lobby - Grid C-2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Root Cause Dropdown */}
            <div className="circle-form-group">
              <label className="circle-form-label">
                <AlertTriangle size={13} color="#D97706" />
                <span>Root Cause</span>
              </label>
              <select
                className="circle-form-select"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
              >
                {ROOT_CAUSES.map((rc) => (
                  <option key={rc} value={rc}>
                    {rc}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="circle-form-group full-width">
              <label className="circle-form-label">
                Description / Corrective Action Required
              </label>
              <textarea
                className="circle-form-textarea"
                rows={3}
                placeholder="Describe the condition observed, specific punch list instructions, or trade coordination requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Picture Upload with Zoom & Download Capabilities */}
            <div className="circle-form-group full-width">
              <label className="circle-form-label">
                <Camera size={13} color="#D97706" />
                <span>Picture Attachment</span>
                <span style={{ fontSize: 11, color: '#A8A29E', fontWeight: 400 }}>
                  (Click thumbnail to zoom in and download)
                </span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoSelect}
              />

              {!photoPreview ? (
                <div
                  className="circle-photo-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="circle-photo-dropzone-icon">
                    <Upload size={20} color="#D97706" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: '#5C3A21' }}>Click to capture or upload photo</span>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#A8A29E' }}>
                      Supports high-resolution PNG, JPEG, WebP from camera or files
                    </p>
                  </div>
                </div>
              ) : (
                <div className="circle-photo-preview-card">
                  <div
                    className="circle-photo-thumb-wrapper"
                    onClick={() => setShowPhotoLightbox(true)}
                    title="Click to Zoom In / Inspect Photo"
                  >
                    <img src={photoPreview} alt="Preview" className="circle-photo-thumb" />
                    <div className="circle-photo-hover-overlay">
                      <ZoomIn size={18} color="#FFFFFF" />
                      <span style={{ fontSize: 11, color: '#FFFFFF', fontWeight: 600 }}>Zoom</span>
                    </div>
                  </div>

                  <div className="circle-photo-info">
                    <span className="circle-photo-filename">
                      {photoFile?.name || 'inspection-photo.jpg'}
                    </span>
                    <span className="circle-photo-size">
                      {photoFile ? `${Math.round(photoFile.size / 1024)} KB` : ''} • Ready to attach
                    </span>

                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="circle-photo-btn zoom"
                        onClick={() => setShowPhotoLightbox(true)}
                      >
                        <ZoomIn size={12} />
                        <span>Zoom In</span>
                      </button>

                      <a
                        href={photoPreview}
                        download={photoFile?.name || 'inspection-photo.jpg'}
                        className="circle-photo-btn download"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>

                      <button
                        type="button"
                        className="circle-photo-btn remove"
                        onClick={handleRemovePhoto}
                      >
                        <X size={12} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="circle-stamp-footer">
            <button
              type="button"
              className="circle-btn ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="circle-btn primary"
              disabled={submitting}
            >
              {submitting ? (
                <span>Creating Stamp...</span>
              ) : (
                <>
                  <Circle size={15} />
                  <span>Create Circle Stamp [{initials}] & Place</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Photo Zoom Lightbox (supports zoom in & download) */}
        {showPhotoLightbox && photoPreview && (
          <PhotoZoomLightbox
            imageUrl={photoPreview}
            title={title || 'Inspection Photo Attachment'}
            caption={`${effectiveSubcontractor} • ${rootCause}`}
            onClose={() => setShowPhotoLightbox(false)}
          />
        )}
      </div>
    </div>
  );
}

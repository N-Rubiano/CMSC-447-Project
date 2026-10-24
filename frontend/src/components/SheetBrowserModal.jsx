import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Search,
  Grid,
  List,
  CheckCircle,
  AlertCircle,
  Filter,
  Plus,
  Building2,
  History,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import './SheetBrowserModal.css';

export default function SheetBrowserModal({
  projectId,
  sheets,
  activeSheetId,
  onSelectSheet,
  onClose,
  onSheetsUploaded,
  onOpenBlueprintUpload,
  onOpenUploadVersion,
  onOpenVersionHistory
}) {
  const [search, setSearch] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [viewLayout, setViewLayout] = useState('grid'); // 'grid' | 'list'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDiscipline, setUploadDiscipline] = useState('architectural');
  const [uploadPrefix, setUploadPrefix] = useState('A');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mobileTab, setMobileTab] = useState('browse'); // 'browse' | 'upload'

  const disciplines = ['all', 'architectural', 'structural', 'mep', 'electrical', 'plumbing'];

  const filteredSheets = sheets.filter(s => {
    const matchesDisc = selectedDiscipline === 'all' || s.discipline === selectedDiscipline;
    const matchesSearch = !search ||
      s.sheet_number.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase());
    return matchesDisc && matchesSearch;
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress(25);

    const formData = new FormData();
    formData.append('pdf', uploadFile);
    formData.append('discipline', uploadDiscipline);
    formData.append('sheetPrefix', uploadPrefix);
    formData.append('name', uploadFile.name.replace('.pdf', ''));

    try {
      setUploadProgress(65);
      const res = await api.uploadDrawingSet(projectId, formData);
      setUploadProgress(100);
      setTimeout(() => {
        onSheetsUploaded(res.sheets);
        setUploadFile(null);
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      console.error('Error uploading drawing set:', err);
      alert(`Upload failed: ${err.message}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card sheet-browser-container">
        {/* Header */}
        <div className="sheet-browser-header">
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="#5C3A21" /> Drawing Set Sheets Browser
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>
              Select a sheet to walk the site or upload new multi-page architectural drawing sets
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onOpenBlueprintUpload && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBlueprintUpload();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1.5px solid #FCD34D',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
                title="Upload blueprint (PDF, PNG, JPG, CAD) for a specific building"
              >
                <Building2 size={14} color="#D97706" /> Upload Building Blueprint
              </button>
            )}
            <button onClick={onClose} className="btn-ghost" style={{ padding: 6, color: '#18181B' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="sheet-browser-mobile-tabs">
          <button
            type="button"
            className={`sheet-browser-tab-btn ${mobileTab === 'browse' ? 'active' : ''}`}
            onClick={() => setMobileTab('browse')}
          >
            Browse Sheets ({filteredSheets.length})
          </button>
          <button
            type="button"
            className={`sheet-browser-tab-btn ${mobileTab === 'upload' ? 'active' : ''}`}
            onClick={() => setMobileTab('upload')}
          >
            Ingest Plan Set / Upload
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className={`sheet-browser-filterbar ${mobileTab === 'upload' ? 'mobile-hidden' : ''}`}>
          {/* Search bar */}
          <div className="sheet-browser-search-box">
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
            <input
              type="text"
              placeholder="Search sheet # or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: 12.5,
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          {/* Discipline Badges */}
          <div className="sheet-browser-disciplines">
            {disciplines.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDiscipline(d)}
                style={{
                  padding: '5px 12px',
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: selectedDiscipline === d ? '#5C3A21' : 'var(--bg-surface-2)',
                  color: selectedDiscipline === d ? '#FFFFFF' : 'var(--text-secondary)',
                  border: selectedDiscipline === d ? '1px solid #3E2413' : '1px solid var(--border-default)'
                }}
              >
                {d}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setViewLayout('grid')}
              className={`btn-ghost ${viewLayout === 'grid' ? 'active' : ''}`}
              style={{ padding: 6, color: viewLayout === 'grid' ? '#5C3A21' : 'var(--text-muted)' }}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewLayout('list')}
              className={`btn-ghost ${viewLayout === 'list' ? 'active' : ''}`}
              style={{ padding: 6, color: viewLayout === 'list' ? '#5C3A21' : 'var(--text-muted)' }}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="sheet-browser-body">
          {/* Sheets Grid/List */}
          <div className={`sheet-browser-content ${mobileTab === 'upload' ? 'mobile-hidden' : ''}`}>
            {filteredSheets.length > 0 ? (
              viewLayout === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  {filteredSheets.map((s) => {
                    const isSelected = s.id === activeSheetId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => { onSelectSheet(s); onClose(); }}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: `1.5px solid ${isSelected ? '#D97706' : 'var(--border-default)'}`,
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 14px rgba(217, 119, 6, 0.25)' : 'var(--shadow-sm)'
                        }}
                      >
                        {/* Blueprint Thumbnail Graphic (Clean Drafting Sheet) */}
                        <div style={{
                          height: 110,
                          backgroundColor: '#FFFFFF',
                          borderBottom: '1px solid var(--border-default)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          padding: 12
                        }}>
                          {/* Mini CAD blueprint illustration */}
                          <div style={{
                            width: '100%',
                            height: '100%',
                            border: '1.5px dashed #DCD5C8',
                            borderRadius: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: 8,
                            backgroundColor: '#FDFBF7'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#5C3A21', fontWeight: 700 }}>GRID 1-4</span>
                              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#78716C', fontWeight: 600 }}>{s.version || 'Rev 1'}</span>
                            </div>
                            <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#D97706' }}>
                              {s.sheet_number}
                            </div>
                            <div style={{ fontSize: 8.5, color: '#78716C', textAlign: 'right', fontWeight: 600 }}>
                              {s.scale_ratio || '1/4" = 1\'-0"'}
                            </div>
                          </div>
                        </div>

                        {/* Sheet Details */}
                        <div style={{ padding: 12, backgroundColor: '#FFFFFF' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                            {s.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 7px',
                              borderRadius: 4,
                              backgroundColor: '#EFE8DE',
                              color: '#5C3A21'
                            }}>
                              {s.discipline}
                            </span>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: s.open_pin_count > 0 ? '#DC2626' : '#15803D'
                            }}>
                              {s.pin_count || 0} Pins ({s.open_pin_count || 0} Open)
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid #F4F4F5' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                if (onOpenUploadVersion) onOpenUploadVersion(s);
                              }}
                              className="btn-ghost"
                              style={{ flex: 1, padding: '4px 6px', fontSize: 10.5, fontWeight: 700, color: '#B45309', border: '1px solid #FCD34D', borderRadius: 4, backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                              title="Upload latest revision for this blueprint"
                            >
                              <RefreshCw size={11} /> +New Rev
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                if (onOpenVersionHistory) onOpenVersionHistory(s);
                              }}
                              className="btn-ghost"
                              style={{ padding: '4px 7px', fontSize: 10.5, fontWeight: 700, color: '#4338CA', border: '1px solid #C7D2FE', borderRadius: 4, backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="View version history"
                            >
                              <History size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View */
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, backgroundColor: '#FFFFFF', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border-default)', backgroundColor: 'var(--bg-surface-2)', textAlign: 'left', color: 'var(--brand-brown)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 14px' }}>Sheet #</th>
                      <th style={{ padding: '10px 14px' }}>Title</th>
                      <th style={{ padding: '10px 14px' }}>Discipline</th>
                      <th style={{ padding: '10px 14px' }}>Version</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSheets.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => { onSelectSheet(s); onClose(); }}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          backgroundColor: s.id === activeSheetId ? 'var(--bg-surface-2)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#D97706' }}>
                          {s.sheet_number}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {s.name}
                        </td>
                        <td style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: '#5C3A21' }}>
                          {s.discipline}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#4338CA', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {s.version || 'Rev 1'}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: s.open_pin_count > 0 ? '#DC2626' : '#15803D' }}>
                          {s.pin_count || 0} ({s.open_pin_count || 0} Open)
                        </td>
                        <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              if (onOpenUploadVersion) onOpenUploadVersion(s);
                            }}
                            className="btn-ghost"
                            style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#B45309', border: '1px solid #FCD34D', borderRadius: 6, backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', gap: 4 }}
                            title="Upload latest revision"
                          >
                            <RefreshCw size={11} /> +Rev
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              if (onOpenVersionHistory) onOpenVersionHistory(s);
                            }}
                            className="btn-ghost"
                            style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#4338CA', border: '1px solid #C7D2FE', borderRadius: 6, backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', gap: 4 }}
                            title="View version history"
                          >
                            <History size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No sheets found matching search criteria.
              </div>
            )}
          </div>

          {/* Right Sidebar: Upload Drawing Set PDF */}
          <div className={`sheet-browser-upload-panel ${mobileTab === 'browse' ? 'mobile-hidden' : ''}`}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand-brown)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={16} color="#5C3A21" /> Ingest PDF Plan Set
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45, fontWeight: 500 }}>
              Upload multi-page architectural/engineering PDFs. The system extracts individual pages into sheets automatically.
            </div>

            {onOpenBlueprintUpload && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBlueprintUpload();
                }}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#D97706',
                  borderColor: '#B45309',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
                  cursor: 'pointer'
                }}
              >
                <Building2 size={15} /> Upload Building Blueprint
              </button>
            )}

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* File Input Box */}
              <label style={{
                padding: '20px 12px',
                border: '2px dashed #DCD5C8',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#FFFFFF',
                display: 'block',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <FileText size={24} color="#5C3A21" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>
                  {uploadFile ? uploadFile.name : 'Choose PDF File'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  Multi-page sets up to 150MB
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Discipline dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Discipline
                </label>
                <select
                  value={uploadDiscipline}
                  onChange={(e) => setUploadDiscipline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-main)',
                    fontSize: 12,
                    fontWeight: 600,
                    outline: 'none'
                  }}
                >
                  <option value="architectural">Architectural (A-Series)</option>
                  <option value="structural">Structural (S-Series)</option>
                  <option value="mep">MEP / HVAC (M-Series)</option>
                  <option value="electrical">Electrical (E-Series)</option>
                  <option value="plumbing">Plumbing (P-Series)</option>
                </select>
              </div>

              {/* Sheet Prefix */}
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Sheet Number Prefix
                </label>
                <input
                  type="text"
                  value={uploadPrefix}
                  onChange={(e) => setUploadPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. A, M, S, E"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-main)',
                    fontSize: 12,
                    fontWeight: 700,
                    outline: 'none',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              {isUploading && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Processing Pages...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: 4, backgroundColor: 'var(--bg-surface-1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: '#D97706', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!uploadFile || isUploading}
                className="btn-brown"
                style={{ width: '100%', padding: '10px 14px', fontSize: 12.5, fontWeight: 800, marginTop: 4, opacity: (!uploadFile || isUploading) ? 0.6 : 1 }}
              >
                <Upload size={14} color="#FEF3C7" /> Ingest & Split Pages
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

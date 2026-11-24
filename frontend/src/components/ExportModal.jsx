import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Layers,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getToken } from '../services/api';

const EXPORT_OPTIONS = [
  {
    id: 'punch-report',
    title: 'Formal Punch List Summary Report (.pdf)',
    description: 'Executive PDF report with project info, KPI summary, categorized trade tables, and status breakdown.',
    icon: FileText,
    iconBg: 'var(--amber)',
    iconColor: '#FFFFFF',
  },
  {
    id: 'excel',
    title: 'Project & Punch Workbook (.xlsx)',
    description: 'Native multi-sheet Excel workbook with Project Overview, Punch Items, and Team Assignments tabs.',
    icon: FileSpreadsheet,
    iconBg: 'var(--success)',
    iconColor: '#FFFFFF',
  },
  {
    id: 'annotated-pdf',
    title: 'Annotated Drawing Set (.pdf)',
    description: 'Vector PDF floor plans with revision clouds, dimensions, and color-coded punch pins burned into layers.',
    icon: Layers,
    iconBg: 'var(--timber)',
    iconColor: '#FEF3C7',
  },
  {
    id: 'csv',
    title: 'Raw Spreadsheet Data (.csv)',
    description: 'Flat CSV dataset with coordinates, room tags, due dates, and subcontractor assignments.',
    icon: FileSpreadsheet,
    iconBg: 'var(--ink)',
    iconColor: '#FFFFFF',
  },
];

export default function ExportModal({
  project,
  sheets = [],
  onClose
}) {
  const [selectedSheetId, setSelectedSheetId] = useState('all');
  const [exportType, setExportType] = useState('punch-report');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isExporting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, isExporting]);

  const handleTriggerExport = async () => {
    if (!project?.id) {
      setExportError('No active project selected.');
      return;
    }

    let url = '';
    let filename = '';
    const code = project.code || 'PRJ';

    if (exportType === 'annotated-pdf') {
      url = `/api/projects/${project.id}/export/annotated-pdf${selectedSheetId !== 'all' ? `?sheetId=${encodeURIComponent(selectedSheetId)}` : ''}`;
      filename = `${code}_Annotated_PlanSet.pdf`;
    } else if (exportType === 'punch-report') {
      url = `/api/projects/${project.id}/export/punch-report`;
      filename = `${code}_PunchList_Report.pdf`;
    } else if (exportType === 'excel') {
      url = `/api/projects/${project.id}/export/excel`;
      filename = `${code}_Project_Report.xlsx`;
    } else {
      url = `/api/projects/${project.id}/export/csv`;
      filename = `${code}_PunchList.csv`;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required: please sign in again.');
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: `Server error (${res.status})` }));
        throw new Error(errData.detail || errData.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      onClose();
    } catch (err) {
      setExportError(err.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Export project deliverables"
      onClick={(e) => e.target === e.currentTarget && !isExporting && onClose()}
    >
      <div className="modal-card" style={{ width: 560, maxWidth: '95vw', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          backgroundColor: 'var(--surface-muted)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--amber-light)',
              color: 'var(--amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Download size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
                Export Project Info &amp; Deliverables
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {project?.name || 'Active Project'} ({project?.code || 'PRJ'})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="btn-icon"
            aria-label="Close export modal"
            style={{ width: 38, height: 38 }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Export Options Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--timber)', marginBottom: 8 }}>
              Select Deliverable Format
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {EXPORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = exportType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExportType(opt.id)}
                    aria-pressed={isSelected}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      backgroundColor: isSelected ? 'var(--amber-light)' : 'var(--surface)',
                      border: `2px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      transition: 'all var(--ease-quick)'
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: opt.iconBg,
                      color: opt.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                        {opt.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                        {opt.description}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 size={18} color="var(--amber)" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sheet Selection Scope (For Annotated PDF) */}
          {exportType === 'annotated-pdf' && (
            <div>
              <label
                htmlFor="export-sheet-scope"
                className="eyebrow"
                style={{ display: 'block', color: 'var(--timber)', marginBottom: 6 }}
              >
                Sheet Scope
              </label>
              <select
                id="export-sheet-scope"
                value={selectedSheetId}
                onChange={(e) => setSelectedSheetId(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontWeight: 600 }}
              >
                <option value="all">All Sheets in Project ({sheets.length} Sheets)</option>
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sheet_number || s.number} — {s.name || s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {exportError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              <AlertCircle size={16} aria-hidden="true" />
              <span>{exportError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleTriggerExport}
            disabled={isExporting}
            className="btn btn-primary"
            style={{ width: '100%', height: 42, fontSize: 14 }}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
                <span>Generating Export…</span>
              </>
            ) : (
              <>
                <Download size={16} aria-hidden="true" />
                <span>Download {exportType === 'excel' ? 'Excel (.xlsx)' : exportType === 'csv' ? 'CSV (.csv)' : 'PDF (.pdf)'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

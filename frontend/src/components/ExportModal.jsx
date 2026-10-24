import React, { useState } from 'react';
import {
  X,
  Download,
  Layers,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Settings,
  Printer,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getToken } from '../services/api';

export default function ExportModal({
  project,
  sheets,
  activeSheet,
  onClose
}) {
  const [selectedSheetId, setSelectedSheetId] = useState('all');
  const [exportType, setExportType] = useState('annotated-pdf'); // 'annotated-pdf' | 'punch-report' | 'csv'
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const handleTriggerExport = async () => {
    let url = '';
    let filename = '';

    if (exportType === 'annotated-pdf') {
      url = `/api/projects/${project.id}/export/annotated-pdf${selectedSheetId !== 'all' ? `?sheetId=${selectedSheetId}` : ''}`;
      filename = `${project.code || 'PRJ'}_Annotated_PlanSet.pdf`;
    } else if (exportType === 'punch-report') {
      url = `/api/projects/${project.id}/export/punch-report`;
      filename = `${project.code || 'PRJ'}_PunchList_Report.pdf`;
    } else if (exportType === 'csv') {
      url = `/api/projects/${project.id}/export/csv`;
      filename = `${project.code || 'PRJ'}_PunchList.csv`;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication required: please log in again.');
      }
      const separator = url.includes('?') ? '&' : '?';
      const authedUrl = `${url}${separator}token=${encodeURIComponent(token)}`;
      const res = await fetch(authedUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
        throw new Error(errData.error || `Export failed with status ${res.status}`);
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
    } catch (err) {
      setExportError(err.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ width: 560, maxWidth: '95vw', backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          backgroundColor: 'var(--bg-surface-2)',
          borderBottom: '1.5px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 900, color: 'var(--text-main)' }}>
            <Download size={18} color="#5C3A21" /> Export Project Deliverables
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, color: '#18181B' }}>
            <X size={18} />
          </button>
        </div>

        {/* Export Options Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Format Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              Select Deliverable Format
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {/* Option 1: Annotated PDF */}
              <div
                onClick={() => setExportType('annotated-pdf')}
                style={{
                  padding: '14px 16px',
                  backgroundColor: exportType === 'annotated-pdf' ? '#FFFBEB' : '#FFFFFF',
                  border: `2px solid ${exportType === 'annotated-pdf' ? '#D97706' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  boxShadow: exportType === 'annotated-pdf' ? '0 2px 10px rgba(217, 119, 6, 0.15)' : 'var(--shadow-sm)'
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#5C3A21',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Layers size={18} color="#FEF3C7" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>
                    Annotated Drawing Set (PDF)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                    Standard vector PDF containing original floor plans with all revision clouds, dimensions, and color-coded punch pins burned into page layers.
                  </div>
                </div>
                {exportType === 'annotated-pdf' && <CheckCircle2 size={18} color="#D97706" />}
              </div>

              {/* Option 2: Formatted Punch List Report */}
              <div
                onClick={() => setExportType('punch-report')}
                style={{
                  padding: '14px 16px',
                  backgroundColor: exportType === 'punch-report' ? '#FFFBEB' : '#FFFFFF',
                  border: `2px solid ${exportType === 'punch-report' ? '#D97706' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  boxShadow: exportType === 'punch-report' ? '0 2px 10px rgba(217, 119, 6, 0.15)' : 'var(--shadow-sm)'
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={18} color="#FFFFFF" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>
                    Formal Punch List Summary Report (PDF)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                    Formal PDF report featuring executive KPI cards, resolution rates, categorized trade tables, and defect photo evidence for sign-off.
                  </div>
                </div>
                {exportType === 'punch-report' && <CheckCircle2 size={18} color="#D97706" />}
              </div>

              {/* Option 3: CSV Spreadsheet */}
              <div
                onClick={() => setExportType('csv')}
                style={{
                  padding: '14px 16px',
                  backgroundColor: exportType === 'csv' ? '#FFFBEB' : '#FFFFFF',
                  border: `2px solid ${exportType === 'csv' ? '#D97706' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  boxShadow: exportType === 'csv' ? '0 2px 10px rgba(217, 119, 6, 0.15)' : 'var(--shadow-sm)'
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#18181B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileSpreadsheet size={18} color="#FFFFFF" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>
                    Spreadsheet Data Export (CSV)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                    Raw tabular dataset with coordinates, room tags, due dates, and subcontractor assignments for Excel or Procore/Autodesk import.
                  </div>
                </div>
                {exportType === 'csv' && <CheckCircle2 size={18} color="#D97706" />}
              </div>
            </div>
          </div>

          {/* Sheet Selection Scope (For Annotated PDF) */}
          {exportType === 'annotated-pdf' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                Sheet Scope
              </label>
              <select
                value={selectedSheetId}
                onChange={(e) => setSelectedSheetId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontSize: 13,
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                <option value="all">All Sheets in Project ({sheets.length} Sheets)</option>
                {sheets.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.sheet_number} — {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Button */}
          {exportError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              borderRadius: 'var(--radius-md)',
              color: '#B91C1C',
              fontSize: 13,
              fontWeight: 600
            }}>
              <AlertCircle size={16} />
              {exportError}
            </div>
          )}
          <button
            onClick={handleTriggerExport}
            disabled={isExporting}
            className="btn-brown"
            style={{ width: '100%', padding: '12px 18px', fontSize: 14, fontWeight: 800, marginTop: 6, opacity: isExporting ? 0.7 : 1, cursor: isExporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {isExporting
              ? <><Loader2 size={16} color="#FEF3C7" style={{ animation: 'spin 1s linear infinite' }} /> Generating Export…</>
              : <><Download size={16} color="#FEF3C7" /> Generate &amp; Download Export</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

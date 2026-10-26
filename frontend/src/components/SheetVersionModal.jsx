/**
 * SheetVersionModal.jsx
 * Version History and Revision Management for Architectural Blueprints.
 *
 * Allows viewing the complete timeline of revisions for a given building blueprint,
 * downloading or previewing historical versions, and triggering the upload
 * of the latest version.
 */

import React, { useState, useEffect } from 'react';
import {
  History,
  Clock,
  FileText,
  CheckCircle2,
  Upload,
  X,
  Calendar,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import './SheetVersionModal.css';

export default function SheetVersionModal({
  sheet,
  project,
  onClose,
  onOpenUploadNewVersion
}) {
  const [loading, setLoading] = useState(true);
  const [versionData, setVersionData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sheet) return;
    const fetchVersions = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getSheetVersions(sheet.id);
        setVersionData(data);
      } catch (err) {
        console.error('Failed to load sheet versions:', err);
        setError(err.message || 'Failed to load version history');
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [sheet]);

  if (!sheet) return null;

  const versions = versionData?.versions || [
    {
      id: `curr-${sheet.id}`,
      version: sheet.version || 'Rev 1',
      file_name: sheet.file_name || 'Current Architectural Plan',
      created_at: sheet.updated_at || sheet.created_at || new Date().toISOString(),
      change_notes: sheet.change_notes || 'Current active blueprint revision on site',
      is_current: true
    }
  ];

  return (
    <div className="svm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="svm-card">
        {/* Header */}
        <div className="svm-header">
          <div className="svm-header-left">
            <div className="svm-header-icon">
              <History size={20} />
            </div>
            <div>
              <div className="svm-title">Blueprint Version History</div>
              <div className="svm-subtitle">
                {sheet.sheet_number} — {sheet.name} {sheet.building_name ? `(${sheet.building_name})` : ''}
              </div>
            </div>
          </div>
          <div className="svm-header-actions">
            {onOpenUploadNewVersion && (
              <button
                className="svm-upload-btn"
                onClick={() => {
                  onClose();
                  onOpenUploadNewVersion(sheet);
                }}
                title="Upload latest revision for this building blueprint"
              >
                <Upload size={14} /> Upload Latest Version
              </button>
            )}
            <button className="svm-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="svm-banner">
          <Layers size={16} color="#D97706" style={{ flexShrink: 0 }} />
          <span>
            PunchList Pro automatically links all pins, markups, and inspection tasks to the sheet identifier.
            Uploading a new revision updates the underlying plan while preserving site markups.
          </span>
        </div>

        {/* Version Timeline */}
        <div className="svm-body">
          {loading ? (
            <div className="svm-loading">
              <div className="svm-spinner" />
              <span>Loading revision timeline...</span>
            </div>
          ) : error ? (
            <div className="svm-error">{error}</div>
          ) : (
            <div className="svm-timeline">
              {versions.map((ver, idx) => {
                const isCurrent = ver.is_current;
                const dateStr = ver.created_at
                  ? new Date(ver.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Date unknown';

                return (
                  <div key={ver.id || idx} className={`svm-item ${isCurrent ? 'svm-item--current' : ''}`}>
                    {/* Node marker */}
                    <div className="svm-node-col">
                      <div className={`svm-node ${isCurrent ? 'svm-node--current' : ''}`}>
                        {isCurrent ? <CheckCircle2 size={14} color="#FFFFFF" /> : <Clock size={12} color="#78716C" />}
                      </div>
                      {idx < versions.length - 1 && <div className="svm-line" />}
                    </div>

                    {/* Content Card */}
                    <div className="svm-item-card">
                      <div className="svm-item-top">
                        <div className="svm-item-badges">
                          <span className={`svm-badge-version ${isCurrent ? 'svm-badge-version--current' : ''}`}>
                            {ver.version || `Rev ${versions.length - idx}`}
                          </span>
                          {isCurrent && (
                            <span className="svm-badge-active">
                              ACTIVE ON SITE
                            </span>
                          )}
                        </div>
                        <div className="svm-item-date">
                          <Calendar size={12} />
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      <div className="svm-item-file">
                        <FileText size={14} color="#5C3A21" />
                        <span className="svm-file-name">{ver.file_name || 'Blueprint drawing'}</span>
                      </div>

                      {ver.change_notes && (
                        <div className="svm-item-notes">
                          <span className="svm-notes-label">Revision notes:</span> {ver.change_notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="svm-footer">
          <div className="svm-footer-info">
            Total Revisions Recorded: <strong>{versions.length}</strong>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {onOpenUploadNewVersion && (
              <button
                className="svm-btn-primary"
                onClick={() => {
                  onClose();
                  onOpenUploadNewVersion(sheet);
                }}
              >
                <Upload size={14} /> Upload Latest Version
              </button>
            )}
            <button className="svm-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

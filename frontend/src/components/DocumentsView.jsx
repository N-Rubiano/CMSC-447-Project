import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  ExternalLink,
  Layers,
  MapPin,
  Calendar,
  User,
  Clock,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Building,
  Upload
} from 'lucide-react';
import PhotoZoomLightbox from './PhotoZoomLightbox';
import './DocumentsView.css';

export default function DocumentsView({
  project,
  sheets = [],
  pins = [],
  currentUser,
  onSelectSheetWithPin,
  onSelectPin,
  onOpenUpload
}) {
  const [activeTab, setActiveTab] = useState('issues'); // 'issues' | 'sheets'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Map pins to document issues
  const documentIssues = useMemo(() => {
    return pins.map(p => {
      const sheet = sheets.find(s => s.id === p.sheet_id);
      const latestComment = (p.comments && p.comments.length > 0)
        ? [...p.comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        : null;

      const firstPhoto = (p.photos && p.photos.length > 0) ? p.photos[0] : null;

      return {
        id: p.id,
        item_number: p.item_number,
        title: p.title,
        description: p.description || '',
        comment_text: latestComment ? latestComment.body : (p.description || 'No field notes logged yet.'),
        author_name: latestComment?.author_name || p.created_by_name || 'Field Inspector',
        created_at: latestComment?.created_at || p.created_at,
        location: p.room_location || sheet?.name || 'Grid Site',
        discipline: p.discipline || 'architectural',
        status: p.status || 'open',
        priority: p.priority || 'medium',
        sheet: sheet || null,
        sheet_number: sheet?.sheet_number || 'A-101',
        sheet_name: sheet?.name || 'Architectural Plan',
        page_info: sheet?.sheet_number ? `Sheet ${sheet.sheet_number} • ${sheet.name}` : (p.room_location || 'Page 1'),
        photo: firstPhoto
      };
    }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [pins, sheets]);

  const filteredIssues = useMemo(() => {
    let list = [...documentIssues];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.comment_text.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.author_name.toLowerCase().includes(q) ||
        item.sheet_number.toLowerCase().includes(q)
      );
    }
    if (selectedDiscipline !== 'all') {
      list = list.filter(item => item.discipline === selectedDiscipline);
    }
    return list;
  }, [documentIssues, searchQuery, selectedDiscipline]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleViewDocument = (issue) => {
    if (issue.sheet && onSelectSheetWithPin) {
      onSelectSheetWithPin(issue.sheet, issue.id);
    } else if (issue.photo) {
      setLightboxPhoto(issue.photo);
    } else if (sheets.length > 0 && onSelectSheetWithPin) {
      onSelectSheetWithPin(sheets[0], issue.id);
    } else {
      alert(`Opening Document: ${issue.page_info}`);
    }
  };

  return (
    <div className="documents-view-container">
      {/* Header */}
      <div className="documents-view-header">
        <div className="documents-view-title">
          <h1>
            <FileText size={26} color="#D97706" />
            Project Documents & Plan Observations
          </h1>
          <div className="documents-view-subtitle">
            Review punch-list issues, specifications, and notes associated with project architectural and engineering documents.
          </div>
        </div>

        {onOpenUpload && (
          <button
            onClick={onOpenUpload}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 800, backgroundColor: '#5C3A21', gap: 6 }}
          >
            <Upload size={14} /> Upload Project Document
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="documents-nav-tabs">
        <button
          onClick={() => setActiveTab('issues')}
          className={`documents-tab-btn ${activeTab === 'issues' ? 'documents-tab-btn--active' : ''}`}
        >
          <AlertTriangle size={15} /> Document Issues & Notes ({filteredIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('sheets')}
          className={`documents-tab-btn ${activeTab === 'sheets' ? 'documents-tab-btn--active' : ''}`}
        >
          <Layers size={15} /> Architectural & Engineering Drawings ({sheets.length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="documents-filter-bar">
        <div className="documents-search-box">
          <Search size={15} className="documents-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search document issues, notes, page numbers, trades..."
          />
        </div>

        {activeTab === 'issues' && (
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="field-report-select"
          >
            <option value="all">All Disciplines</option>
            <option value="architectural">Architectural</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="hvac">HVAC / Mechanical</option>
            <option value="drywall">Drywall & Framing</option>
          </select>
        )}
      </div>

      {/* TAB 1: ISSUES & NOTES TABLE (Matches user requested layout) */}
      {activeTab === 'issues' && (
        <div className="documents-table-card">
          <table className="documents-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Issue / Note</th>
                <th style={{ width: '35%' }}>Related Comment / Description</th>
                <th style={{ width: '18%' }}>User & Timestamp</th>
                <th style={{ width: '17%', textAlign: 'right' }}>Document</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 48, color: '#78716C' }}>
                    No document issues found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue.id}>
                    {/* Issue / Note & Location / Page */}
                    <td>
                      <div className="document-issue-title">
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          fontWeight: 800,
                          backgroundColor: '#F5EFE7',
                          padding: '1px 5px',
                          borderRadius: 4,
                          border: '1px solid #E7E5E4'
                        }}>
                          #{issue.item_number}
                        </span>
                        <span>{issue.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span className="document-issue-location">
                          <MapPin size={11} /> {issue.location}
                        </span>
                        <span style={{ fontSize: 11, color: '#78716C', fontFamily: 'var(--font-mono)' }}>
                          {issue.page_info}
                        </span>
                      </div>
                    </td>

                    {/* Related Comment or Description */}
                    <td>
                      <div className="document-issue-desc">
                        {issue.comment_text}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: '#78350F',
                          backgroundColor: '#FEF3C7',
                          padding: '1px 5px',
                          borderRadius: 3
                        }}>
                          {issue.discipline}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: issue.status === 'closed' ? '#15803D' : '#DC2626',
                          backgroundColor: issue.status === 'closed' ? '#DCFCE7' : '#FEE2E2',
                          padding: '1px 5px',
                          borderRadius: 3
                        }}>
                          {issue.status}
                        </span>
                      </div>
                    </td>

                    {/* Date/time & User */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1C1917' }}>
                        <User size={13} color="#D97706" />
                        <span>{issue.author_name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#78716C', marginTop: 3 }}>
                        <Clock size={11} />
                        <span>{formatDate(issue.created_at)}</span>
                      </div>
                    </td>

                    {/* View Document Button */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewDocument(issue)}
                        className="document-view-btn"
                        title={`View ${issue.sheet_number || 'document'} on interactive canvas`}
                      >
                        <Eye size={13} />
                        <span>View Document</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: PROJECT DRAWING SETS & DOCUMENTS */}
      {activeTab === 'sheets' && (
        <div className="documents-sheets-grid">
          {sheets.map((sheet) => {
            const openPins = pins.filter(p => p.sheet_id === sheet.id);
            return (
              <div key={sheet.id} className="document-sheet-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 900,
                      fontSize: 14,
                      color: '#5C3A21'
                    }}>
                      {sheet.sheet_number}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      backgroundColor: '#F5EFE7',
                      color: '#78350F',
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid #E7E5E4'
                    }}>
                      {sheet.discipline?.toUpperCase() || 'ARCHITECTURAL'}
                    </span>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1C1917', marginBottom: 6 }}>
                    {sheet.name}
                  </div>

                  <div style={{ fontSize: 12, color: '#78716C', marginBottom: 12 }}>
                    Floor Level: {sheet.floor_level || '1st Floor'} • Scale: {sheet.scale_ratio || '1/4" = 1\'-0"'}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E7E5E4', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: openPins.length > 0 ? '#DC2626' : '#15803D' }}>
                    {openPins.length} Active Observations
                  </span>

                  <button
                    onClick={() => onSelectSheetWithPin && onSelectSheetWithPin(sheet, null)}
                    className="document-view-btn"
                  >
                    <Layers size={13} /> View Plan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <PhotoZoomLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  MessageSquare,
  Send,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ZoomIn,
  Download,
  Building,
  HardHat,
  ArrowUpRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import PhotoZoomLightbox from './PhotoZoomLightbox';
import './FieldReportView.css';

export default function FieldReportView({
  project,
  sheets = [],
  pins = [],
  currentUser,
  onSelectPin,
  onOpenSheetWithPin
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Fast Composer State
  const [newCommentText, setNewCommentText] = useState('');
  const [targetPinId, setTargetPinId] = useState(pins[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);

  // Photo Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Load comments
  const loadComments = async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await api.getProjectComments(project.id);
      setComments(data);
    } catch (err) {
      console.warn('Falling back to local pins comments mapping:', err);
      // Construct fallback from pins in memory
      const list = [];
      for (const p of pins) {
        if (p.comments && p.comments.length > 0) {
          for (const c of p.comments) {
            const sheet = sheets.find(s => s.id === p.sheet_id);
            list.push({
              id: c.id,
              pin_id: p.id,
              body: c.body,
              created_at: c.created_at,
              author_id: c.author_id,
              author_name: c.author_name || 'Field Inspector',
              author_avatar: c.author_avatar || null,
              author_company: c.author_company || p.assigned_to_company || 'Subcontractor',
              author_role: c.author_role || 'sub_contractor',
              pin_title: p.title,
              pin_item_number: p.item_number,
              pin_status: p.status,
              pin_discipline: p.discipline,
              location: p.room_location || sheet?.name || 'Field Site',
              sheet_id: p.sheet_id,
              sheet_number: sheet?.sheet_number,
              photos: p.photos || []
            });
          }
        }
      }
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setComments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [project?.id, pins.length]);

  // Handle post comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    // Use selected pin or first available
    const pinId = targetPinId || pins[0]?.id;
    if (!pinId) {
      alert('Please create at least one punch item or select an issue to comment on.');
      return;
    }

    setSubmitting(true);
    try {
      await api.addComment(pinId, { body: newCommentText.trim() });
      setNewCommentText('');
      await loadComments();
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter and sort comments: Latest -> Oldest
  const filteredComments = useMemo(() => {
    let result = [...comments];

    // Guarantee sorting latest date/time first
    result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.body && c.body.toLowerCase().includes(q)) ||
        (c.author_name && c.author_name.toLowerCase().includes(q)) ||
        (c.pin_title && c.pin_title.toLowerCase().includes(q)) ||
        (c.location && c.location.toLowerCase().includes(q))
      );
    }

    if (selectedDiscipline !== 'all') {
      result = result.filter(c => c.pin_discipline === selectedDiscipline);
    }

    if (selectedStatus !== 'all') {
      result = result.filter(c => c.pin_status === selectedStatus);
    }

    return result;
  }, [comments, searchQuery, selectedDiscipline, selectedStatus]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      open: { label: 'OPEN', bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
      in_progress: { label: 'IN PROGRESS', bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
      submitted_for_contractor_review: { label: 'CONTRACTOR REVIEW', bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' },
      in_review: { label: 'IN REVIEW', bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' },
      closed: { label: 'CLOSED', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
      rejected: { label: 'REJECTED', bg: '#F4F4F5', color: '#71717A', border: '#D4D4D8' }
    }[status] || { label: status?.toUpperCase() || 'OPEN', bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };

    return (
      <span style={{
        fontSize: '10px',
        fontWeight: 800,
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        letterSpacing: '0.03em'
      }}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="field-report-container">
      {/* Header */}
      <div className="field-report-header">
        <div className="field-report-title-area">
          <h1>
            <ClipboardList size={26} color="#D97706" />
            Field Report & Site Activity
          </h1>
          <div className="field-report-subtitle">
            Centralized stream of on-site observations, subcontractor comments, and field notes sorted latest to oldest.
          </div>
        </div>

        <button
          onClick={loadComments}
          className="btn-ghost"
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            border: '1.5px solid var(--border-default)',
            fontWeight: 700,
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          title="Refresh Field Activity"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quick Field Note Composer */}
      <form className="field-report-composer" onSubmit={handlePostComment}>
        <div className="field-report-composer-top">
          <div className="field-report-composer-avatar">
            {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'ME'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1C1917', marginBottom: 2 }}>
              Post Field Note or Comment
            </div>
            <div style={{ fontSize: 11.5, color: '#78716C' }}>
              Logged as <strong>{currentUser?.name || 'Field Inspector'}</strong> ({currentUser?.company || 'General Contractor'})
            </div>
          </div>

          {pins.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#78716C' }}>Attach to Issue:</span>
              <select
                value={targetPinId}
                onChange={(e) => setTargetPinId(e.target.value)}
                className="field-report-select"
                style={{ fontSize: 12, padding: '5px 8px' }}
              >
                {pins.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.item_number} - {p.title} ({p.room_location || 'Field'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Type an on-site field observation, progress update, or note for the team..."
          rows={2}
          required
        />

        <div className="field-report-composer-actions">
          <span style={{ fontSize: 11.5, color: '#A8A29E', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} color="#D97706" /> Broadcasts in real-time across all field tablets
          </span>

          <button
            type="submit"
            disabled={submitting || !newCommentText.trim()}
            className="btn-primary"
            style={{
              padding: '8px 18px',
              fontSize: 12.5,
              fontWeight: 800,
              backgroundColor: '#5C3A21',
              opacity: submitting || !newCommentText.trim() ? 0.6 : 1
            }}
          >
            <Send size={13} /> {submitting ? 'Posting...' : 'Post Field Note'}
          </button>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="field-report-filter-bar">
        <div className="field-report-search">
          <Search size={15} className="field-report-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search comments, authors, locations, keywords..."
          />
        </div>

        <select
          value={selectedDiscipline}
          onChange={(e) => setSelectedDiscipline(e.target.value)}
          className="field-report-select"
        >
          <option value="all">All Trades / Disciplines</option>
          <option value="architectural">Architectural</option>
          <option value="electrical">Electrical</option>
          <option value="plumbing">Plumbing</option>
          <option value="hvac">HVAC / Mechanical</option>
          <option value="drywall">Drywall & Framing</option>
          <option value="structural">Structural</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="field-report-select"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted_for_contractor_review">In Review</option>
          <option value="closed">Closed</option>
        </select>

        <span style={{ fontSize: 12, fontWeight: 700, color: '#78716C', marginLeft: 'auto' }}>
          Showing <strong>{filteredComments.length}</strong> activity notes
        </span>
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#78716C', fontSize: 14 }}>
          Loading field comments and site activities...
        </div>
      ) : filteredComments.length === 0 ? (
        <div style={{
          padding: 60,
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1.5px dashed #E7E5E4'
        }}>
          <MessageSquare size={36} color="#A8A29E" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1917', marginBottom: 4 }}>
            No field comments found
          </div>
          <div style={{ fontSize: 13, color: '#78716C', maxWidth: 400, margin: '0 auto' }}>
            {searchQuery ? 'Try adjusting your search terms or filters.' : 'Post the first field note above to start tracking project activity.'}
          </div>
        </div>
      ) : (
        <div className="field-report-feed">
          {filteredComments.map((comment) => {
            const authorInitials = comment.author_name
              ? comment.author_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
              : 'FL';

            return (
              <div key={comment.id} className="field-report-card">
                {/* Card Header: Author, Company, Role, Date */}
                <div className="field-report-card-header">
                  <div className="field-report-author-block">
                    <div className="field-report-avatar">
                      {comment.author_avatar ? (
                        <img src={comment.author_avatar} alt={comment.author_name} />
                      ) : (
                        <span>{authorInitials}</span>
                      )}
                    </div>
                    <div>
                      <div className="field-report-author-name">
                        <span>{comment.author_name}</span>
                        {comment.author_role && (
                          <span className="field-report-role-badge">
                            {comment.author_role.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="field-report-meta">
                        <span>{comment.author_company}</span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {formatDate(comment.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {getStatusBadge(comment.pin_status)}
                  </div>
                </div>

                {/* Comment Body */}
                <div className="field-report-body">
                  {comment.body}
                </div>

                {/* Attached Media / Photos if available */}
                {comment.photos && comment.photos.length > 0 && (
                  <div className="field-report-photos-grid">
                    {comment.photos.map((ph) => (
                      <div
                        key={ph.id}
                        className="field-report-photo-thumb"
                        onClick={() => setLightboxPhoto(ph)}
                        title="Click to zoom in on photo"
                      >
                        <img src={ph.url} alt={ph.caption || 'Field attachment'} />
                        <div className="field-report-photo-zoom-hint">
                          <ZoomIn size={10} /> Inspect
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Context Badge Bar (Associated Project / Location / Sheet / Issue) */}
                <div className="field-report-context-bar">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#5C3A21', fontWeight: 800 }}>
                    <MapPin size={12} color="#D97706" />
                    {comment.location}
                  </span>

                  {comment.sheet_number && (
                    <>
                      <span style={{ color: '#D6D3D1' }}>•</span>
                      <span style={{ color: '#78716C', fontFamily: 'var(--font-mono, monospace)' }}>
                        Sheet: {comment.sheet_number}
                      </span>
                    </>
                  )}

                  {comment.pin_title && (
                    <>
                      <span style={{ color: '#D6D3D1' }}>•</span>
                      <a
                        className="field-report-issue-link"
                        onClick={() => {
                          if (onSelectPin) onSelectPin(comment.pin_id);
                        }}
                        title="Open full punch item details"
                      >
                        PL-#{comment.pin_item_number}: {comment.pin_title}
                        <ArrowUpRight size={12} />
                      </a>
                    </>
                  )}

                  {onOpenSheetWithPin && comment.sheet_id && (
                    <button
                      onClick={() => onOpenSheetWithPin(comment.sheet_id, comment.pin_id)}
                      className="btn-ghost"
                      style={{
                        marginLeft: 'auto',
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FCD34D',
                        borderRadius: 4,
                        gap: 4
                      }}
                    >
                      <Layers size={11} color="#D97706" />
                      View on Plan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox for inspecting photos */}
      {lightboxPhoto && (
        <PhotoZoomLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </div>
  );
}

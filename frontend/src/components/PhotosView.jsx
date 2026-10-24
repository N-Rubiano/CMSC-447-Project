import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Search,
  ZoomIn,
  Download,
  Clock,
  User,
  MapPin,
  RefreshCw,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import PhotoZoomLightbox from './PhotoZoomLightbox';
import './PhotosView.css';

export default function PhotosView({
  project,
  sheets = [],
  pins = [],
  currentUser,
  onSelectPin
}) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const loadPhotos = async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await api.getProjectPhotos(project.id);
      setPhotos(data);
    } catch (err) {
      console.warn('Falling back to pins photos mapping:', err);
      const list = [];
      for (const p of pins) {
        if (p.photos && p.photos.length > 0) {
          const sheet = sheets.find(s => s.id === p.sheet_id);
          const latestComment = (p.comments && p.comments.length > 0)
            ? [...p.comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
            : null;

          for (const ph of p.photos) {
            list.push({
              id: ph.id,
              url: ph.url,
              caption: ph.caption || (latestComment ? latestComment.body : p.title),
              comment_body: latestComment ? latestComment.body : (ph.caption || p.description || p.title),
              uploaded_by: ph.uploaded_by || latestComment?.author_name || 'Field Inspector',
              created_at: ph.created_at || p.created_at,
              type: ph.type || 'issue',
              pin_id: p.id,
              pin_title: p.title,
              pin_item_number: p.item_number,
              pin_status: p.status,
              location: p.room_location || sheet?.name || 'Field Site',
              sheet_id: p.sheet_id
            });
          }
        }
      }
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPhotos(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [project?.id, pins.length]);

  // Guaranteed Latest -> Oldest sorting and search
  const filteredPhotos = useMemo(() => {
    // Only display entries that have a valid photo URL
    let list = photos.filter(p => !!p.url);

    list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        (p.comment_body && p.comment_body.toLowerCase().includes(q)) ||
        (p.caption && p.caption.toLowerCase().includes(q)) ||
        (p.uploaded_by && p.uploaded_by.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.pin_title && p.pin_title.toLowerCase().includes(q))
      );
    }
    return list;
  }, [photos, searchQuery]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
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

  const handleDownload = (e, photo) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="photos-view-container">
      {/* Header */}
      <div className="photos-view-header">
        <div className="photos-view-title">
          <h1>
            <ImageIcon size={26} color="#D97706" />
            Field Photo Gallery
          </h1>
          <div className="photos-view-subtitle">
            Visual proof and photo attachments connected to field comments, observations, and punch items (sorted latest → oldest).
          </div>
        </div>

        <button
          onClick={loadPhotos}
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
          title="Refresh Photo Stream"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A8A29E' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search photo comments, users, locations..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #E7E5E4',
              borderRadius: 8,
              fontSize: 13,
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Photo Stream */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#78716C', fontSize: 14 }}>
          Loading field photos...
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div style={{
          padding: 60,
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1.5px dashed #E7E5E4'
        }}>
          <ImageIcon size={38} color="#A8A29E" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1917', marginBottom: 4 }}>
            No photos found
          </div>
          <div style={{ fontSize: 13, color: '#78716C', maxWidth: 400, margin: '0 auto' }}>
            Only comments and issues with attached pictures appear in this section. Upload a photo in a comment or punch item to see it here.
          </div>
        </div>
      ) : (
        <div className="photos-grid">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="photo-card">
              {/* Picture with Zoom & Download overlay */}
              <div
                className="photo-media-wrapper"
                onClick={() => setLightboxPhoto(photo)}
                title="Click to Zoom In / Inspect Photo"
              >
                <img src={photo.url} alt={photo.caption || 'Field photo'} />
                <div className="photo-badge-type">
                  {photo.type === 'work_completed' ? 'Resolution Photo' : 'Issue Photo'}
                </div>

                <div className="photo-overlay-actions">
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxPhoto(photo); }}
                    className="photo-overlay-btn"
                    title="Zoom In"
                  >
                    <ZoomIn size={12} /> Zoom
                  </button>
                  <button
                    onClick={(e) => handleDownload(e, photo)}
                    className="photo-overlay-btn"
                    title="Download Photo"
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              </div>

              {/* Card Details */}
              <div className="photo-content">
                {/* Associated comment text */}
                <div className="photo-comment-text">
                  {photo.comment_body || photo.caption || photo.pin_title || 'Attached photo'}
                </div>

                {/* Added by */}
                <div className="photo-meta-row">
                  <User size={12} color="#D97706" />
                  <span>Added by: <strong>{photo.uploaded_by}</strong></span>
                </div>

                {/* Date/time */}
                <div className="photo-meta-row">
                  <Clock size={12} color="#78716C" />
                  <span>{formatDate(photo.created_at)}</span>
                </div>

                {/* Related issue and location */}
                <div className="photo-location-tag">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} color="#D97706" />
                    {photo.location}
                  </span>

                  {photo.pin_id && onSelectPin && (
                    <button
                      onClick={() => onSelectPin(photo.pin_id)}
                      className="btn-ghost"
                      style={{ padding: '2px 6px', fontSize: 11, fontWeight: 700, color: '#B45309' }}
                    >
                      Issue #{photo.pin_item_number || ''}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox for Pan & Zoom */}
      {lightboxPhoto && (
        <PhotoZoomLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Camera,
  Upload,
  MessageSquare,
  History,
  Send,
  Calendar,
  Building,
  User,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Image as ImageIcon,
  Check,
  Sparkles,
  ArrowRight,
  Shield,
  RotateCcw,
  ShieldCheck,
  HardHat,
  Wrench,
  ZoomIn,
  Download
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import PhotoZoomLightbox from './PhotoZoomLightbox';
import { computeSubcontractorInitials } from './CircleStampModal';

export default function PinDetailModal({
  pinId,
  onClose,
  onUpdatePin,
  onDeletePin,
  users = [],
  currentUser
}) {
  const [pin, setPin] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'photos' | 'comments' | 'history'
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef(null);

  const loadPinDetails = async () => {
    try {
      setLoading(true);
      const [pinData, compData] = await Promise.all([
        api.getPin(pinId),
        api.getCompanies().catch(() => [])
      ]);
      setPin(pinData);
      setCompanies(compData);

      // Load subcontractors for GC
      if (currentUser?.role === 'general_contractor' && currentUser.company_id) {
        const subs = compData.filter(c => c.parent_contractor_id === currentUser.company_id);
        setSubcontractors(subs);
      } else {
        const subs = compData.filter(c => c.type === 'subcontractor');
        setSubcontractors(subs);
      }
    } catch (err) {
      console.error('Failed to load pin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pinId) {
      loadPinDetails();
    }
  }, [pinId]);

  if (!pinId) return null;

  const handleStatusWorkflowTransition = async (newStatus, customComment = '') => {
    if (!pin) return;
    setSaving(true);
    try {
      const commentToSend = customComment || actionComment;
      await api.updatePinStatus(pin.id, newStatus, commentToSend);
      if (newStatus === 'closed') {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      }
      setActionComment('');
      await loadPinDetails();
      if (onUpdatePin) onUpdatePin(pin.id, { status: newStatus });
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignDelegation = async (subCompanyId) => {
    if (!pin) return;
    setSaving(true);
    try {
      const sub = companies.find(c => c.id === subCompanyId);
      await api.assignPin(pin.id, {
        subcontractor_company_id: subCompanyId,
        assigned_to_company: sub?.name
      });
      await loadPinDetails();
      if (onUpdatePin) onUpdatePin(pin.id, { assigned_subcontractor_id: subCompanyId, assigned_to_company: sub?.name });
    } catch (err) {
      alert(err.message || 'Failed to assign subcontractor');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setPin(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveFields = async () => {
    if (!pin) return;
    setSaving(true);
    try {
      await onUpdatePin(pin.id, {
        title: pin.title,
        description: pin.description,
        priority: pin.priority,
        discipline: pin.discipline,
        room_location: pin.room_location,
        due_date: pin.due_date
      });
      loadPinDetails();
    } catch (err) {
      console.error('Error saving pin fields:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.addComment(pin.id, {
        body: newComment.trim(),
        author_id: currentUser?.id
      });
      setNewComment('');
      loadPinDetails();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('caption', currentUser?.role === 'sub_contractor' ? 'Resolution work photo' : 'Field inspection photo');
    formData.append('uploaded_by', currentUser?.name || 'Field Inspector');
    formData.append('type', currentUser?.role === 'sub_contractor' ? 'work_completed' : 'issue');

    try {
      await api.uploadPhoto(pin.id, formData);
      loadPinDetails();
      setActiveTab('photos');
    } catch (err) {
      console.error('Error uploading photo:', err);
    }
  };

  const trades = ['architectural', 'structural', 'mep', 'electrical', 'plumbing', 'drywall', 'glazing', 'finishes'];

  // Role booleans
  const isAdmin = currentUser?.role === 'admin';
  const isGc = currentUser?.role === 'general_contractor';
  const isSub = currentUser?.role === 'sub_contractor';
  const isArchitect = currentUser?.role === 'architect';
  const isOwner = currentUser?.role === 'owner';
  const isInspector = currentUser?.role === 'field_inspector';
  // Facility Admin has sole authority to delete pins
  const canDelete = isAdmin;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(24, 24, 27, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      zIndex: 500,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 'min(580px, 100vw)',
        height: '100%',
        backgroundColor: '#FFFFFF',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1.5px solid var(--border-default)',
        animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Drawer Top Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1.5px solid var(--border-default)',
          backgroundColor: '#5C3A21',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Subcontractor Stamp Circle Initials Badge */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: {
                  open: '#DC2626',
                  in_review: '#D97706',
                  in_progress: '#2563EB',
                  closed: '#16A34A',
                  rejected: '#78716C'
                }[pin?.status] || '#DC2626',
                border: '2px solid #FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 12.5,
                fontFamily: 'var(--font-mono, monospace)',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                flexShrink: 0
              }}
              title={`Subcontractor Stamp: ${pin?.stamp_initials || computeSubcontractorInitials(pin?.assigned_to_company)} (${pin?.assigned_to_company || 'Unassigned'})`}
            >
              {pin?.stamp_initials || computeSubcontractorInitials(pin?.assigned_to_company)}
            </div>

            <div style={{
              fontSize: 12,
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              padding: '3px 8px',
              borderRadius: 4,
              border: '1px solid #FCD34D'
            }}>
              PL-#{pin?.item_number || '...'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-0.01em', color: '#FEF3C7' }}>
                PUNCH ITEM WORKFLOW
              </div>
              <div style={{ fontSize: 11, color: '#FDE68A' }}>
                {pin?.room_location || 'Field Location'} • {pin?.sheet_number || 'Sheet A-101'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {canDelete && (
              confirmDelete ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239, 68, 68, 0.2)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  <span style={{ fontSize: 11, color: '#FCA5A5', fontWeight: 800 }}>Delete item?</span>
                  <button
                    onClick={() => {
                      onDeletePin(pin.id, true);
                      onClose();
                    }}
                    style={{
                      background: '#DC2626',
                      border: 'none',
                      color: '#FFFFFF',
                      borderRadius: 3,
                      padding: '2px 8px',
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#E5E7EB',
                      padding: '2px 4px',
                      fontSize: 10.5,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="btn-ghost"
                  style={{ padding: '6px 10px', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Delete Stamp / Punch Item"
                >
                  <Trash2 size={16} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Delete</span>
                </button>
              )
            )}
            <button
              onClick={onClose}
              className="btn-ghost"
              style={{ padding: 6, color: '#FFFFFF' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading item details...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            
            {/* WORKFLOW ACTION HERO BANNER (Role-Enforced Status Controls) */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1.5px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Current Status
                </span>
                <span className={`badge-status ${pin?.status}`}>
                  {pin?.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Subcontractor Actions */}
              {isSub && (
                <div>
                  {(pin?.status === 'open' || pin?.status === 'assigned') && (
                    <button
                      onClick={() => handleStatusWorkflowTransition('in_progress', 'Subcontractor commenced on-site work')}
                      className="btn-primary"
                      style={{ width: '100%', padding: '10px', fontSize: 13, fontWeight: 800, backgroundColor: '#2563EB', borderColor: '#1D4ED8' }}
                    >
                      <ArrowRight size={15} /> Start Work (Mark In Progress)
                    </button>
                  )}

                  {pin?.status === 'in_progress' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button
                        onClick={() => handleStatusWorkflowTransition('submitted_for_contractor_review', 'Work completed by subcontractor; submitted for GC review')}
                        className="btn-primary"
                        style={{ width: '100%', padding: '10px', fontSize: 13, fontWeight: 800, backgroundColor: '#D97706', borderColor: '#B45309' }}
                      >
                        <Check size={15} /> Submit Work for Contractor Review
                      </button>
                      <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                        Ensure you upload resolution photos before submitting.
                      </div>
                    </div>
                  )}

                  {pin?.status === 'submitted_for_contractor_review' && (
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#D97706', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                      ⏳ Submitted for General Contractor Review. Awaiting GC inspection.
                    </div>
                  )}

                  {pin?.status === 'submitted_for_admin_review' && (
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5B21B6', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                      ✅ GC Approved! Awaiting final sign-off from Facility Admin.
                    </div>
                  )}

                  {pin?.status === 'closed' && (
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#15803D', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                      🎉 Closed & Formally Approved by Facility Admin.
                    </div>
                  )}
                </div>
              )}

              {/* General Contractor Actions */}
              {isGc && (
                <div>
                  {pin?.status === 'submitted_for_contractor_review' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                        Subcontractor submitted completed work. Review and take action:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button
                          onClick={() => handleStatusWorkflowTransition('submitted_for_admin_review', 'GC Approved: Forwarding to Admin for final close-out')}
                          className="btn-primary"
                          style={{ padding: '9px', fontSize: 12, fontWeight: 800, backgroundColor: '#15803D', borderColor: '#166534' }}
                        >
                          <Check size={14} /> Approve → Admin
                        </button>
                        <button
                          onClick={() => handleStatusWorkflowTransition('in_progress', 'GC Rejected: Re-work required by subcontractor')}
                          className="btn-secondary"
                          style={{ padding: '9px', fontSize: 12, fontWeight: 800, color: '#DC2626', borderColor: '#FCA5A5' }}
                        >
                          <RotateCcw size={14} /> Reject Back
                        </button>
                      </div>
                    </div>
                  )}

                  {(pin?.status === 'open' || pin?.status === 'assigned') && (
                    <button
                      onClick={() => handleStatusWorkflowTransition('in_progress', 'GC marked in-progress')}
                      className="btn-secondary"
                      style={{ width: '100%', padding: '8px', fontSize: 12, fontWeight: 700 }}
                    >
                      Mark In Progress
                    </button>
                  )}

                  {pin?.status === 'submitted_for_admin_review' && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#5B21B6', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      Forwarded to Facility Admin for final sign-off.
                    </div>
                  )}

                  {pin?.status === 'closed' && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      Item Closed & Verified.
                    </div>
                  )}
                </div>
              )}

              {/* Facility Admin Actions */}
              {isAdmin && (
                <div>
                  {pin?.status === 'submitted_for_admin_review' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#5B21B6' }}>
                        GC has approved this item. Facility Administrator sign-off required:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button
                          onClick={() => handleStatusWorkflowTransition('closed', 'Facility Admin approved and closed punch item')}
                          className="btn-primary"
                          style={{ padding: '10px', fontSize: 12.5, fontWeight: 900, backgroundColor: '#15803D', borderColor: '#166534' }}
                        >
                          <Check size={15} /> Approve & Close
                        </button>
                        <button
                          onClick={() => handleStatusWorkflowTransition('in_progress', 'Admin rejected work: deficiencies remain')}
                          className="btn-secondary"
                          style={{ padding: '10px', fontSize: 12.5, fontWeight: 800, color: '#DC2626', borderColor: '#FCA5A5' }}
                        >
                          <RotateCcw size={15} /> Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {pin?.status !== 'closed' ? (
                        <button
                          onClick={() => handleStatusWorkflowTransition('closed', 'Admin direct close')}
                          className="btn-primary"
                          style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 800, backgroundColor: '#15803D' }}
                        >
                          <Check size={14} /> Close Item
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusWorkflowTransition('in_progress', 'Admin reopened item')}
                          className="btn-secondary"
                          style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 700 }}
                        >
                          <RotateCcw size={14} /> Re-open Item
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Field Inspector Actions */}
              {isInspector && (
                <div>
                  {(pin?.status === 'open' || pin?.status === 'assigned') && (
                    <button
                      onClick={() => handleStatusWorkflowTransition('in_progress', 'Field Inspector commenced QA inspection')}
                      className="btn-secondary"
                      style={{ width: '100%', padding: '8px', fontSize: 12, fontWeight: 700 }}
                    >
                      Mark In Progress
                    </button>
                  )}
                  {pin?.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusWorkflowTransition('submitted_for_contractor_review', 'Field Inspector submitted for contractor review')}
                      className="btn-primary"
                      style={{ width: '100%', padding: '8px', fontSize: 12, fontWeight: 800, backgroundColor: '#EA580C', borderColor: '#C2410C' }}
                    >
                      <Check size={14} /> Submit for GC Review
                    </button>
                  )}
                  {pin?.status === 'submitted_for_contractor_review' && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      Submitted for Contractor Review.
                    </div>
                  )}
                  {pin?.status === 'submitted_for_admin_review' && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#5B21B6', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      Awaiting Facility Admin final approval.
                    </div>
                  )}
                  {pin?.status === 'closed' && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      Item Closed & Verified.
                    </div>
                  )}
                </div>
              )}

              {/* Architect Compliance Notice */}
              {isArchitect && (
                <div style={{ fontSize: 12, color: '#1E40AF', padding: '6px 10px', backgroundColor: '#EFF6FF', borderRadius: 6, textAlign: 'center', fontWeight: 600, border: '1px solid #BFDBFE' }}>
                  📐 Architect — Design Compliance Audit View
                </div>
              )}

              {/* Owner Read-Only Notice */}
              {isOwner && (
                <div style={{ fontSize: 12, color: '#065F46', padding: '6px 10px', backgroundColor: '#ECFDF5', borderRadius: 6, textAlign: 'center', fontWeight: 600, border: '1px solid #A7F3D0' }}>
                  💼 Owner / Client Rep — Read-Only Audit & Inspection View
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1.5px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-2)',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              {[
                { id: 'details', label: 'Details' },
                { id: 'photos', label: `Photos (${pin?.photos?.length || 0})` },
                { id: 'comments', label: `Comments (${pin?.comments?.length || 0})` },
                { id: 'history', label: `Audit Log (${pin?.history?.length || 0})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '11px 4px',
                    fontSize: 12,
                    fontWeight: 800,
                    backgroundColor: 'transparent',
                    color: activeTab === tab.id ? '#5C3A21' : 'var(--text-muted)',
                    borderBottom: activeTab === tab.id ? '3px solid #5C3A21' : '3px solid transparent',
                    borderRadius: 0
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, backgroundColor: '#FFFFFF' }}>
              
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Organizational Responsibility Card */}
                  <div style={{
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '12px 14px'
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                      Organizational Assignment Hierarchy
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Created By:</span>
                        <span style={{ fontWeight: 800, color: '#0F172A' }}>{pin?.created_by_name || 'Sarah Chen, PE (Admin)'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>General Contractor:</span>
                        <span style={{ fontWeight: 800, color: '#0F172A' }}>{pin?.assigned_contractor_name || 'Apex Construction GC'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Delegated Subcontractor:</span>
                        {isGc ? (
                          <select
                            value={pin?.assigned_subcontractor_id || ''}
                            onChange={(e) => handleAssignDelegation(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              fontSize: 12,
                              fontWeight: 700,
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: 4
                            }}
                          >
                            <option value="">Select Subcontractor...</option>
                            {subcontractors.map(sc => (
                              <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontWeight: 800, color: '#D97706' }}>
                            {pin?.assigned_subcontractor_name || pin?.assigned_to_company || 'Unassigned'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                      Issue Title
                    </label>
                    <input
                      type="text"
                      disabled={isSub}
                      value={pin?.title || ''}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      onBlur={handleSaveFields}
                      placeholder="Enter punch-list issue title..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: isSub ? '#F8FAFC' : '#FFFFFF',
                        border: '1.5px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontSize: 13.5,
                        fontWeight: 700,
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                      Field Description & Spec Reference
                    </label>
                    <textarea
                      rows={3}
                      disabled={isSub}
                      value={pin?.description || ''}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      onBlur={handleSaveFields}
                      placeholder="Provide specific field observation, detail references, or corrective action..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: isSub ? '#F8FAFC' : '#FFFFFF',
                        border: '1.5px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontSize: 13,
                        lineHeight: 1.5,
                        outline: 'none',
                        resize: 'vertical',
                        fontWeight: 500
                      }}
                    />
                  </div>

                  {/* Grid: Trade & Priority */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        Trade / Discipline
                      </label>
                      <select
                        disabled={isSub}
                        value={pin?.discipline || 'architectural'}
                        onChange={(e) => { handleFieldChange('discipline', e.target.value); handleSaveFields(); }}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          backgroundColor: isSub ? '#F8FAFC' : '#FFFFFF',
                          border: '1.5px solid var(--border-default)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      >
                        {trades.map(t => (
                          <option key={t} value={t}>{t.toUpperCase().replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        Priority Level
                      </label>
                      <select
                        disabled={isSub}
                        value={pin?.priority || 'medium'}
                        onChange={(e) => { handleFieldChange('priority', e.target.value); handleSaveFields(); }}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          backgroundColor: isSub ? '#F8FAFC' : '#FFFFFF',
                          border: '1.5px solid var(--border-default)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">CRITICAL (Blocking)</option>
                      </select>
                    </div>
                  </div>

                  {/* Root Cause */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                      Root Cause
                    </label>
                    <select
                      disabled={isSub}
                      value={pin?.root_cause || 'Workmanship / Craftsmanship Defect'}
                      onChange={(e) => { handleFieldChange('root_cause', e.target.value); handleSaveFields(); }}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        backgroundColor: isSub ? '#F8FAFC' : '#FFFFFF',
                        border: '1.5px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    >
                      <option value="Workmanship / Craftsmanship Defect">Workmanship / Craftsmanship Defect</option>
                      <option value="Design / Plan Conflict">Design / Plan Conflict</option>
                      <option value="Material Defect / Damaged Product">Material Defect / Damaged Product</option>
                      <option value="Damage by Other Trade">Damage by Other Trade</option>
                      <option value="Incomplete Scope / Omission">Incomplete Scope / Omission</option>
                      <option value="Site Condition / Framing Tolerance">Site Condition / Framing Tolerance</option>
                      <option value="Weather / Environmental Damage">Weather / Environmental Damage</option>
                      <option value="Other / Unspecified">Other / Unspecified</option>
                    </select>
                  </div>

                  {/* Location & Due Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        Room / Location
                      </label>
                      <input
                        type="text"
                        disabled={isSub}
                        value={pin?.room_location || ''}
                        onChange={(e) => handleFieldChange('room_location', e.target.value)}
                        onBlur={handleSaveFields}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          backgroundColor: isSub ? '#F8FAFC' : '#FFFFFF',
                          border: '1.5px solid var(--border-default)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        Target Due Date
                      </label>
                      <input
                        type="date"
                        disabled={isSub}
                        value={pin?.due_date || ''}
                        onChange={(e) => { handleFieldChange('due_date', e.target.value); handleSaveFields(); }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          backgroundColor: isSub ? '#F8FAFC' : '#FFFFFF',
                          border: '1.5px solid var(--border-default)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: PHOTOS */}
              {activeTab === 'photos' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>
                      Attachments & Proof of Work ({pin?.photos?.length || 0})
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: 11.5, gap: 6, backgroundColor: '#5C3A21' }}
                    >
                      <Camera size={13} /> Add Photo
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {pin?.photos?.length > 0 ? (
                      pin.photos.map((ph) => (
                        <div
                          key={ph.id}
                          style={{
                            border: '1.5px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <div
                            style={{ position: 'relative', height: 140, cursor: 'pointer', overflow: 'hidden' }}
                            onClick={() => setLightboxPhoto(ph)}
                            title="Click to Zoom In / Inspect Photo"
                          >
                            <img
                              src={ph.url}
                              alt="Punch photo"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 6,
                              right: 6,
                              backgroundColor: 'rgba(0,0,0,0.65)',
                              color: '#FFFFFF',
                              padding: '3px 7px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <ZoomIn size={11} /> Zoom
                            </div>
                          </div>

                          <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: ph.type === 'work_completed' ? '#15803D' : '#DC2626', textTransform: 'uppercase' }}>
                              {ph.type === 'work_completed' ? 'Resolution Photo' : 'Issue Photo'}
                            </div>
                            <div style={{ fontSize: 11, color: '#1E293B', fontWeight: 600, marginTop: 2 }}>
                              {ph.caption || 'No caption'}
                            </div>
                            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                              By {ph.uploaded_by}
                            </div>

                            <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
                              <button
                                type="button"
                                onClick={() => setLightboxPhoto(ph)}
                                className="btn-ghost"
                                style={{ flex: 1, padding: '4px 6px', fontSize: 11, fontWeight: 700, backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                              >
                                <ZoomIn size={11} /> Zoom In
                              </button>
                              <a
                                href={ph.url}
                                download={`punch-photo-${ph.id}.jpg`}
                                onClick={(e) => e.stopPropagation()}
                                className="btn-ghost"
                                style={{ flex: 1, padding: '4px 6px', fontSize: 11, fontWeight: 700, backgroundColor: '#E0E7FF', color: '#3730A3', border: '1px solid #C7D2FE', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                              >
                                <Download size={11} /> Download
                              </a>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                        No photos uploaded yet. Tap "Add Photo" to attach resolution proof.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: COMMENTS */}
              {activeTab === 'comments' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {pin?.comments?.length > 0 ? (
                      pin.comments.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 8,
                            padding: '10px 14px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>
                              {c.author_name} <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B' }}>({c.author_company})</span>
                            </span>
                            <span style={{ fontSize: 10, color: '#94A3B8' }}>
                              {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.4 }}>
                            {c.body}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                        No comments yet. Post an update below.
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Add field note or status update..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid var(--border-default)',
                        borderRadius: 6,
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ padding: '9px 14px', backgroundColor: '#5C3A21' }}
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: AUDIT LOG TIMELINE */}
              {activeTab === 'history' && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: '0.04em' }}>
                    Chronological Accountability Audit Trail
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pin?.history?.length > 0 ? (
                      pin.history.map((log) => (
                        <div
                          key={log.id}
                          style={{
                            display: 'flex',
                            gap: 12,
                            padding: '10px 12px',
                            backgroundColor: '#F8FAFC',
                            borderLeft: '3px solid #5C3A21',
                            borderRadius: '0 6px 6px 0'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#5C3A21' }}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontSize: 10, color: '#94A3B8' }}>
                                {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 700, marginTop: 2 }}>
                              {log.new_value ? `${log.new_value}` : ''}
                            </div>
                            {log.details && (
                              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                                {log.details}
                              </div>
                            )}
                            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                              By: <strong>{log.user_name}</strong> ({log.user_company || log.user_role})
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                        No audit history recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Photo Zoom Lightbox (supports zoom in & download) */}
      {lightboxPhoto && (
        <PhotoZoomLightbox
          imageUrl={lightboxPhoto.url}
          title={pin?.title || 'Inspection Photo'}
          caption={lightboxPhoto.caption || `${pin?.assigned_to_company || 'Subcontractor'} • ${pin?.root_cause || ''}`}
          uploadedBy={lightboxPhoto.uploaded_by}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </div>
  );
}

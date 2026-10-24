
import React, { useState, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Users,
  Building2,
  Calendar,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  HardHat,
  Wrench,
  Check,
  RotateCcw,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api, getToken } from '../services/api';
import './DashboardView.css';

export default function DashboardView({
  project,
  sheets = [],
  currentUser,
  onSelectPinFromTable,
  onSelectSheetFromTable,
  onRefreshData
}) {
  const [pins, setPins] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const loadProjectPins = async () => {
    if (!project) return;
    try {
      setLoading(true);
      const data = await api.getAllProjectPins(project.id);
      setPins(data);
      if (currentUser?.role === 'admin' || currentUser?.role === 'general_contractor') {
        const comps = await api.getCompanies().catch(() => []);
        setCompanies(comps);
      }
    } catch (err) {
      console.error('Failed to load project pins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectPins();
  }, [project?.id]);

  const handleQuickStatusUpdate = async (pin, nextStatus, comment = '') => {
    try {
      await api.updatePinStatus(pin.id, nextStatus, comment);
      await loadProjectPins();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const filteredPins = pins.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesDisc = disciplineFilter === 'all' || p.discipline === disciplineFilter;
    const matchesPrio = priorityFilter === 'all' || p.priority === priorityFilter;
    const matchesSearch = !search ||
      (p.title && p.title.toLowerCase().includes(search.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      (p.room_location && p.room_location.toLowerCase().includes(search.toLowerCase())) ||
      (p.assigned_to_company && p.assigned_to_company.toLowerCase().includes(search.toLowerCase())) ||
      (p.assigned_subcontractor_name && p.assigned_subcontractor_name.toLowerCase().includes(search.toLowerCase())) ||
      String(p.item_number).includes(search);

    return matchesStatus && matchesDisc && matchesPrio && matchesSearch;
  });

  // Calculate Metrics
  const totalCount = pins.length;
  const openCount = pins.filter(p => p.status === 'open' || p.status === 'assigned').length;
  const inProgressCount = pins.filter(p => p.status === 'in_progress').length;
  const gcReviewCount = pins.filter(p => p.status === 'submitted_for_contractor_review').length;
  const adminReviewCount = pins.filter(p => p.status === 'submitted_for_admin_review').length;
  const inReviewCount = gcReviewCount + adminReviewCount;
  const closedCount = pins.filter(p => p.status === 'closed').length;
  const criticalCount = pins.filter(p => p.priority === 'critical' && p.status !== 'closed').length;
  const resolutionRate = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;

  // Exports — use authenticated fetch so the JWT is sent with the request
  const triggerAuthenticatedDownload = async (url, filename) => {
    try {
      const token = getToken();
      if (!token) {
        alert('Authentication required: please log in again.');
        return;
      }
      const separator = url.includes('?') ? '&' : '?';
      const authedUrl = `${url}${separator}token=${encodeURIComponent(token)}`;
      const res = await fetch(authedUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Export failed (${res.status})`);
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
      alert(`Export error: ${err.message}`);
    }
  };

  const handleExportAnnotatedPdf = () => {
    triggerAuthenticatedDownload(
      `/api/projects/${project.id}/export/annotated-pdf`,
      `${project.code || 'PRJ'}_Annotated_PlanSet.pdf`
    );
  };

  const handleExportPunchReport = () => {
    triggerAuthenticatedDownload(
      `/api/projects/${project.id}/export/punch-report`,
      `${project.code || 'PRJ'}_PunchList_Report.pdf`
    );
  };

  const handleExportCsv = () => {
    triggerAuthenticatedDownload(
      `/api/projects/${project.id}/export/csv`,
      `${project.code || 'PRJ'}_PunchList.csv`
    );
  };

  // -------------------------------------------------------------
  // 1. SUBCONTRACTOR VIEW: TABLET-FIRST "MY WORK" QUEUE
  // -------------------------------------------------------------
  if (currentUser?.role === 'sub_contractor') {
    const myPins = pins; // Backend already scopes to this sub
    return (
      <div className="dashboard-scroll-container" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="dashboard-inner-container" style={{ maxWidth: 1200 }}>

          {/* Subcontractor Header Banner */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 12,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: '#EFF6FF',
                border: '1.5px solid #93C5FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Wrench size={22} color="#2563EB" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', margin: 0 }}>
                    MY WORK ASSIGNMENTS
                  </h1>
                  <span style={{ fontSize: 11, background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                    {currentUser.company}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                  Project: <strong>{project?.name}</strong> • Tap an item to review details, upload photos, or submit work.
                </div>
              </div>
            </div>
          </div>

          {/* Subcontractor KPI Cards */}
          <div className="dashboard-kpi-grid">
            <div className="kpi-card kpi-card--sub-total">
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Assigned</div>
              <div className="kpi-number" style={{ color: '#0F172A' }}>{myPins.length}</div>
            </div>
            <div className="kpi-card kpi-card--sub-progress">
              <div style={{ fontSize: 11, fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>In Progress</div>
              <div className="kpi-number" style={{ color: '#EA580C' }}>{inProgressCount}</div>
            </div>
            <div className="kpi-card kpi-card--sub-review">
              <div style={{ fontSize: 11, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Awaiting GC Review</div>
              <div className="kpi-number" style={{ color: '#D97706' }}>{gcReviewCount}</div>
            </div>
            <div className="kpi-card kpi-card--sub-closed">
              <div style={{ fontSize: 11, fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Closed & Approved</div>
              <div className="kpi-number" style={{ color: '#15803D' }}>{closedCount}</div>
            </div>
          </div>

          {/* Subcontractor Work Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '6px 0 0 0' }}>
              Assigned Tasks ({filteredPins.length})
            </h2>

            {filteredPins.length > 0 ? (
              filteredPins.map((p) => {
                const sheet = sheets.find(s => s.id === p.sheet_id);
                return (
                  <div key={p.id} className="subcontractor-task-card">
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#1E293B', fontSize: 15 }}>
                          #{p.item_number}
                        </span>
                        <span className={`badge-priority ${p.priority || 'medium'}`}>
                          {p.priority}
                        </span>
                        <span className={`badge-status ${p.status}`}>
                          {p.status.replace(/_/g, ' ')}
                        </span>
                        {p.due_date && (
                          <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} /> Due: {p.due_date}
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', marginTop: 6 }}>
                        {p.title}
                      </div>

                      <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                        {p.description}
                      </div>

                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span>📍 Location: <strong>{p.room_location || 'Field Site'}</strong></span>
                        <span>📐 Sheet: <strong>{p.sheet_number || sheet?.sheet_number || 'A-101'}</strong></span>
                        {p.photo_count > 0 && <span>📷 <strong>{p.photo_count} Photo(s)</strong></span>}
                      </div>
                    </div>

                    {/* Subcontractor Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {(p.status === 'open' || p.status === 'assigned') && (
                        <button
                          onClick={() => handleQuickStatusUpdate(p, 'in_progress', 'Started on-site work')}
                          className="btn-primary"
                          style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, backgroundColor: '#2563EB', borderColor: '#1D4ED8' }}
                        >
                          <ArrowRight size={14} /> Start Work
                        </button>
                      )}

                      {p.status === 'in_progress' && (
                        <button
                          onClick={() => onSelectPinFromTable(p)}
                          className="btn-primary"
                          style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, backgroundColor: '#D97706', borderColor: '#B45309' }}
                        >
                          <Check size={14} /> Complete & Submit
                        </button>
                      )}

                      <button
                        onClick={() => { if (sheet) onSelectSheetFromTable(sheet, p); }}
                        className="btn-secondary"
                        style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700 }}
                      >
                        <ExternalLink size={13} /> View on Plan
                      </button>

                      <button
                        onClick={() => onSelectPinFromTable(p)}
                        className="btn-ghost"
                        style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#5C3A21' }}
                      >
                        Details & Comments <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 40, textAlign: 'center', color: '#64748B' }}>
                No active work items assigned to your company.
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. GENERAL CONTRACTOR & ADMIN VIEW
  // -------------------------------------------------------------
  const isGc = currentUser?.role === 'general_contractor';

  return (
    <div className="dashboard-scroll-container">
      <div className="dashboard-inner-container">

        {/* Project Header Banner & Export Bar */}
        <div className="dashboard-header-banner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {project?.name}
              </h1>
              <span style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                color: '#92400E',
                backgroundColor: '#FEF3C7',
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid #FCD34D'
              }}>
                {project?.code}
              </span>
              {isGc && (
                <span style={{ fontSize: 11, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                  GC Hub: {currentUser?.company || 'General Contractor'}
                </span>
              )}
              {currentUser?.role === 'admin' && (
                <span style={{ fontSize: 11, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                  Facility Admin • System-wide
                </span>
              )}
              {currentUser?.role === 'architect' && (
                <span style={{ fontSize: 11, background: '#DBEAFE', color: '#2563EB', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                  Architect • Design Compliance
                </span>
              )}
              {currentUser?.role === 'owner' && (
                <span style={{ fontSize: 11, background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                  Owner / Client Rep • Read-Only
                </span>
              )}
              {currentUser?.role === 'field_inspector' && (
                <span style={{ fontSize: 11, background: '#FFEDD5', color: '#EA580C', border: '1px solid #FED7AA', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                  Field Inspector • On-Site QA/QC
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>
              {project?.address} • Assigned GC: <strong>{project?.contractor_company_name || 'Apex Construction GC'}</strong> • Target Completion: <strong>{project?.target_completion || 'Q4 2026'}</strong>
            </div>
          </div>

          {/* Export Action Group */}
          <div className="dashboard-export-group">
            <button
              onClick={handleExportAnnotatedPdf}
              className="btn-brown"
              style={{ padding: '9px 16px', fontSize: 12.5, gap: 7, fontWeight: 700 }}
              title="Download full architectural plan set with pins and markups burned in"
            >
              <Layers size={15} color="#FEF3C7" /> Annotated Plan Set (PDF)
            </button>
            <button
              onClick={handleExportPunchReport}
              className="btn-secondary"
              style={{ padding: '9px 16px', fontSize: 12.5, gap: 7, fontWeight: 700, borderColor: '#D97706', color: '#92400E', backgroundColor: '#FFFBEB' }}
              title="Download formal Punch List Summary PDF with photos and assignees"
            >
              <FileText size={15} color="#D97706" /> Punch Report (PDF)
            </button>
            <button
              onClick={handleExportCsv}
              className="btn-secondary"
              style={{ padding: '9px 16px', fontSize: 12.5, gap: 7, fontWeight: 700 }}
              title="Download CSV spreadsheet"
            >
              <FileSpreadsheet size={15} color="#18181B" /> Export CSV
            </button>
          </div>
        </div>

        {/* GC Review Queue (Prominent Callout for Contractor) */}
        {isGc && gcReviewCount > 0 && (
          <div style={{
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #FCD34D',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 22px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#D97706" />
              <h2 style={{ fontSize: 15, fontWeight: 900, color: '#92400E', margin: 0 }}>
                SUBMISSIONS AWAITING GC REVIEW ({gcReviewCount})
              </h2>
            </div>
            <div style={{ fontSize: 12.5, color: '#B45309', marginTop: 4 }}>
              Subcontractors have completed the following punch items and submitted them for your inspection before forwarding to Facility Admin:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {pins.filter(p => p.status === 'submitted_for_contractor_review').map(p => (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #FDE68A',
                    borderRadius: 6,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#92400E', marginRight: 8 }}>
                      #{p.item_number}
                    </span>
                    <span style={{ fontWeight: 800, color: '#18181B' }}>{p.title}</span>
                    <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>({p.assigned_subcontractor_name || p.assigned_to_company})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handleQuickStatusUpdate(p, 'submitted_for_admin_review', 'GC Approved: Forwarded to Admin for final sign-off')}
                      className="btn-primary"
                      style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, backgroundColor: '#15803D', borderColor: '#166534' }}
                    >
                      <Check size={12} /> Approve → Admin
                    </button>
                    <button
                      onClick={() => handleQuickStatusUpdate(p, 'in_progress', 'GC Rejected: Re-work required')}
                      className="btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#DC2626', borderColor: '#FCA5A5' }}
                    >
                      <RotateCcw size={12} /> Reject Back
                    </button>
                    <button
                      onClick={() => onSelectPinFromTable(p)}
                      className="btn-ghost"
                      style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700 }}
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Review Queue (Prominent Callout for Admin) */}
        {!isGc && adminReviewCount > 0 && (
          <div style={{
            backgroundColor: '#F5F3FF',
            border: '1.5px solid #DDD6FE',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 22px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="#7C3AED" />
              <h2 style={{ fontSize: 15, fontWeight: 900, color: '#5B21B6', margin: 0 }}>
                PUNCH ITEMS AWAITING FACILITY ADMIN FINAL SIGN-OFF ({adminReviewCount})
              </h2>
            </div>
            <div style={{ fontSize: 12.5, color: '#6D28D9', marginTop: 4 }}>
              General Contractors have approved these items. As Facility Administrator, verify resolution to formally close:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {pins.filter(p => p.status === 'submitted_for_admin_review').map(p => (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DDD6FE',
                    borderRadius: 6,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#5B21B6', marginRight: 8 }}>
                      #{p.item_number}
                    </span>
                    <span style={{ fontWeight: 800, color: '#18181B' }}>{p.title}</span>
                    <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>({p.assigned_contractor_name} / {p.assigned_subcontractor_name})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handleQuickStatusUpdate(p, 'closed', 'Facility Admin approved and closed punch item')}
                      className="btn-primary"
                      style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, backgroundColor: '#15803D', borderColor: '#166534' }}
                    >
                      <Check size={12} /> Approve & Close
                    </button>
                    <button
                      onClick={() => handleQuickStatusUpdate(p, 'in_progress', 'Admin rejected back to in-progress work')}
                      className="btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#DC2626', borderColor: '#FCA5A5' }}
                    >
                      <RotateCcw size={12} /> Reject
                    </button>
                    <button
                      onClick={() => onSelectPinFromTable(p)}
                      className="btn-ghost"
                      style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700 }}
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Metrics Cards Grid */}
        <div className="dashboard-kpi-grid">
          {/* Card 1: Total & Resolution Rate */}
          <div className="kpi-card kpi-card--resolution">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Resolution Rate
              </span>
              <TrendingUp size={16} color="#D97706" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
              <span className="kpi-number" style={{ color: '#18181B' }}>
                {resolutionRate}%
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                ({closedCount} of {totalCount} closed)
              </span>
            </div>
            <div style={{ width: '100%', height: 6, backgroundColor: '#F4F4F5', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: `${resolutionRate}%`, height: '100%', background: 'linear-gradient(90deg, #FBBF24 0%, #D97706 100%)', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Card 2: Open / In Progress */}
          <div className="kpi-card kpi-card--active">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active / In Progress
              </span>
              <Wrench size={16} color="#2563EB" />
            </div>
            <div className="kpi-number" style={{ color: '#2563EB' }}>
              {openCount + inProgressCount}
            </div>
            <div style={{ fontSize: 11, color: '#1E40AF', marginTop: 4, fontWeight: 600 }}>
              {openCount} Open / {inProgressCount} Underway
            </div>
          </div>

          {/* Card 3: In Review */}
          <div className="kpi-card kpi-card--review">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                In Review
              </span>
              <Clock size={16} color="#D97706" />
            </div>
            <div className="kpi-number" style={{ color: '#D97706' }}>
              {inReviewCount}
            </div>
            <div style={{ fontSize: 11, color: '#92400E', marginTop: 4, fontWeight: 600 }}>
              {gcReviewCount} GC / {adminReviewCount} Admin
            </div>
          </div>

          {/* Card 4: Critical Blockers */}
          <div className="kpi-card kpi-card--critical">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Critical Blockers
              </span>
              <ShieldAlert size={16} color="#DC2626" />
            </div>
            <div className="kpi-number" style={{ color: '#DC2626' }}>
              {criticalCount}
            </div>
            <div style={{ fontSize: 11, color: '#991B1B', marginTop: 4, fontWeight: 600 }}>
              High priority / safety / code
            </div>
          </div>
        </div>

        {/* Master Punch List Table Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface-1)',
          border: '1.5px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Header & Filter Bar */}
          <div className="dashboard-filter-bar">
            {/* Search Input */}
            <div className="dashboard-search-wrap">
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 11 }} />
              <input
                type="text"
                placeholder="Search title, location, trade, sub..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontSize: 13,
                  outline: 'none',
                  fontWeight: 500
                }}
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="dashboard-filter-dropdowns">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="dashboard-filter-select"
              >
                <option value="all">All Statuses ({pins.length})</option>
                <option value="open">Open / Assigned ({openCount})</option>
                <option value="in_progress">In Progress ({inProgressCount})</option>
                <option value="submitted_for_contractor_review">GC Review ({gcReviewCount})</option>
                <option value="submitted_for_admin_review">Admin Review ({adminReviewCount})</option>
                <option value="closed">Closed ({closedCount})</option>
              </select>

              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="dashboard-filter-select"
              >
                <option value="all">All Trades / Disciplines</option>
                <option value="architectural">Architectural</option>
                <option value="structural">Structural</option>
                <option value="mep">MEP / HVAC</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="drywall">Drywall</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="dashboard-filter-select"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical Only</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Table Content */}
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px' }}>#</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Issue & Notes</th>
                  <th style={{ padding: '12px 16px' }}>Sheet / Location</th>
                  <th style={{ padding: '12px 16px' }}>Trade</th>
                  <th style={{ padding: '12px 16px' }}>Contractor / Subcontractor</th>
                  <th style={{ padding: '12px 16px' }}>Due Date</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPins.length > 0 ? (
                  filteredPins.map((p) => {
                    const sheet = sheets.find(s => s.id === p.sheet_id);
                    return (
                      <tr key={p.id}>
                        {/* Item Number */}
                        <td style={{ padding: '12px 16px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#5C3A21' }}>
                          #{p.item_number}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge-status ${p.status}`}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Title and description */}
                        <td
                          style={{ padding: '12px 16px', cursor: 'pointer', maxWidth: 360 }}
                          onClick={() => onSelectPinFromTable(p)}
                        >
                          <div style={{ fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {p.title}
                            {p.photo_count > 0 && (
                              <span style={{ fontSize: 10, color: '#92400E', background: '#FEF3C7', border: '1px solid #FCD34D', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                📷 {p.photo_count}
                              </span>
                            )}
                            {p.comment_count > 0 && (
                              <span style={{ fontSize: 10, color: 'var(--brand-brown)', background: '#EFE8DE', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                💬 {p.comment_count}
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.description}
                            </div>
                          )}
                        </td>

                        {/* Sheet & Location */}
                        <td style={{ padding: '12px 16px' }}>
                          <div
                            onClick={() => { if (sheet) onSelectSheetFromTable(sheet, p); }}
                            style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#D97706', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {p.sheet_number || sheet?.sheet_number} <ExternalLink size={12} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 600 }}>
                            {p.room_location || 'Site General'}
                          </div>
                        </td>

                        {/* Discipline */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-brown)' }}>
                            {p.discipline}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: 12.5 }}>
                            {p.assigned_contractor_name || 'Apex Construction GC'}
                          </div>
                          {p.assigned_subcontractor_name && (
                            <div style={{ fontSize: 11, color: '#D97706', fontWeight: 700, marginTop: 2 }}>
                              ↳ {p.assigned_subcontractor_name}
                            </div>
                          )}
                        </td>

                        {/* Due Date */}
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {p.due_date || 'No deadline'}
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge-priority ${p.priority || 'medium'}`}>
                            {p.priority}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => onSelectPinFromTable(p)}
                            className="btn-secondary"
                            style={{ padding: '5px 12px', fontSize: 11.5, fontWeight: 700 }}
                          >
                            Inspect <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No punch list items match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

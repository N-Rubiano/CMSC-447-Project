import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Upload,
  AlertOctagon,
  AlertTriangle,
  Clock,
  TrendingUp,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  RotateCcw,
  Download
} from 'lucide-react';
import { TRADES } from '../data/mockData';
import './Dashboard.css';

const DISCIPLINE_TO_TRADE = {
  architectural: 'AC',
  mechanical: 'MP',
  plumbing: 'MP',
  electrical: 'EL',
  fire: 'FP',
  'fire protection': 'FP',
  structural: 'ST',
  glazing: 'GL',
  drywall: 'DW',
  flooring: 'FL',
};

function resolveTradeInfo(punch) {
  const raw = (punch?.trade || punch?.stamp_initials || '').toString().trim().toUpperCase();
  if (raw && TRADES[raw]) return TRADES[raw];
  const disc = (punch?.discipline || '').toString().trim().toLowerCase();
  const mappedCode = DISCIPLINE_TO_TRADE[disc];
  if (mappedCode && TRADES[mappedCode]) return TRADES[mappedCode];
  if (raw) return { code: raw.slice(0, 2), name: raw, color: '#4F46E5' };
  return TRADES.AC || { code: 'AC', name: 'Architectural', color: '#4F46E5' };
}

function formatAuditAction(raw = '') {
  const s = String(raw || '').trim();
  if (!s) return 'Field Update';
  if (s === s.toUpperCase() && s.includes('_')) {
    return s
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return s;
}

function formatPunchId(punch) {
  if (punch?.item_number != null) return `#${punch.item_number}`;
  const id = String(punch?.id || '');
  if (id.startsWith('pin-')) return `#${id.slice(4, 10).toUpperCase()}`;
  return id || '—';
}

export default function Dashboard({
  project,
  building,
  floor,
  punchItems = [],
  auditLogs = [],
  onClearLogs,
  onOpenBlueprint,
  onNewPunch,
  onUploadBlueprint,
  onExportProject,
  onSelectPunch,
  onApprovePunch,
  onSignIn,
  currentUser,
  selectedBuilding,
  selectedFloor
}) {
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // -------------------------------------------------------------
  // KPI Metrics Calculation
  // -------------------------------------------------------------
  const totalPunches = punchItems.length;
  const openPunches = useMemo(() => {
    return punchItems.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s === 'open' || s === 'assigned';
    }).length;
  }, [punchItems]);

  const criticalPunches = useMemo(() => {
    return punchItems.filter(p => {
      const isCritical = (p.priority || '').toLowerCase() === 'critical';
      const isClosed = (p.status || '').toLowerCase() === 'resolved' || (p.status || '').toLowerCase() === 'closed';
      return isCritical && !isClosed;
    }).length;
  }, [punchItems]);

  const reviewPunches = useMemo(() => {
    return punchItems.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s === 'in review' || s === 'in_review' || s === 'submitted_for_contractor_review' || s === 'submitted_for_admin_review';
    }).length;
  }, [punchItems]);

  const resolvedPunches = useMemo(() => {
    return punchItems.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s === 'resolved' || s === 'closed';
    }).length;
  }, [punchItems]);

  const resolutionRate = totalPunches > 0 ? Math.round((resolvedPunches / totalPunches) * 100) : 0;

  const inProgressPunches = useMemo(() => {
    return punchItems.filter(p => (p.status || '').toLowerCase() === 'in_progress' || (p.status || '').toLowerCase() === 'in progress').length;
  }, [punchItems]);

  const highPriorityPunches = useMemo(() => {
    return punchItems.filter(p => {
      const isHigh = (p.priority || '').toLowerCase() === 'high';
      const isClosed = ['resolved', 'closed'].includes((p.status || '').toLowerCase());
      return isHigh && !isClosed;
    }).length;
  }, [punchItems]);

  const gcReviewCount = useMemo(() => {
    return punchItems.filter(p => (p.status || '').toLowerCase() === 'submitted_for_contractor_review').length;
  }, [punchItems]);

  const adminReviewCount = useMemo(() => {
    return punchItems.filter(p => (p.status || '').toLowerCase() === 'submitted_for_admin_review').length;
  }, [punchItems]);

  // Priority sorting weights
  const PRIORITY_WEIGHTS = { critical: 4, high: 3, medium: 2, low: 1 };
  const STATUS_WEIGHTS = { open: 1, in_progress: 2, in_review: 3, resolved: 4, closed: 4 };

  // -------------------------------------------------------------
  // Filtered & Sorted Punch Items
  // -------------------------------------------------------------
  const filteredPunches = useMemo(() => {
    return punchItems
      .filter((item) => {
        if (filterStatus !== 'All') {
          const s = (item.status || '').toLowerCase();
          const target = filterStatus.toLowerCase();
          if (target === 'in review' && (s === 'in review' || s === 'in_review' || s === 'submitted_for_contractor_review' || s === 'submitted_for_admin_review')) {
            // match
          } else if (target === 'resolved' && (s === 'resolved' || s === 'closed')) {
            // match
          } else if (target === 'in progress' && (s === 'in progress' || s === 'in_progress')) {
            // match
          } else if (s !== target) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (item.id || '').toLowerCase().includes(q) ||
            (item.item_number != null ? `#${item.item_number}` : '').toLowerCase().includes(q) ||
            (item.title || '').toLowerCase().includes(q) ||
            (item.assignee || '').toLowerCase().includes(q) ||
            (item.company || item.assigned_to_company || '').toLowerCase().includes(q) ||
            (item.gridLocation || '').toLowerCase().includes(q) ||
            (item.room || item.room_location || '').toLowerCase().includes(q) ||
            (item.trade || item.stamp_initials || item.discipline || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'priority') {
          valA = PRIORITY_WEIGHTS[(a.priority || '').toLowerCase()] || 0;
          valB = PRIORITY_WEIGHTS[(b.priority || '').toLowerCase()] || 0;
        } else if (sortField === 'status') {
          valA = STATUS_WEIGHTS[(a.status || '').toLowerCase()] || 0;
          valB = STATUS_WEIGHTS[(b.status || '').toLowerCase()] || 0;
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (valB || '').toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [punchItems, filterStatus, searchQuery, sortField, sortDirection]);

  // Toggle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} color="#A8A29E" style={{ marginLeft: 4, verticalAlign: '-1px' }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} color="#18181B" style={{ marginLeft: 4, verticalAlign: '-1px' }} />
    ) : (
      <ArrowDown size={12} color="#18181B" style={{ marginLeft: 4, verticalAlign: '-1px' }} />
    );
  };

  // -------------------------------------------------------------
  // Approval Queue (Pending items)
  // -------------------------------------------------------------
  const reviewQueue = useMemo(() => {
    return punchItems.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s === 'in review' || s === 'in_review' || s === 'submitted_for_contractor_review' || s === 'submitted_for_admin_review';
    });
  }, [punchItems]);

  // -------------------------------------------------------------
  // Recent Activity Feed
  // -------------------------------------------------------------
  const recentActivities = useMemo(() => {
    if (Array.isArray(auditLogs) && auditLogs.length > 0) {
      return auditLogs.slice(0, 6).map((log) => ({
        action: log.action || log.details || 'Field update recorded',
        by: log.actor || log.actor_name || 'Field User',
        meta: log.time || log.timestamp || log.target || '',
        color: log.color || '#D97706',
      }));
    }
    return punchItems
      .flatMap((p) =>
        (p.history || []).map((h) => ({
          action: h.action,
          by: h.by || 'Field User',
          meta: formatPunchId(p),
          color: resolveTradeInfo(p).color,
        }))
      )
      .slice(-6)
      .reverse();
  }, [auditLogs, punchItems]);

  // Map status to badge style
  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'open' || s === 'assigned') {
      return <span className="punch-chip punch-status--open">Open</span>;
    }
    if (s === 'in progress' || s === 'in_progress') {
      return <span className="punch-chip punch-status--progress">In Progress</span>;
    }
    if (s === 'in review' || s === 'in_review' || s.includes('review')) {
      return <span className="punch-chip punch-status--review">In Review</span>;
    }
    return <span className="punch-chip punch-status--resolved">Resolved</span>;
  };

  // Map priority to badge style
  const getPriorityBadge = (priority = '') => {
    const p = priority.toLowerCase();
    if (p === 'critical') {
      return <span className="punch-chip punch-priority--critical">Critical</span>;
    }
    if (p === 'high') {
      return <span className="punch-chip punch-priority--high">High</span>;
    }
    if (p === 'medium') {
      return <span className="punch-chip punch-priority--medium">Medium</span>;
    }
    return <span className="punch-chip punch-priority--low">Low</span>;
  };

  return (
    <div className="dashboard-container">
      {/* -------------------------------------------------------------
          1. PAGE HEADER (Breadcrumb, Title, Primary & Secondary Actions)
          ------------------------------------------------------------- */}
      <header className="dashboard-header">
        <div className="dashboard-header__left">
          {(selectedBuilding || selectedFloor) && (
            <nav aria-label="Breadcrumbs" className="dashboard-breadcrumb">
              <span className="dashboard-breadcrumb__item">{project?.name || 'Project'}</span>
              {selectedBuilding && (
                <>
                  <ChevronRight size={12} color="#A8A29E" />
                  <span className="dashboard-breadcrumb__item">{selectedBuilding.name}</span>
                </>
              )}
              {selectedFloor && (
                <>
                  <ChevronRight size={12} color="#A8A29E" />
                  <span className="dashboard-breadcrumb__item--active">Floor {selectedFloor}</span>
                </>
              )}
            </nav>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="dashboard-title">Field Dashboard</h1>
            {!selectedBuilding && !selectedFloor && (
              <span style={{
                padding: '3px 9px',
                borderRadius: 999,
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)'
              }}>
                {project?.name || 'UMBC Campus'}
              </span>
            )}
          </div>
        </div>

        <div className="dashboard-actions">
          {onOpenBlueprint && (
            <button
              type="button"
              onClick={onOpenBlueprint}
              className="dashboard-btn-secondary"
              title="Open Architectural Blueprint Drawing"
            >
              <Layers size={15} color="#5C3A21" />
              <span>Open Blueprint</span>
            </button>
          )}

          {onUploadBlueprint && (
            <button
              type="button"
              onClick={onUploadBlueprint}
              className="dashboard-btn-secondary"
              title="Upload Blueprint PDF or Drawing Set"
            >
              <Upload size={15} color="#5C3A21" />
              <span>Add Blueprint</span>
            </button>
          )}

          {onExportProject && (
            <button
              type="button"
              onClick={onExportProject}
              className="dashboard-btn-secondary"
              title="Export Project Info & Punch List (.pdf / .xlsx)"
            >
              <Download size={15} color="#5C3A21" />
              <span>Export</span>
            </button>
          )}

          {onNewPunch && (
            <button
              type="button"
              onClick={onNewPunch}
              className="dashboard-btn-primary"
              title="Create New Field Punch Item"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>New Punch</span>
            </button>
          )}
        </div>
      </header>

      {/* -------------------------------------------------------------
          2. 4 KPI CARDS WITH DATA-DRIVEN STATUS METERS
          ------------------------------------------------------------- */}
      <section aria-label="Key Performance Indicators" className="dashboard-kpi-grid">
        {/* KPI 1: Open Punches */}
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-card__head">
            <span className="dashboard-kpi-card__label">Open Punches</span>
            <div className="dashboard-kpi-card__icon" style={{ backgroundColor: 'var(--status-open-bg)', color: 'var(--status-open)' }}>
              <AlertOctagon size={16} aria-hidden="true" />
            </div>
          </div>
          <div className="dashboard-kpi-card__body">
            <div className="dashboard-kpi-card__value">{openPunches}</div>
            <span className="dashboard-kpi-pill">
              {inProgressPunches} in progress
            </span>
          </div>
          <div className="dashboard-meter" aria-hidden="true">
            <div
              className="dashboard-meter__seg"
              style={{
                width: totalPunches > 0 ? `${Math.round((openPunches / totalPunches) * 100)}%` : '0%',
                backgroundColor: 'var(--status-open)',
              }}
            />
            <div
              className="dashboard-meter__seg"
              style={{
                width: totalPunches > 0 ? `${Math.round((inProgressPunches / totalPunches) * 100)}%` : '0%',
                backgroundColor: 'var(--amber)',
              }}
            />
          </div>
          <div className="dashboard-kpi-card__footer">
            <span>
              {openPunches + inProgressPunches} active of {totalPunches} total items
            </span>
          </div>
        </div>

        {/* KPI 2: Critical / Overdue */}
        <div className={`dashboard-kpi-card${criticalPunches > 0 ? ' dashboard-kpi-card--critical' : ''}`}>
          <div className="dashboard-kpi-card__head">
            <span className={`dashboard-kpi-card__label${criticalPunches > 0 ? ' dashboard-kpi-card__label--critical' : ''}`}>
              Critical / Overdue
            </span>
            <div
              className="dashboard-kpi-card__icon"
              style={{
                backgroundColor: criticalPunches > 0 ? 'var(--danger-bg)' : 'var(--success-light)',
                color: criticalPunches > 0 ? 'var(--danger)' : 'var(--success)',
              }}
            >
              <AlertTriangle size={16} aria-hidden="true" />
            </div>
          </div>
          <div className="dashboard-kpi-card__body">
            <div className={`dashboard-kpi-card__value${criticalPunches > 0 ? ' dashboard-kpi-card__value--critical' : ''}`}>
              {criticalPunches}
            </div>
            <span className="dashboard-kpi-pill">
              {highPriorityPunches} high priority
            </span>
          </div>
          <div className="dashboard-meter" aria-hidden="true">
            <div
              className="dashboard-meter__seg"
              style={{
                width: totalPunches > 0 ? `${Math.round((criticalPunches / totalPunches) * 100)}%` : '0%',
                backgroundColor: 'var(--danger)',
              }}
            />
            <div
              className="dashboard-meter__seg"
              style={{
                width: totalPunches > 0 ? `${Math.round((highPriorityPunches / totalPunches) * 100)}%` : '0%',
                backgroundColor: 'var(--amber)',
              }}
            />
          </div>
          <div className="dashboard-kpi-card__footer">
            {criticalPunches > 0 ? (
              <span className="dashboard-kpi-card__delta-warn">
                <AlertTriangle size={12} aria-hidden="true" />
                Requires life-safety clearance
              </span>
            ) : (
              <span className="dashboard-kpi-card__delta-good">
                No critical life-safety items
              </span>
            )}
          </div>
        </div>

        {/* KPI 3: Awaiting Review */}
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-card__head">
            <span className="dashboard-kpi-card__label">Awaiting Review</span>
            <div className="dashboard-kpi-card__icon" style={{ backgroundColor: 'var(--status-review-bg)', color: 'var(--status-review)' }}>
              <Clock size={16} aria-hidden="true" />
            </div>
          </div>
          <div className="dashboard-kpi-card__body">
            <div className="dashboard-kpi-card__value">{reviewPunches}</div>
            <span className="dashboard-kpi-pill">
              {gcReviewCount} GC · {adminReviewCount} Admin
            </span>
          </div>
          <div className="dashboard-meter" aria-hidden="true">
            <div
              className="dashboard-meter__seg"
              style={{
                width: totalPunches > 0 ? `${Math.round((reviewPunches / totalPunches) * 100)}%` : '0%',
                backgroundColor: 'var(--status-review)',
              }}
            />
          </div>
          <div className="dashboard-kpi-card__footer">
            <span>{reviewPunches > 0 ? 'Ready for field sign-off' : 'No items pending review'}</span>
          </div>
        </div>

        {/* KPI 4: Resolution Rate */}
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-card__head">
            <span className="dashboard-kpi-card__label">Resolution Rate</span>
            <div className="dashboard-kpi-card__icon" style={{ backgroundColor: 'var(--amber-light)', color: 'var(--warning)' }}>
              <TrendingUp size={16} aria-hidden="true" />
            </div>
          </div>
          <div className="dashboard-kpi-card__body">
            <div className="dashboard-kpi-card__value dashboard-kpi-card__value--amber">{resolutionRate}%</div>
            <span className="dashboard-kpi-pill">
              {resolvedPunches} closed
            </span>
          </div>
          <div className="dashboard-meter" aria-hidden="true">
            <div
              className="dashboard-meter__seg"
              style={{
                width: `${resolutionRate}%`,
                backgroundColor: 'var(--success)',
              }}
            />
          </div>
          <div className="dashboard-kpi-card__footer">
            <span>
              {resolvedPunches} of {totalPunches} items closed
            </span>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          3. MAIN LAYOUT: PRIMARY TABLE (LEFT) + SLIM RAIL (RIGHT)
          ------------------------------------------------------------- */}
      {currentUser?.isDemo ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '28px 24px',
            boxShadow: '0 1px 3px rgba(24, 24, 27, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Workspace Overview (Read-Only Demo)
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
            You are viewing a high-level summary of PunchList Pro. Project blueprints, field punch items, documents, and inspection photos are hidden in demo preview.
          </p>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="dashboard-btn-primary"
              style={{ marginTop: 6 }}
            >
              Sign In for Full Access
            </button>
          )}
        </div>
      ) : (
      <div className="dashboard-main-grid">
        {/* Left: Primary Field Punch Items Table Card */}
        <div className="dashboard-table-card">
          {/* Header & Search Toolbar */}
          <div className="dashboard-table-card__toolbar">
            <div className="dashboard-table-card__title-group">
              <h2 className="dashboard-table-card__title">Field Punch Items</h2>
              <span className="dashboard-table-card__subtitle">
                {filteredPunches.length} {filteredPunches.length === 1 ? 'item' : 'items'} on active drawing sheet
              </span>
            </div>

            <div className="dashboard-table-card__controls">
              <div className="dashboard-search-box">
                <Search size={14} color="#78716C" className="dashboard-search-icon" />
                <input
                  type="text"
                  placeholder="Filter by title, trade, assignee…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dashboard-search-input"
                  aria-label="Filter punch list"
                />
              </div>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="dashboard-filter-tabs" role="tablist" aria-label="Status filters">
            {['All', 'Open', 'In Progress', 'In Review', 'Resolved'].map((tab) => {
              const isActive = filterStatus === tab;
              const count =
                tab === 'All'
                  ? totalPunches
                  : tab === 'Open'
                  ? openPunches
                  : tab === 'In Progress'
                  ? punchItems.filter((p) => (p.status || '').toLowerCase().includes('progress')).length
                  : tab === 'In Review'
                  ? reviewPunches
                  : resolvedPunches;

              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilterStatus(tab)}
                  className={`dashboard-filter-tab${isActive ? ' is-active' : ''}`}
                >
                  <span>{tab}</span>
                  <span className="dashboard-filter-badge">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Sticky Table Viewport */}
          <div className="dashboard-table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th
                    className="is-sortable"
                    onClick={() => handleSort('id')}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && handleSort('id')}
                  >
                    ID {renderSortIndicator('id')}
                  </th>
                  <th
                    className="is-sortable"
                    onClick={() => handleSort('trade')}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && handleSort('trade')}
                  >
                    Trade {renderSortIndicator('trade')}
                  </th>
                  <th
                    className="is-sortable"
                    onClick={() => handleSort('title')}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && handleSort('title')}
                  >
                    Issue &amp; Location {renderSortIndicator('title')}
                  </th>
                  <th
                    className="is-sortable"
                    onClick={() => handleSort('priority')}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && handleSort('priority')}
                  >
                    Priority {renderSortIndicator('priority')}
                  </th>
                  <th
                    className="is-sortable"
                    onClick={() => handleSort('status')}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && handleSort('status')}
                  >
                    Status {renderSortIndicator('status')}
                  </th>
                  <th
                    className="is-sortable"
                    onClick={() => handleSort('assignee')}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && handleSort('assignee')}
                  >
                    Assignee {renderSortIndicator('assignee')}
                  </th>
                  <th
                    className="is-sortable"
                    style={{ textAlign: 'right' }}
                    onClick={() => handleSort('dueDate')}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === 'Enter' && handleSort('dueDate')}
                  >
                    Due {renderSortIndicator('dueDate')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPunches.map((punch) => {
                  const tr = resolveTradeInfo(punch);
                  const roomLabel = punch.room || punch.room_location || 'Field Location';
                  const companyLabel = punch.company || punch.assigned_to_company || 'Trade Partner';
                  const dueLabel = punch.dueDate || punch.due_date || '—';
                  return (
                    <tr
                      key={punch.id}
                      onClick={() => onSelectPunch && onSelectPunch(punch)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectPunch && onSelectPunch(punch)}
                    >
                      <td>
                        <span className="punch-id-mono">{formatPunchId(punch)}</span>
                      </td>
                      <td>
                        <span
                          className="trade-stamp"
                          style={{ backgroundColor: tr.color }}
                          title={tr.name || tr.code}
                        >
                          {tr.code}
                        </span>
                      </td>
                      <td className="punch-issue-cell">
                        <div className="punch-issue-title">{punch.title}</div>
                        <div className="punch-issue-location">
                          {punch.gridLocation && (
                            <>
                              <span className="punch-issue-grid">Grid {punch.gridLocation}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{roomLabel}</span>
                        </div>
                      </td>
                      <td>{getPriorityBadge(punch.priority)}</td>
                      <td>{getStatusBadge(punch.status)}</td>
                      <td>
                        <div className="punch-assignee-name">{punch.assignee || 'Unassigned'}</div>
                        <div className="punch-assignee-company">{companyLabel}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="punch-due-date">{dueLabel}</span>
                      </td>
                    </tr>
                  );
                })}

                {filteredPunches.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="dashboard-empty-state">
                        <div className="dashboard-empty-state__icon">
                          <ClipboardList size={22} />
                        </div>
                        <h3 className="dashboard-empty-state__title">No matching punch items</h3>
                        <p className="dashboard-empty-state__desc">
                          {searchQuery
                            ? `No punch items match "${searchQuery}". Try searching for another term.`
                            : `There are currently no items under the "${filterStatus}" status filter.`}
                        </p>
                        {(searchQuery || filterStatus !== 'All') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setFilterStatus('All');
                            }}
                            className="dashboard-btn-secondary"
                            style={{ height: 32, padding: '0 12px', fontSize: 12, marginTop: 4 }}
                          >
                            <RotateCcw size={13} />
                            <span>Reset Filters</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Slim Rail (Approval Queue & Recent Activity ONLY) */}
        <aside className="dashboard-sidebar-column" aria-label="Field coordination">
          {/* 1. Approval Queue */}
          <div className="dashboard-rail-card">
            <div className="dashboard-rail-card__header">
              <h2 className="dashboard-rail-card__title">
                <Clock size={15} color="#B45309" />
                <span>Approval Queue</span>
              </h2>
              <span className="dashboard-rail-card__badge">{reviewQueue.length} pending</span>
            </div>

            {reviewQueue.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {reviewQueue.map((item) => (
                  <div key={item.id} className="approval-item-card">
                    <div className="approval-item-card__top">
                      <span className="punch-id-mono">{formatPunchId(item)}</span>
                      {(item.gridLocation || item.room_location) && (
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: '#78716C' }}>
                          {item.gridLocation ? `Grid ${item.gridLocation}` : item.room_location}
                        </span>
                      )}
                    </div>

                    <div className="approval-item-card__title">{item.title}</div>

                    <div className="approval-item-card__bottom">
                      <span className="approval-item-card__by">By {item.assignee || 'Subcontractor'}</span>
                      {onApprovePunch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApprovePunch(item.id);
                          }}
                          className="approval-btn"
                          title="Sign off & verify punch remediation"
                        >
                          <Check size={13} strokeWidth={2.5} />
                          <span>Approve</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 8px', color: '#78716C', fontSize: 12 }}>
                <CheckCircle2 size={24} color="#16A34A" style={{ display: 'block', margin: '0 auto 6px' }} />
                <div style={{ fontWeight: 600, color: '#18181B' }}>All submissions reviewed</div>
                <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>
                  No punch items currently awaiting sign-off.
                </div>
              </div>
            )}
          </div>

          {/* 2. Recent Activity */}
          <div className="dashboard-rail-card">
            <div className="dashboard-rail-card__header">
              <h2 className="dashboard-rail-card__title">
                <span>Recent Activity</span>
              </h2>
              <span style={{ fontSize: 11, color: '#78716C', fontWeight: 600 }}>Field Updates</span>
            </div>

            {recentActivities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentActivities.map((act, idx) => (
                  <div key={idx} className="activity-item">
                    <div className="activity-node" style={{ backgroundColor: act.color || '#D97706' }} />
                    <div className="activity-content">
                      <div className="activity-action">{formatAuditAction(act.action)}</div>
                      <div className="activity-meta">
                        {act.by}{act.meta ? ` • ${act.meta}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 8px', color: '#78716C', fontSize: 12 }}>
                No recent field activity recorded yet.
              </div>
            )}
          </div>
        </aside>
      </div>
      )}
    </div>
  );
}

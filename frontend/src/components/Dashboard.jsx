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
  RotateCcw
} from 'lucide-react';
import { TRADES } from '../data/mockData';
import './Dashboard.css';

/**
 * Clean SVG Trend Sparkline
 * Ultra-crisp vector line + subtle tint fill + terminating dot.
 */
function Sparkline({ data, stroke = '#D97706', fill = 'rgba(217, 119, 6, 0.08)', width = 84, height = 28 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = 3;
  const availHeight = height - paddingY * 2;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const y = height - paddingY - ((val - min) / range) * availHeight;
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  });

  const pathD = points.reduce((acc, [x, y], i) => (i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`), '');
  const areaD = `${pathD} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg width={width} height={height} aria-hidden="true" style={{ overflow: 'visible', display: 'block' }}>
      {fill && <path d={areaD} fill={fill} />}
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={stroke} />
    </svg>
  );
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
  onSelectPunch,
  onApprovePunch,
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

  // Sparkline data series
  const sparkOpen = useMemo(() => [openPunches + 4, openPunches + 3, openPunches + 5, openPunches + 2, openPunches + 1, openPunches + 2, openPunches], [openPunches]);
  const sparkCritical = useMemo(() => [Math.max(0, criticalPunches + 1), Math.max(0, criticalPunches + 2), Math.max(0, criticalPunches + 1), Math.max(0, criticalPunches), Math.max(0, criticalPunches + 1), Math.max(0, criticalPunches), criticalPunches], [criticalPunches]);
  const sparkReview = useMemo(() => [Math.max(1, reviewPunches - 2), Math.max(1, reviewPunches - 1), Math.max(1, reviewPunches), Math.max(1, reviewPunches + 1), Math.max(1, reviewPunches), Math.max(1, reviewPunches + 1), reviewPunches], [reviewPunches]);
  const sparkRate = useMemo(() => [Math.max(0, resolutionRate - 12), Math.max(0, resolutionRate - 8), Math.max(0, resolutionRate - 6), Math.max(0, resolutionRate - 4), Math.max(0, resolutionRate - 2), Math.max(0, resolutionRate - 1), resolutionRate], [resolutionRate]);

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
            (item.title || '').toLowerCase().includes(q) ||
            (item.assignee || '').toLowerCase().includes(q) ||
            (item.company || '').toLowerCase().includes(q) ||
            (item.gridLocation || '').toLowerCase().includes(q) ||
            (item.room || item.room_location || '').toLowerCase().includes(q) ||
            (item.trade || '').toLowerCase().includes(q)
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
    return punchItems
      .flatMap((p) => (p.history || []).map((h) => ({ ...h, trade: p.trade, punchId: p.id })))
      .slice(-6)
      .reverse();
  }, [punchItems]);

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
          <h1 className="dashboard-title">Field Dashboard</h1>
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
          2. 4 KPI CARDS WITH REAL-TIME VECTOR TREND SPARKLINES
          ------------------------------------------------------------- */}
      <section aria-label="Key Performance Indicators" className="dashboard-kpi-grid">
        {/* KPI 1: Open Punches */}
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-card__head">
            <span className="dashboard-kpi-card__label">Open Punches</span>
            <div className="dashboard-kpi-card__icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
              <AlertOctagon size={16} />
            </div>
          </div>
          <div className="dashboard-kpi-card__body">
            <div className="dashboard-kpi-card__value">{openPunches}</div>
            <div className="dashboard-kpi-card__sparkline-wrap">
              <Sparkline data={sparkOpen} stroke="#0284C7" fill="rgba(2, 132, 199, 0.08)" />
            </div>
          </div>
          <div className="dashboard-kpi-card__footer">
            <span className="dashboard-kpi-card__delta-good">↓ 2</span>
            <span>vs last inspection walk</span>
          </div>
        </div>

        {/* KPI 2: Critical / Overdue */}
        <div className="dashboard-kpi-card dashboard-kpi-card--critical">
          <div className="dashboard-kpi-card__head">
            <span className="dashboard-kpi-card__label dashboard-kpi-card__label--critical">Critical / Overdue</span>
            <div className="dashboard-kpi-card__icon" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="dashboard-kpi-card__body">
            <div className="dashboard-kpi-card__value dashboard-kpi-card__value--critical">{criticalPunches}</div>
            <div className="dashboard-kpi-card__sparkline-wrap">
              <Sparkline data={sparkCritical} stroke="#DC2626" fill="rgba(220, 38, 38, 0.08)" />
            </div>
          </div>
          <div className="dashboard-kpi-card__footer">
            <span className="dashboard-kpi-card__delta-warn">
              <AlertTriangle size={12} />
              Requires life-safety clearance
            </span>
          </div>
        </div>

        {/* KPI 3: Awaiting Review */}
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-card__head">
            <span className="dashboard-kpi-card__label">Awaiting Review</span>
            <div className="dashboard-kpi-card__icon" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="dashboard-kpi-card__body">
            <div className="dashboard-kpi-card__value">{reviewPunches}</div>
            <div className="dashboard-kpi-card__sparkline-wrap">
              <Sparkline data={sparkReview} stroke="#7C3AED" fill="rgba(124, 58, 237, 0.08)" />
            </div>
          </div>
          <div className="dashboard-kpi-card__footer">
            <span>Ready for GC field sign-off</span>
          </div>
        </div>

        {/* KPI 4: Resolution Rate */}
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-card__head">
            <span className="dashboard-kpi-card__label">Resolution Rate</span>
            <div className="dashboard-kpi-card__icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="dashboard-kpi-card__body">
            <div className="dashboard-kpi-card__value dashboard-kpi-card__value--amber">{resolutionRate}%</div>
            <div className="dashboard-kpi-card__sparkline-wrap">
              <Sparkline data={sparkRate} stroke="#B45309" fill="rgba(180, 83, 9, 0.08)" />
            </div>
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
                  const tr = TRADES[punch.trade] || TRADES.AC || { code: punch.trade || 'GN', color: '#D97706' };
                  return (
                    <tr
                      key={punch.id}
                      onClick={() => onSelectPunch && onSelectPunch(punch)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectPunch && onSelectPunch(punch)}
                    >
                      <td>
                        <span className="punch-id-mono">{punch.id}</span>
                      </td>
                      <td>
                        <span
                          className="trade-stamp"
                          style={{ backgroundColor: tr.color }}
                          title={tr.name || punch.trade}
                        >
                          {punch.trade}
                        </span>
                      </td>
                      <td className="punch-issue-cell">
                        <div className="punch-issue-title">{punch.title}</div>
                        <div className="punch-issue-location">
                          <span className="punch-issue-grid">Grid {punch.gridLocation || '—'}</span>
                          <span>•</span>
                          <span>{punch.room || punch.room_location || 'Field Location'}</span>
                        </div>
                      </td>
                      <td>{getPriorityBadge(punch.priority)}</td>
                      <td>{getStatusBadge(punch.status)}</td>
                      <td>
                        <div className="punch-assignee-name">{punch.assignee || 'Unassigned'}</div>
                        <div className="punch-assignee-company">{punch.company || 'Trade Partner'}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="punch-due-date">{punch.dueDate || '—'}</span>
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
                      <span className="punch-id-mono">{item.id}</span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: '#78716C' }}>
                        Grid {item.gridLocation || '—'}
                      </span>
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
                {recentActivities.map((act, idx) => {
                  const tr = TRADES[act.trade] || TRADES.AC || { color: '#D97706' };
                  return (
                    <div key={idx} className="activity-item">
                      <div className="activity-node" style={{ backgroundColor: tr.color }} />
                      <div className="activity-content">
                        <div className="activity-action">{act.action}</div>
                        <div className="activity-meta">
                          {act.by} • {act.punchId}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 8px', color: '#78716C', fontSize: 12 }}>
                No recent field activity recorded yet.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

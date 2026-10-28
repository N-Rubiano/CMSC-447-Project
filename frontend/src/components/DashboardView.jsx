import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Layers,
  Search,
  Clock,
  Wrench,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Check,
  RotateCcw,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Calendar,
  MapPin,
  Ruler,
  Camera,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';
import { api, getToken } from '../services/api';
import './DashboardView.css';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const OPEN_STATUSES = ['open', 'assigned'];

const ROLE_CHIPS = {
  admin: { tone: 'admin', text: 'Facility admin · System-wide' },
  architect: { tone: 'architect', text: 'Architect · Design compliance' },
  owner: { tone: 'owner', text: 'Owner / client rep · Read-only' },
  field_inspector: { tone: 'inspector', text: 'Field inspector · On-site QA/QC' }
};

const DISCIPLINES = [
  ['architectural', 'Architectural'],
  ['structural', 'Structural'],
  ['mep', 'MEP / HVAC'],
  ['electrical', 'Electrical'],
  ['plumbing', 'Plumbing'],
  ['drywall', 'Drywall']
];

const QUEUES = {
  gc: {
    tone: 'gc',
    Icon: Clock,
    title: 'Submissions awaiting GC review',
    intro:
      'Subcontractors have completed these punch items and submitted them for your inspection before they go to the Facility Admin.',
    approve: {
      label: 'Approve → Admin',
      to: 'submitted_for_admin_review',
      comment: 'GC Approved: Forwarded to Admin for final sign-off'
    },
    reject: { label: 'Reject back', to: 'in_progress', comment: 'GC Rejected: Re-work required' },
    who: (p) => p.assigned_subcontractor_name || p.assigned_to_company
  },
  admin: {
    tone: 'admin',
    Icon: ShieldCheck,
    title: 'Awaiting facility admin final sign-off',
    intro:
      'General contractors have approved these items. Verify the resolution to formally close them.',
    approve: {
      label: 'Approve & close',
      to: 'closed',
      comment: 'Facility Admin approved and closed punch item'
    },
    reject: {
      label: 'Reject',
      to: 'in_progress',
      comment: 'Admin rejected back to in-progress work'
    },
    who: (p) => [p.assigned_contractor_name, p.assigned_subcontractor_name].filter(Boolean).join(' / ')
  }
};

const formatStatus = (status = '') => status.replace(/_/g, ' ');

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function Shell({ sub = false, notice, onDismissNotice, children }) {
  return (
    <div className={`dashboard-scroll-container${sub ? ' dashboard-scroll-container--sub' : ''}`}>
      <div className={`dashboard-inner-container${sub ? ' dashboard-inner-container--sub' : ''}`}>
        {children}
      </div>

      {notice && (
        <div
          className={`dash-toast dash-toast--${notice.type}`}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={onDismissNotice} aria-label="Dismiss message">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

function RoleChip({ role, company }) {
  if (role === 'general_contractor') {
    return <span className="role-chip role-chip--gc">GC hub: {company || 'General contractor'}</span>;
  }
  const chip = ROLE_CHIPS[role];
  return chip ? <span className={`role-chip role-chip--${chip.tone}`}>{chip.text}</span> : null;
}

function KpiCard({ variant, label, icon: Icon, value, sub, children }) {
  return (
    <div className={`kpi-card kpi-card--${variant}`}>
      <div className="kpi-card__head">
        <span className="kpi-card__label">{label}</span>
        {Icon && <Icon size={16} aria-hidden="true" />}
      </div>
      {children ?? <div className="kpi-number">{value}</div>}
      {sub && <div className="kpi-card__sub">{sub}</div>}
    </div>
  );
}

function ReviewQueue({ config, items, busyIds, onAction, onInspect }) {
  const { Icon, tone, title, intro, approve, reject, who } = config;
  const headingId = `queue-${tone}-title`;

  return (
    <section className={`review-queue-card review-queue-card--${tone}`} aria-labelledby={headingId}>
      <div className="review-queue__head">
        <Icon size={18} aria-hidden="true" />
        <h2 id={headingId}>
          {title} ({items.length})
        </h2>
      </div>
      <p className="review-queue__intro">{intro}</p>

      <ul className="review-queue__list">
        {items.map((p) => {
          const busy = busyIds.has(p.id);
          const owner = who(p);
          return (
            <li key={p.id} className="review-queue__item">
              <div>
                <span className="review-queue__num">#{p.item_number}</span>
                <span className="review-queue__title">{p.title}</span>
                {owner && <span className="review-queue__who">({owner})</span>}
              </div>
              <div className="review-queue__actions">
                <button
                  type="button"
                  className="btn-primary dash-btn dash-btn--sm is-green"
                  disabled={busy}
                  onClick={() => onAction(p, approve.to, approve.comment)}
                >
                  <Check size={12} aria-hidden="true" /> {approve.label}
                </button>
                <button
                  type="button"
                  className="btn-secondary dash-btn dash-btn--sm is-danger"
                  disabled={busy}
                  onClick={() => onAction(p, reject.to, reject.comment)}
                >
                  <RotateCcw size={12} aria-hidden="true" /> {reject.label}
                </button>
                <button
                  type="button"
                  className="btn-ghost dash-btn dash-btn--sm"
                  disabled={busy}
                  onClick={() => onInspect(p)}
                >
                  Inspect
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DashboardSkeleton({ sub }) {
  return (
    <div aria-busy="true" aria-label="Loading punch items">
      <div className="skeleton" style={{ height: sub ? 84 : 92 }} />
      <div className="dashboard-kpi-grid" style={{ marginTop: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 104 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 320, marginTop: 20 }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DashboardView                                                       */
/* ------------------------------------------------------------------ */

export default function DashboardView({
  project,
  sheets = [],
  currentUser,
  onSelectPinFromTable,
  onSelectSheetFromTable,
  onRefreshData
}) {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(null); // 'annotated' | 'report' | 'csv' | null
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const requestId = useRef(0);
  const noticeTimer = useRef(null);

  const role = currentUser?.role;
  const isSub = role === 'sub_contractor';
  const isGc = role === 'general_contractor';
  const isAdmin = role === 'admin';

  /* ---- notices ---- */
  const notify = useCallback((type, text) => {
    clearTimeout(noticeTimer.current);
    setNotice({ type, text });
    noticeTimer.current = setTimeout(() => setNotice(null), type === 'error' ? 7000 : 3500);
  }, []);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  /* ---- data loading (ignores stale responses when project changes) ---- */
  const loadProjectPins = useCallback(
    async ({ silent = false } = {}) => {
      if (!project?.id) {
        setPins([]);
        setLoading(false);
        return;
      }
      const id = ++requestId.current;
      try {
        if (!silent) setLoading(true);
        setError(null);
        const data = await api.getAllProjectPins(project.id);
        if (id === requestId.current) setPins(Array.isArray(data) ? data : []);
      } catch (err) {
        if (id === requestId.current) setError(err.message || 'Could not load punch items.');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [project?.id]
  );

  useEffect(() => {
    setPins([]); // never show the previous project's items
  }, [project?.id]);

  useEffect(() => {
    loadProjectPins();
    return () => {
      requestId.current += 1; // invalidate any in-flight request
    };
  }, [loadProjectPins]);

  /* ---- derived data ---- */
  const sheetById = useMemo(() => new Map(sheets.map((s) => [s.id, s])), [sheets]);

  const { counts, gcQueue, adminQueue } = useMemo(() => {
    const c = { total: pins.length, open: 0, inProgress: 0, gcReview: 0, adminReview: 0, closed: 0, critical: 0 };
    const gc = [];
    const admin = [];
    for (const p of pins) {
      if (OPEN_STATUSES.includes(p.status)) c.open += 1;
      else if (p.status === 'in_progress') c.inProgress += 1;
      else if (p.status === 'submitted_for_contractor_review') {
        c.gcReview += 1;
        gc.push(p);
      } else if (p.status === 'submitted_for_admin_review') {
        c.adminReview += 1;
        admin.push(p);
      } else if (p.status === 'closed') c.closed += 1;

      if (p.priority === 'critical' && p.status !== 'closed') c.critical += 1;
    }
    c.inReview = c.gcReview + c.adminReview;
    c.resolutionRate = c.total ? Math.round((c.closed / c.total) * 100) : 0;
    return { counts: c, gcQueue: gc, adminQueue: admin };
  }, [pins]);

  const filteredPins = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return pins.filter((p) => {
      // "open" in the dropdown means open + assigned (the count shown includes both)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' ? OPEN_STATUSES.includes(p.status) : p.status === statusFilter);
      if (!matchesStatus) return false;
      if (disciplineFilter !== 'all' && p.discipline !== disciplineFilter) return false;
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false;
      if (!needle) return true;

      return (
        [p.title, p.description, p.room_location, p.assigned_to_company, p.assigned_subcontractor_name]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(needle)) || String(p.item_number).includes(needle)
      );
    });
  }, [pins, search, statusFilter, disciplineFilter, priorityFilter]);

  /* ---- actions ---- */
  const handleQuickStatusUpdate = async (pin, nextStatus, comment = '') => {
    if (busyIds.has(pin.id)) return;
    setBusyIds((prev) => new Set(prev).add(pin.id));
    try {
      await api.updatePinStatus(pin.id, nextStatus, comment);
      await loadProjectPins({ silent: true });
      if (onRefreshData) onRefreshData();
      notify('success', `Item #${pin.item_number} moved to ${formatStatus(nextStatus)}.`);
    } catch (err) {
      notify('error', err.message || `Could not update item #${pin.item_number}.`);
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(pin.id);
        return next;
      });
    }
  };

  // The JWT is sent in the Authorization header only; never put it in the URL.
  const downloadExport = async (key, path, filename) => {
    if (exporting) return;
    const token = getToken();
    if (!token) {
      notify('error', 'Your session has expired. Sign in again to export.');
      return;
    }
    setExporting(key);
    try {
      const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
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
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      notify('error', `Export error: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  const code = project?.code || 'PRJ';
  const exportAnnotatedPdf = () =>
    downloadExport('annotated', `/api/projects/${project.id}/export/annotated-pdf`, `${code}_Annotated_PlanSet.pdf`);
  const exportPunchReport = () =>
    downloadExport('report', `/api/projects/${project.id}/export/punch-report`, `${code}_PunchList_Report.pdf`);
  const exportCsv = () =>
    downloadExport('csv', `/api/projects/${project.id}/export/csv`, `${code}_PunchList.csv`);

  const shellProps = { sub: isSub, notice, onDismissNotice: () => setNotice(null) };

  const errorBanner = error && (
    <div className="dash-banner dash-banner--error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{error}</span>
      <button type="button" className="btn-secondary dash-btn dash-btn--sm" onClick={() => loadProjectPins()}>
        <RefreshCw size={12} aria-hidden="true" /> Retry
      </button>
    </div>
  );

  if (loading && pins.length === 0 && !error) {
    return (
      <Shell {...shellProps}>
        <DashboardSkeleton sub={isSub} />
      </Shell>
    );
  }

  /* ================================================================ */
  /* 1. Subcontractor view: tablet-first "my work" queue              */
  /* ================================================================ */
  if (isSub) {
    return (
      <Shell {...shellProps}>
        {errorBanner}

        <div className="dashboard-header-banner dashboard-header-banner--sub">
          <div className="sub-banner">
            <div className="sub-banner__icon">
              <Wrench size={22} aria-hidden="true" />
            </div>
            <div>
              <div className="sub-banner__title-row">
                <h1>My work assignments</h1>
                {currentUser?.company && <span className="role-chip role-chip--sub">{currentUser.company}</span>}
              </div>
              <div className="sub-banner__meta">
                Project: <strong>{project?.name}</strong> · Tap an item to review details, upload photos, or submit
                work.
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-kpi-grid">
          <KpiCard variant="sub-total" label="Total assigned" value={counts.total} />
          <KpiCard variant="sub-progress" label="In progress" value={counts.inProgress} />
          <KpiCard variant="sub-review" label="Awaiting GC review" value={counts.gcReview} />
          <KpiCard variant="sub-closed" label="Closed & approved" value={counts.closed} />
        </div>

        <section className="task-list" aria-labelledby="assigned-tasks-title">
          <h2 id="assigned-tasks-title" className="task-list__title">
            Assigned tasks ({pins.length})
          </h2>

          {pins.length > 0 ? (
            pins.map((p) => {
              const sheet = sheetById.get(p.sheet_id);
              const busy = busyIds.has(p.id);
              return (
                <article key={p.id} className="subcontractor-task-card">
                  <div className="task-card__body">
                    <div className="task-card__top">
                      <span className="task-card__num">#{p.item_number}</span>
                      <span className={`badge-priority ${p.priority || 'medium'}`}>{p.priority || 'medium'}</span>
                      <span className={`badge-status ${p.status}`}>{formatStatus(p.status)}</span>
                      {p.due_date && (
                        <span className="task-meta">
                          <Calendar size={12} aria-hidden="true" /> Due: {p.due_date}
                        </span>
                      )}
                    </div>

                    <div className="task-card__title">{p.title}</div>
                    {p.description && <div className="task-card__desc">{p.description}</div>}

                    <div className="task-card__meta">
                      <span className="task-meta">
                        <MapPin size={13} aria-hidden="true" /> Location:{' '}
                        <strong>{p.room_location || 'Field site'}</strong>
                      </span>
                      {(p.sheet_number || sheet?.sheet_number) && (
                        <span className="task-meta">
                          <Ruler size={13} aria-hidden="true" /> Sheet:{' '}
                          <strong>{p.sheet_number || sheet?.sheet_number}</strong>
                        </span>
                      )}
                      {p.photo_count > 0 && (
                        <span className="task-meta">
                          <Camera size={13} aria-hidden="true" /> <strong>{p.photo_count} photo(s)</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="task-card__actions">
                    {OPEN_STATUSES.includes(p.status) && (
                      <button
                        type="button"
                        className="btn-primary dash-btn dash-btn--md is-blue"
                        disabled={busy}
                        onClick={() => handleQuickStatusUpdate(p, 'in_progress', 'Started on-site work')}
                      >
                        <ArrowRight size={14} aria-hidden="true" /> Start work
                      </button>
                    )}

                    {p.status === 'in_progress' && (
                      <button
                        type="button"
                        className="btn-primary dash-btn dash-btn--md is-amber"
                        onClick={() => onSelectPinFromTable(p)}
                      >
                        <Check size={14} aria-hidden="true" /> Complete & submit
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-secondary dash-btn dash-btn--md"
                      disabled={!sheet}
                      onClick={() => sheet && onSelectSheetFromTable(sheet, p)}
                    >
                      <ExternalLink size={13} aria-hidden="true" /> View on plan
                    </button>

                    <button
                      type="button"
                      className="btn-ghost dash-btn dash-btn--md is-brown"
                      onClick={() => onSelectPinFromTable(p)}
                    >
                      Details & comments <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="dash-empty">No active work items are assigned to your company.</div>
          )}
        </section>
      </Shell>
    );
  }

  /* ================================================================ */
  /* 2. General contractor, admin and read-only roles                 */
  /* ================================================================ */
  const metaParts = [
    project?.address,
    project?.contractor_company_name && (
      <>
        Assigned GC: <strong>{project.contractor_company_name}</strong>
      </>
    ),
    project?.target_completion && (
      <>
        Target completion: <strong>{project.target_completion}</strong>
      </>
    )
  ].filter(Boolean);

  return (
    <Shell {...shellProps}>
      {errorBanner}

      {/* Project header and exports */}
      <div className="dashboard-header-banner">
        <div>
          <div className="banner-title-row">
            <h1>{project?.name}</h1>
            {project?.code && <span className="project-code">{project.code}</span>}
            <RoleChip role={role} company={currentUser?.company} />
          </div>
          {metaParts.length > 0 && (
            <div className="banner-meta">
              {metaParts.map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && ' · '}
                  {part}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-export-group">
          <button
            type="button"
            className="btn-brown dash-btn dash-btn--export"
            onClick={exportAnnotatedPdf}
            disabled={!!exporting}
            aria-busy={exporting === 'annotated'}
            title="Download the full plan set with pins and markups burned in"
          >
            <Layers size={15} color="#FEF3C7" aria-hidden="true" />
            {exporting === 'annotated' ? 'Preparing…' : 'Annotated plan set (PDF)'}
          </button>
          <button
            type="button"
            className="btn-secondary dash-btn dash-btn--export is-amber-outline"
            onClick={exportPunchReport}
            disabled={!!exporting}
            aria-busy={exporting === 'report'}
            title="Download the punch list summary PDF with photos and assignees"
          >
            <FileText size={15} color="#D97706" aria-hidden="true" />
            {exporting === 'report' ? 'Preparing…' : 'Punch report (PDF)'}
          </button>
          <button
            type="button"
            className="btn-secondary dash-btn dash-btn--export"
            onClick={exportCsv}
            disabled={!!exporting}
            aria-busy={exporting === 'csv'}
            title="Download as a CSV spreadsheet"
          >
            <FileSpreadsheet size={15} color="#18181B" aria-hidden="true" />
            {exporting === 'csv' ? 'Preparing…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Review queues (only the role that can act on them sees the buttons) */}
      {isGc && gcQueue.length > 0 && (
        <ReviewQueue
          config={QUEUES.gc}
          items={gcQueue}
          busyIds={busyIds}
          onAction={handleQuickStatusUpdate}
          onInspect={onSelectPinFromTable}
        />
      )}
      {isAdmin && adminQueue.length > 0 && (
        <ReviewQueue
          config={QUEUES.admin}
          items={adminQueue}
          busyIds={busyIds}
          onAction={handleQuickStatusUpdate}
          onInspect={onSelectPinFromTable}
        />
      )}

      {/* KPIs */}
      <div className="dashboard-kpi-grid">
        <KpiCard variant="resolution" label="Resolution rate" icon={TrendingUp}>
          <div className="kpi-card__rate">
            <span className="kpi-number">{counts.resolutionRate}%</span>
            <span className="kpi-card__muted">
              ({counts.closed} of {counts.total} closed)
            </span>
          </div>
          <div
            className="kpi-progress"
            role="progressbar"
            aria-label="Resolution rate"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={counts.resolutionRate}
          >
            <div className="kpi-progress__bar" style={{ width: `${counts.resolutionRate}%` }} />
          </div>
        </KpiCard>

        <KpiCard
          variant="active"
          label="Active / in progress"
          icon={Wrench}
          value={counts.open + counts.inProgress}
          sub={`${counts.open} open / ${counts.inProgress} underway`}
        />
        <KpiCard
          variant="review"
          label="In review"
          icon={Clock}
          value={counts.inReview}
          sub={`${counts.gcReview} GC / ${counts.adminReview} admin`}
        />
        <KpiCard
          variant="critical"
          label="Critical blockers"
          icon={ShieldAlert}
          value={counts.critical}
          sub="High priority / safety / code"
        />
      </div>

      {/* Master punch list */}
      <section className="dash-panel" aria-label="Punch list">
        <div className="dashboard-filter-bar">
          <div className="dashboard-search-wrap">
            <Search size={15} className="dashboard-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="dashboard-search-input"
              placeholder="Search title, location, trade, sub…"
              aria-label="Search punch items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="dashboard-filter-dropdowns">
            <select
              className="dashboard-filter-select"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses ({counts.total})</option>
              <option value="open">Open / assigned ({counts.open})</option>
              <option value="in_progress">In progress ({counts.inProgress})</option>
              <option value="submitted_for_contractor_review">GC review ({counts.gcReview})</option>
              <option value="submitted_for_admin_review">Admin review ({counts.adminReview})</option>
              <option value="closed">Closed ({counts.closed})</option>
            </select>

            <select
              className="dashboard-filter-select"
              aria-label="Filter by trade or discipline"
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
            >
              <option value="all">All trades / disciplines</option>
              {DISCIPLINES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="dashboard-filter-select"
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All priorities</option>
              <option value="critical">Critical only</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="dashboard-table-container" tabIndex={0} role="region" aria-label="Punch items table">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Status</th>
                <th scope="col">Issue & notes</th>
                <th scope="col">Sheet / location</th>
                <th scope="col">Trade</th>
                <th scope="col">Contractor / subcontractor</th>
                <th scope="col">Due date</th>
                <th scope="col">Priority</th>
                <th scope="col" className="is-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPins.length > 0 ? (
                filteredPins.map((p) => {
                  const sheet = sheetById.get(p.sheet_id);
                  const sheetLabel = p.sheet_number || sheet?.sheet_number;
                  return (
                    <tr key={p.id}>
                      <td className="cell-num">#{p.item_number}</td>

                      <td>
                        <span className={`badge-status ${p.status}`}>{formatStatus(p.status)}</span>
                      </td>

                      <td className="col-issue">
                        <button type="button" className="link-cell" onClick={() => onSelectPinFromTable(p)}>
                          <span className="link-cell__title">
                            {p.title}
                            {p.photo_count > 0 && (
                              <span className="count-chip count-chip--photo">
                                <Camera size={10} aria-hidden="true" /> {p.photo_count}
                                <span className="sr-only"> photos</span>
                              </span>
                            )}
                            {p.comment_count > 0 && (
                              <span className="count-chip count-chip--comment">
                                <MessageSquare size={10} aria-hidden="true" /> {p.comment_count}
                                <span className="sr-only"> comments</span>
                              </span>
                            )}
                          </span>
                          {p.description && <span className="link-cell__desc">{p.description}</span>}
                        </button>
                      </td>

                      <td>
                        {sheetLabel &&
                          (sheet ? (
                            <button
                              type="button"
                              className="sheet-link"
                              onClick={() => onSelectSheetFromTable(sheet, p)}
                              title="Open this sheet"
                            >
                              {sheetLabel} <ExternalLink size={12} aria-hidden="true" />
                            </button>
                          ) : (
                            <span className="sheet-link is-static">{sheetLabel}</span>
                          ))}
                        <div className="cell-sub">{p.room_location || 'Site general'}</div>
                      </td>

                      <td>
                        <span className="cell-trade">{p.discipline}</span>
                      </td>

                      <td>
                        <div className="cell-strong">{p.assigned_contractor_name || 'Unassigned'}</div>
                        {p.assigned_subcontractor_name && (
                          <div className="cell-sub cell-sub--amber">↳ {p.assigned_subcontractor_name}</div>
                        )}
                      </td>

                      <td className="cell-date">{p.due_date || 'No deadline'}</td>

                      <td>
                        <span className={`badge-priority ${p.priority || 'medium'}`}>{p.priority || 'medium'}</span>
                      </td>

                      <td className="is-right">
                        <button
                          type="button"
                          className="btn-secondary dash-btn dash-btn--row"
                          onClick={() => onSelectPinFromTable(p)}
                        >
                          Inspect <ChevronRight size={13} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="table-empty">
                    {pins.length === 0
                      ? 'No punch items yet for this project.'
                      : 'No punch list items match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}

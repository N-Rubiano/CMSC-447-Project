import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Upload,
  AlertOctagon,
  Clock,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  ArrowUpRight,
  Check,
  UserCheck,
  Building2,
  Calendar,
  Sparkles,
  History,
  Activity,
  FileUp,
  FolderKanban,
  UserPlus,
  ClipboardList
} from 'lucide-react';
import { TRADES } from '../data/mockData';

export default function Dashboard({
  project,
  building,
  floor,
  punchItems,
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

  // Calculate KPI stats
  const totalPunches = punchItems.length;
  const openPunches = punchItems.filter(p => p.status === 'Open').length;
  const criticalPunches = punchItems.filter(p => p.priority === 'Critical' && p.status !== 'Resolved').length;
  const reviewPunches = punchItems.filter(p => p.status === 'In Review').length;
  const resolvedPunches = punchItems.filter(p => p.status === 'Resolved').length;
  const resolutionRate = totalPunches > 0 ? Math.round((resolvedPunches / totalPunches) * 100) : 0;

  // Filter punch list
  const filteredPunches = punchItems.filter(item => {
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.assignee.toLowerCase().includes(q) ||
        item.gridLocation.toLowerCase().includes(q) ||
        item.trade.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate counts by trade
  const tradeCounts = Object.keys(TRADES).map(tradeKey => {
    const count = punchItems.filter(p => p.trade === tradeKey && p.status !== 'Resolved').length;
    return {
      ...TRADES[tradeKey],
      count
    };
  }).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

  const maxTradeCount = Math.max(...tradeCounts.map(t => t.count), 1);

  // Review queue
  const reviewQueue = punchItems.filter(p => p.status === 'In Review');

  // Recent activity feed — derived from actual punch item histories
  const recentActivities = punchItems
    .flatMap(p => (p.history || []).map(h => ({ ...h, trade: p.trade, punchId: p.id })))
    .slice(-6)
    .reverse();

  // -------------------------------------------------------------
  // REAL-TIME AUDIT LOGS (100% LIVE, ZERO HARDCODED ITEMS)
  // Derived directly from real-time events, socket notifications, and user actions
  // -------------------------------------------------------------
  const [logCategory, setLogCategory] = useState('All');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // 100% Real-time audit logs: auditLogs (from live user actions & WebSockets)
  const allRealtimeLogs = auditLogs || [];

  const filteredLogs = allRealtimeLogs.filter(item => {
    if (logCategory !== 'All' && item.category !== logCategory) return false;
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase().trim();
      return (
        item.action?.toLowerCase().includes(q) ||
        item.details?.toLowerCase().includes(q) ||
        item.actor?.toLowerCase().includes(q) ||
        item.target?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '24px 28px',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }}>
      {/* -------------------------------------------------------------
          HEADER & BREADCRUMBS
          ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span>{project?.name || '—'}</span>
            {selectedBuilding && <><span>·</span><span style={{ fontWeight: 800 }}>{selectedBuilding.name}</span></>}
            {selectedFloor && <><span>·</span><span style={{ color: 'var(--amber)', fontWeight: 800 }}>Floor: {selectedFloor}</span></>}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>
            Field Dashboard
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onOpenBlueprint}
            className="btn btn-ghost"
            style={{ height: 40 }}
          >
            <Layers size={17} color="var(--timber)" />
            <span>Open Blueprint</span>
          </button>

          <button
            onClick={onUploadBlueprint}
            className="btn btn-ghost"
            style={{ height: 40 }}
          >
            <Upload size={17} color="var(--timber)" />
            <span>Add Blueprint</span>
          </button>

          <button
            onClick={onNewPunch}
            className="btn btn-primary"
            style={{ height: 40 }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>New Punch</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          4 KPI CARDS
          ------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16
      }}>
        {/* KPI 1: Open Punches */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Open Punches</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--ink)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {openPunches}
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'var(--status-open-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-open)'
            }}>
              <AlertOctagon size={22} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <span style={{ color: '#16A34A', fontWeight: 700 }}>↓ 2</span> vs last inspection walk
          </div>
          <div style={{ width: '100%', height: 4, backgroundColor: '#E4E4E7', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${(openPunches / totalPunches) * 100}%`, height: '100%', backgroundColor: 'var(--status-open)' }} />
          </div>
        </div>

        {/* KPI 2: Critical / Overdue (Crimson-Tinted) */}
        <div className="card" style={{
          padding: '20px 22px',
          backgroundColor: '#FFF5F5',
          border: '1.5px solid var(--crimson-border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--crimson)' }}>Critical / Overdue</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--crimson)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {criticalPunches}
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'var(--crimson-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--crimson)'
            }}>
              <AlertOctagon size={22} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--crimson)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <span>⚠️ Requires life-safety clearance</span>
          </div>
          <div style={{ width: '100%', height: 4, backgroundColor: '#FECACA', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${(criticalPunches / totalPunches) * 100}%`, height: '100%', backgroundColor: 'var(--crimson)' }} />
          </div>
        </div>

        {/* KPI 3: Awaiting Review */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Awaiting Review</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--ink)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {reviewPunches}
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'var(--status-review-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-review)'
            }}>
              <Clock size={22} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <span>Ready for GC field sign-off</span>
          </div>
          <div style={{ width: '100%', height: 4, backgroundColor: '#E4E4E7', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${(reviewPunches / totalPunches) * 100}%`, height: '100%', backgroundColor: 'var(--status-review)' }} />
          </div>
        </div>

        {/* KPI 4: Resolution Rate */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Resolution Rate</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--amber)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {resolutionRate}%
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'var(--amber-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--amber)'
            }}>
              <TrendingUp size={22} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <span>{resolvedPunches} of {totalPunches} closed</span>
          </div>
          <div style={{ width: '100%', height: 4, backgroundColor: '#E4E4E7', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${resolutionRate}%`, height: '100%', backgroundColor: 'var(--amber)' }} />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          MAIN 2-COLUMN SECTION: TABLE & SIDEBAR
          ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.85fr) minmax(320px, 1fr)', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Filterable Punch Table + Logs Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <div className="card" style={{ padding: '20px 22px', overflow: 'hidden' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 18
          }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
                Field Punch Items
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {filteredPunches.length} records on active drawing sheet
              </div>
            </div>

            {/* Search filter in table */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 220 }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 11 }} />
                <input
                  type="text"
                  placeholder="Filter punch list..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: 34,
                    paddingLeft: 30,
                    paddingRight: 10,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: 12,
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Segmented Filter Control */}
          <div style={{ marginBottom: 16 }}>
            <div className="segmented-control">
              {['All', 'Open', 'In Progress', 'In Review', 'Resolved'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`segmented-item ${filterStatus === status ? 'active' : ''}`}
                >
                  {status}
                  <span style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 8,
                    background: filterStatus === status ? 'var(--surface-muted)' : 'rgba(0,0,0,0.06)'
                  }}>
                    {status === 'All' ? punchItems.length : punchItems.filter(p => p.status === status).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 10px' }}>ID</th>
                  <th style={{ padding: '10px 10px' }}>Trade</th>
                  <th style={{ padding: '10px 10px' }}>Issue & Location</th>
                  <th style={{ padding: '10px 10px' }}>Priority</th>
                  <th style={{ padding: '10px 10px' }}>Status</th>
                  <th style={{ padding: '10px 10px' }}>Assignee</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredPunches.map((p) => {
                  const tr = TRADES[p.trade] || TRADES.AC;
                  const statusClass = p.status === 'In Progress' ? 'progress' : p.status === 'In Review' ? 'review' : p.status.toLowerCase();
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPunch(p)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'background 120ms ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px 10px' }}>
                        <span className="chip-mono">{p.id}</span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          className="trade-stamp-badge sm"
                          style={{ backgroundColor: tr.color }}
                          title={tr.name}
                        >
                          {p.trade}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', maxWidth: 280 }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6, marginTop: 2 }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>Grid {p.gridLocation}</span>
                          <span>•</span>
                          <span>{p.room}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`chip chip-priority-${p.priority.toLowerCase()}`}>
                          {p.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`chip chip-status-${statusClass}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.assignee}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.company}</div>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <span className="date-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {p.dueDate}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredPunches.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No punch items match your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

          {/* -------------------------------------------------------------
              CONTAINER 2: Logs (Audit & System Event Stream)
              ------------------------------------------------------------- */}
          <div
            id="dashboard-logs-container"
            className="card"
            style={{
              padding: '20px 22px',
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <History size={18} color="var(--amber)" strokeWidth={2.4} />
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
                    Logs
                  </h2>
                  <span
                    className="chip-mono"
                    style={{
                      backgroundColor: 'var(--surface-muted)',
                      borderColor: 'var(--border)',
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    {filteredLogs.length} {filteredLogs.length === 1 ? 'event' : 'events'}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC'
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
                    Live Stream
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Real-time event stream: project creation, assignments, blueprint uploads & status changes
                </div>
              </div>

              {/* Search & Actions in logs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', width: 200 }}>
                  <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                  <input
                    type="text"
                    placeholder="Filter logs..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      height: 32,
                      paddingLeft: 30,
                      paddingRight: 10,
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      outline: 'none'
                    }}
                  />
                </div>

                {allRealtimeLogs.length > 0 && onClearLogs && (
                  <button
                    type="button"
                    onClick={onClearLogs}
                    title="Clear live log history"
                    style={{
                      height: 32,
                      padding: '0 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'all 120ms ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--crimson)';
                      e.currentTarget.style.borderColor = 'var(--crimson-border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {['All', 'Projects', 'Blueprints', 'Assignments', 'Status', 'Team'].map((cat) => {
                const isSelected = logCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLogCategory(cat)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 14,
                      fontSize: 11,
                      fontWeight: 700,
                      border: isSelected ? '1px solid var(--amber)' : '1px solid var(--border)',
                      backgroundColor: isSelected ? 'var(--amber-light)' : '#FFFFFF',
                      color: isSelected ? 'var(--amber-hover)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 120ms ease'
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Logs Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{
                    borderBottom: '1.5px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <th style={{ padding: '8px 10px' }}>Category & Action</th>
                    <th style={{ padding: '8px 10px' }}>Event Details</th>
                    <th style={{ padding: '8px 10px' }}>Target</th>
                    <th style={{ padding: '8px 10px' }}>Actor</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 100ms ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Category & Action */}
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{
                            display: 'inline-block',
                            width: 'fit-content',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            backgroundColor: log.bg,
                            color: log.color
                          }}>
                            {log.category}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                            {log.action}
                          </span>
                        </div>
                      </td>

                      {/* Event Details */}
                      <td style={{ padding: '10px', color: 'var(--ink)', maxWidth: 280 }}>
                        <div style={{ lineHeight: 1.4 }}>{log.details}</div>
                      </td>

                      {/* Target */}
                      <td style={{ padding: '10px' }}>
                        <span className="chip-mono" style={{ fontSize: 11 }}>
                          {log.target}
                        </span>
                      </td>

                      {/* Actor */}
                      <td style={{ padding: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{log.actor}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{log.actorRole}</div>
                        </div>
                      </td>

                      {/* Time */}
                      <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{log.time}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {log.timestamp}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <Activity size={28} color="var(--border)" />
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                            {logSearchQuery ? `No logs match "${logSearchQuery}"` : 'No real-time activity recorded yet'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.5 }}>
                            {logSearchQuery
                              ? 'Try adjusting your search query or selecting "All" categories.'
                              : 'Live actions such as creating punch items, updating status, uploading blueprints, or assigning trades will stream here in real time.'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Review Queue, Open By Trade, Recent Activity, User Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Review Queue with 1-click Approve button */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="eyebrow" style={{ color: 'var(--timber)' }}>Approval Queue</div>
              <span className="chip-mono">{reviewQueue.length} pending</span>
            </div>

            {reviewQueue.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviewQueue.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: 'var(--surface-muted)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="chip-mono">{item.id}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Grid {item.gridLocation}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        By {item.assignee}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApprovePunch(item.id);
                        }}
                        className="btn btn-primary"
                        style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                      >
                        <Check size={13} strokeWidth={3} />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                All contractor submissions approved.
              </div>
            )}
          </div>

          {/* Open by Trade Horizontal Bars */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--timber)' }}>
              Open Items By Trade
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tradeCounts.map((t) => {
                const pct = Math.round((t.count / maxTradeCount) * 100);
                return (
                  <div key={t.code} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="trade-stamp-badge sm" style={{ backgroundColor: t.color }}>
                          {t.code}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.name}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>
                        {t.count}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, backgroundColor: '#E4E4E7', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: t.color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--timber)' }}>
              Recent Field Activity
            </div>
            {recentActivities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {recentActivities.map((act, i) => {
                  const tr = TRADES[act.trade] || TRADES.AC;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: tr.color,
                        marginTop: 5,
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.4 }}>
                          {act.action}
                        </div>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 2 }}>
                          {act.by} • {act.punchId}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                No activity yet. Create your first punch item.
              </div>
            )}
          </div>

          {/* Signed-in User Card */}
          <div className="card" style={{ padding: '16px 18px', backgroundColor: 'var(--surface-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                style={{ width: 42, height: 42, borderRadius: '50%', border: '2px solid var(--amber)', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{currentUser?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {{
                    admin: 'Facility Administrator',
                    general_contractor: 'General Contractor',
                    sub_contractor: 'Trade Subcontractor',
                    architect: 'Architect',
                    owner: 'Owner / Client Rep',
                    field_inspector: 'Field Inspector',
                  }[currentUser?.role] || currentUser?.role}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{currentUser?.company}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

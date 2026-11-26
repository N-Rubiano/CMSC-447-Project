import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, FileText, Users, Layers, ArrowRight } from 'lucide-react';
import { TRADES } from '../data/mockData';

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

function resolveTradeInfo(item) {
  const raw = (item?.trade || item?.stamp_initials || '').toString().trim().toUpperCase();
  if (raw && TRADES[raw]) return TRADES[raw];
  const disc = (item?.discipline || '').toString().trim().toLowerCase();
  const mappedCode = DISCIPLINE_TO_TRADE[disc];
  if (mappedCode && TRADES[mappedCode]) return TRADES[mappedCode];
  if (raw) return { code: raw.slice(0, 2), name: raw, color: '#4F46E5' };
  return TRADES.AC || { code: 'AC', name: 'Architectural', color: '#4F46E5' };
}

function formatPunchId(item) {
  if (item?.item_number != null) return `#${item.item_number}`;
  const id = String(item?.id || '');
  if (id.startsWith('pin-')) return `#${id.slice(4, 10).toUpperCase()}`;
  return id || '—';
}

export default function QuickSearchModal({
  isOpen,
  onClose,
  punchItems,
  sheets,
  documents,
  teamMembers,
  onSelectPunch,
  onSelectSheet,
  onNavigateModule
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredPunches = q
    ? punchItems.filter((p) => {
        const num = p.item_number != null ? `#${p.item_number}` : '';
        return (
          (p.id || '').toLowerCase().includes(q) ||
          num.toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.assignee || '').toLowerCase().includes(q) ||
          (p.assigned_to_company || p.company || '').toLowerCase().includes(q) ||
          (p.trade || p.stamp_initials || p.discipline || '').toLowerCase().includes(q) ||
          (p.room_location || p.room || '').toLowerCase().includes(q)
        );
      })
    : punchItems.slice(0, 4);

  const filteredSheets = q
    ? sheets.filter((s) =>
        (s.sheet_number || s.number || '').toLowerCase().includes(q) ||
        (s.name || s.title || '').toLowerCase().includes(q) ||
        (s.building_name || '').toLowerCase().includes(q) ||
        (s.floor_level || '').toLowerCase().includes(q)
      )
    : sheets.slice(0, 3);

  const filteredDocs = q
    ? documents.filter((d) =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      )
    : documents.slice(0, 3);

  const filteredTeam = q
    ? teamMembers.filter((t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.role || '').toLowerCase().includes(q) ||
        (t.company || '').toLowerCase().includes(q)
      )
    : teamMembers.slice(0, 3);

  const hasAnyResults =
    filteredPunches.length > 0 ||
    filteredSheets.length > 0 ||
    filteredDocs.length > 0 ||
    filteredTeam.length > 0;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Quick search"
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{ maxWidth: 620, padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: '#FFFFFF'
        }}>
          <Search size={20} color="var(--amber)" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            aria-label="Search punch pins, drawing sheets, specs, RFIs, and team"
            placeholder="Search punch pins, drawing sheets, specs, RFIs, team..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 16,
              color: 'var(--ink)',
              fontFamily: 'var(--font-sans)',
              background: 'transparent'
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Close search"
            style={{ width: 38, height: 38 }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Results Body */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '12px 16px' }}>
          {/* Punches Section */}
          {filteredPunches.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="eyebrow" style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>
                Punch Items ({filteredPunches.length})
              </div>
              {filteredPunches.map((item) => {
                const tr = resolveTradeInfo(item);
                const prio = item.priority || 'Medium';
                const metaParts = [
                  item.gridLocation ? `Grid ${item.gridLocation}` : null,
                  item.room || item.room_location || null,
                  item.assignee || 'Unassigned',
                ].filter(Boolean);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectPunch(item);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'background 120ms ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="trade-stamp-badge sm" style={{ background: tr.color }}>
                      {tr.code}
                    </span>
                    <span className="chip-mono">{formatPunchId(item)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {metaParts.join(' • ')}
                      </div>
                    </div>
                    <span className={`chip chip-priority-${prio.toLowerCase()}`} style={{ fontSize: 10 }}>
                      {prio}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sheets Section */}
          {filteredSheets.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="eyebrow" style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>
                Drawing Sheets
              </div>
              {filteredSheets.map((s) => {
                const sheetNum = s.sheet_number || s.number || s.floor_level || 'Sheet';
                const sheetTitle =
                  s.name ||
                  s.title ||
                  [s.building_name, s.floor_level].filter(Boolean).join(' — ') ||
                  'Drawing Sheet';
                const sheetRev = s.version ? `Rev ${s.version}` : (s.revision || '');
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      onSelectSheet(s);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Layers size={18} color="var(--amber)" />
                    <span className="chip-mono">{sheetNum}</span>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sheetTitle}
                    </div>
                    {sheetRev && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{sheetRev}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Documents Section */}
          {filteredDocs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="eyebrow" style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>
                Field Documents & RFIs
              </div>
              {filteredDocs.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    onNavigateModule('documents');
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <FileText size={18} color="var(--timber)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {d.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {d.category} • {d.sheetRef}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.size}</span>
                </div>
              ))}
            </div>
          )}

          {/* Team Section */}
          {filteredTeam.length > 0 && (
            <div>
              <div className="eyebrow" style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>
                Team Members
              </div>
              {filteredTeam.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onNavigateModule('team');
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <img
                    src={m.avatar}
                    alt={m.name}
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.role} • {m.organization}</div>
                  </div>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          )}

          {!hasAnyResults && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
              No matching punch items, sheets, documents, or team members found.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{
          padding: '10px 16px',
          background: 'var(--surface-muted)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: 'var(--text-muted)'
        }}>
          <div>Press <kbd style={{ padding: '2px 5px', background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>ESC</kbd> to close</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span>PunchList Pro</span>
            <span>•</span>
            <span>Field Ops Command</span>
          </div>
        </div>
      </div>
    </div>
  );
}

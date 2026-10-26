import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, FileText, Users, Layers, ArrowRight } from 'lucide-react';
import { TRADES } from '../data/mockData';

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
    ? punchItems.filter(p => p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.assignee.toLowerCase().includes(q) || p.trade.toLowerCase().includes(q))
    : punchItems.slice(0, 4);

  const filteredSheets = q
    ? sheets.filter(s => s.number.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
    : sheets.slice(0, 3);

  const filteredDocs = q
    ? documents.filter(d => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q))
    : documents.slice(0, 3);

  const filteredTeam = q
    ? teamMembers.filter(t => t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q))
    : teamMembers.slice(0, 3);

  return (
    <div className="modal-overlay" onClick={onClose}>
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
          <Search size={20} color="var(--amber)" />
          <input
            type="text"
            autoFocus
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
            onClick={onClose}
            className="btn-icon"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} />
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
                const tr = TRADES[item.trade] || TRADES.AC;
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
                      {item.trade}
                    </span>
                    <span className="chip-mono">{item.id}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                        <span>Grid {item.gridLocation}</span>
                        <span>•</span>
                        <span>{item.assignee}</span>
                      </div>
                    </div>
                    <span className={`chip chip-priority-${item.priority.toLowerCase()}`} style={{ fontSize: 10 }}>
                      {item.priority}
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
              {filteredSheets.map((s) => (
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
                  <span className="chip-mono">{s.number}</span>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {s.title}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.revision}</span>
                </div>
              ))}
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

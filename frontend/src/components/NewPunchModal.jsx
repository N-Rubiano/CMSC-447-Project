import React, { useState } from 'react';
import { X, MapPin, HardHat, AlertOctagon, User } from 'lucide-react';
import { TRADES, TRADE_PARTNERS } from '../data/mockData';

export default function NewPunchModal({
  isOpen,
  onClose,
  onSubmit,
  activeSheet,
  initialCoords
}) {
  const [trade, setTrade] = useState('AC');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('High');
  const [room, setRoom] = useState('CORRIDOR 3-W');
  const [assigneeIndex, setAssigneeIndex] = useState(0);

  if (!isOpen) return null;

  const currentPartner = TRADE_PARTNERS[assigneeIndex] || TRADE_PARTNERS[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newPunch = {
      id: `PL-${Math.floor(1000 + Math.random() * 9000)}`,
      sheetId: activeSheet?.id || 'sheet-A301',
      sheetNumber: activeSheet?.number || 'A-301',
      title: title.trim(),
      description: description.trim() || 'Visual defect flagged during superintendent punch walk.',
      trade,
      priority,
      status: 'Open',
      x_pct: initialCoords?.x_pct || 48.0,
      y_pct: initialCoords?.y_pct || 48.0,
      gridLocation: initialCoords?.gridLocation || 'D-3',
      room: room.trim() || 'LEVEL 03',
      assignee: currentPartner.name,
      assigneeRole: 'Foreman',
      company: currentPartner.company,
      dueDate: '2026-09-28',
      createdAt: '2026-09-18T12:00:00Z',
      createdBy: 'Marcus Vance (Superintendent)',
      photos: [
        'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?auto=format&fit=crop&w=1000&q=80'
      ],
      comments: [
        { id: 'c-init', author: 'Marcus Vance', role: 'Superintendent', text: 'Created from field punch walk.', time: '2026-09-18 12:00' }
      ],
      history: [
        { action: 'Pin dropped on sheet', by: 'Marcus Vance', time: '2026-09-18 12:00' }
      ]
    };

    onSubmit(newPunch);
    onClose();
    setTitle('');
    setDescription('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
              <MapPin size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>New Punch Item</h3>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Sheet {activeSheet?.number || 'A-301'} • Grid {initialCoords?.gridLocation || 'D-3'} (X {initialCoords?.x_pct || 48.0}% · Y {initialCoords?.y_pct || 48.0}%)
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Trade Stamp Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Trade Stamp</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {Object.keys(TRADES).map((k) => {
                const tr = TRADES[k];
                const isSelected = trade === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTrade(k)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: isSelected ? `2px solid ${tr.color}` : '1px solid var(--border)',
                      backgroundColor: isSelected ? tr.bg : 'var(--surface)',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="trade-stamp-badge sm" style={{ backgroundColor: tr.color }}>
                      {k}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? tr.color : 'var(--ink)' }}>
                      {k}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Issue Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Loose fire door arm or missing drywall backing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Priority & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="select-field"
              >
                <option value="Critical">Critical (Safety/Code)</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Room / Location</label>
              <input
                type="text"
                placeholder="e.g. CONF ROOM 304"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Subcontractor Foreman Assignee */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Assign Trade Subcontractor</label>
            <select
              value={assigneeIndex}
              onChange={(e) => setAssigneeIndex(Number(e.target.value))}
              className="select-field"
            >
              {TRADE_PARTNERS.map((tp, idx) => (
                <option key={tp.id} value={idx}>
                  {tp.name} — {tp.company} [{tp.trade}]
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Description & Instructions</label>
            <textarea
              placeholder="Describe observation, required remedial work, and specs..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea-field"
              rows={3}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Drop Pin & Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

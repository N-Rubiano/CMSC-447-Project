import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { TRADES, TRADE_PARTNERS } from '../data/mockData';
import { api } from '../services/api';

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
  const [room, setRoom] = useState('');
  const defaultDeadline = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [partners, setPartners] = useState(TRADE_PARTNERS);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    async function loadContractors() {
      try {
        const team = await api.getTeam();
        if (!active || !Array.isArray(team)) return;

        const list = [];
        const seen = new Set();

        for (const u of team) {
          if (!u?.id || u.status === 'rejected' || u.status === 'suspended') continue;
          const role = (u.role || '').toLowerCase();
          if (role === 'owner') continue;
          const key = `usr:${u.id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const roleLabel =
            role === 'admin' ? 'Facility Admin' :
            role === 'general_contractor' ? 'General Contractor' :
            role === 'sub_contractor' ? 'Trade Subcontractor' :
            role.replace(/_/g, ' ');

          list.push({
            id: key,
            userId: u.id,
            companyId: u.company_id || null,
            role,
            name: u.name || u.email,
            company: u.organization || u.company || '',
            trade: u.trade ? `${roleLabel} · ${u.trade}` : roleLabel,
          });
        }

        if (list.length > 0) {
          setPartners(list);
          const defaultSub = list.find((p) => p.role === 'sub_contractor') || list[0];
          setSelectedPartnerId((prev) => prev || defaultSub.id);
        }
      } catch (err) {
        console.warn('Could not load project team members:', err);
      }
    }

    loadContractors();
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPartner = partners.find((p) => p.id === selectedPartnerId) || null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tr = TRADES[trade] || TRADES.AC;
    const resolvedRoom = room.trim() || activeSheet?.floor_level || 'Site';
    const assigneeName = currentPartner?.name || 'Unassigned';
    const assigneeCompany = currentPartner?.company || '';

    const newPunch = {
      id: `PL-${Math.floor(1000 + Math.random() * 9000)}`,
      sheetId: activeSheet?.id || 'sheet-A301',
      sheetNumber: activeSheet?.number || activeSheet?.sheet_number || 'A-101',
      title: title.trim(),
      description: description.trim() || 'Visual defect flagged during field punch walk.',
      trade,
      discipline: (tr?.name || 'Architectural').toLowerCase(),
      stamp_initials: trade,
      priority,
      status: 'Open',
      x_pct: initialCoords?.x_pct ?? 48.0,
      y_pct: initialCoords?.y_pct ?? 48.0,
      gridLocation: initialCoords?.gridLocation || 'D-3',
      room: resolvedRoom,
      room_location: resolvedRoom,
      assignee: assigneeName,
      assigned_to_user_id: currentPartner?.userId || null,
      assigned_subcontractor_id: currentPartner?.companyId || null,
      assigned_to_company: assigneeCompany,
      assigneeRole: 'Trade Subcontractor',
      company: assigneeCompany,
      dueDate: deadline || null,
      due_date: deadline || null,
      createdAt: new Date().toISOString(),
      photos: [],
      comments: [],
      history: [
        { action: 'Pin dropped on sheet', by: 'Field Inspector', time: 'Just now' }
      ]
    };

    onSubmit(newPunch);
    onClose();
    setTitle('');
    setDescription('');
    setRoom('');
    setDeadline(defaultDeadline());
  };

  const sheetContextLabel = [
    activeSheet?.building_name,
    activeSheet?.floor_level,
  ].filter(Boolean).join(' · ') || `Sheet ${activeSheet?.number || activeSheet?.sheet_number || 'Active'}`;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="New punch item"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
              <MapPin size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>New Punch Item</h3>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {sheetContextLabel} • Grid {initialCoords?.gridLocation || 'D-3'} (X {initialCoords?.x_pct ?? 48.0}% · Y {initialCoords?.y_pct ?? 48.0}%)
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close new punch modal" style={{ width: 38, height: 38 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Trade Stamp Dropdown */}
          <div>
            <label htmlFor="new-punch-trade" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Trade Stamp
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                className="trade-stamp-badge md"
                style={{ backgroundColor: (TRADES[trade] || TRADES.AC).color, flexShrink: 0 }}
                aria-hidden="true"
              >
                {trade}
              </span>
              <select
                id="new-punch-trade"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="select-field"
                style={{ flex: 1 }}
              >
                {Object.keys(TRADES).map((k) => {
                  const tr = TRADES[k];
                  return (
                    <option key={k} value={k}>
                      {k} — {tr.name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="new-punch-title" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Issue Title
              <span className="required-asterisk" aria-hidden="true">*</span>
            </label>
            <input
              id="new-punch-title"
              type="text"
              required
              placeholder="e.g. Loose fire door arm or missing drywall backing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Priority & Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="new-punch-priority" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Priority
              </label>
              <select
                id="new-punch-priority"
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
              <label htmlFor="new-punch-deadline" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Deadline
              </label>
              <input
                id="new-punch-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Room / Location */}
          <div>
            <label htmlFor="new-punch-room" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Room / Location
            </label>
            <input
              id="new-punch-room"
              type="text"
              placeholder="eg: CORRIDOR 3-W"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Subcontractor Foreman Assignee */}
          <div>
            <label htmlFor="new-punch-assignee" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Assign Trade Subcontractor
            </label>
            <select
              id="new-punch-assignee"
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="select-field"
            >
              <option value="">Unassigned (Assign Later)</option>
              {partners.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.name}{tp.company && tp.company !== tp.name ? ` — ${tp.company}` : ''} [{tp.trade}]
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="new-punch-description" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Description &amp; Instructions
            </label>
            <textarea
              id="new-punch-description"
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
              Drop Pin &amp; Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

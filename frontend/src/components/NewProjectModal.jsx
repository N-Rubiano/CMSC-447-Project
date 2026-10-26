import React, { useState } from 'react';
import { X, Building2, Plus } from 'lucide-react';
import { api } from '../services/api';

export default function NewProjectModal({ users = [], onClose, onProjectCreated }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [targetCompletion, setTargetCompletion] = useState('');
  const [gcUserId, setGcUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const gcs = users.filter(u => u.role === 'general_contractor' || u.role === 'admin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError('');
    try {
      const created = await api.createProject({
        name: name.trim(),
        code: code.trim() || 'PRJ',
        address: address.trim(),
        client_name: clientName.trim(),
        description: description.trim(),
        target_completion: targetCompletion || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        gc_user_id: gcUserId || (gcs.length > 0 ? gcs[0].id : 'usr-1')
      });
      onProjectCreated(created);
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err.message || 'Failed to create project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ width: 520, maxWidth: '95vw', backgroundColor: '#FFFFFF' }}>
        <div style={{
          padding: '18px 24px',
          backgroundColor: 'var(--bg-surface-2)',
          borderBottom: '1.5px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 900, color: 'var(--text-main)' }}>
            <Building2 size={18} color="#5C3A21" /> Create New Construction Project
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 6, color: '#18181B' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Bayview Medical Pavilion"
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
              Assigned General Contractor (GC) *
            </label>
            <select
              value={gcUserId}
              onChange={(e) => setGcUserId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: 13,
                fontWeight: 700,
                outline: 'none'
              }}
            >
              <option value="">-- Select General Contractor --</option>
              {gcs.map((gc) => (
                <option key={gc.id} value={gc.id}>
                  {gc.name} ({gc.company})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                Project Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. BMP-2026"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontSize: 13,
                  fontWeight: 700,
                  outline: 'none',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                Target Completion
              </label>
              <input
                type="date"
                value={targetCompletion}
                onChange={(e) => setTargetCompletion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontSize: 13,
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
              Site Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 500 Waterfront Way, Seattle, WA"
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
              Client / Developer
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Cascade Health Ventures"
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#FEE2E2',
              border: '1.5px solid #FCA5A5',
              borderRadius: 'var(--radius-md)',
              color: '#991B1B',
              fontSize: 13,
              fontWeight: 600
            }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ fontWeight: 700 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim()} className="btn-brown" style={{ fontWeight: 800 }}>
              <Plus size={15} color="#FEF3C7" /> Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

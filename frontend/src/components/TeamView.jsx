import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  HardHat,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Phone,
  Mail,
  Wrench,
  CheckCircle,
  AlertCircle,
  X,
  Save
} from 'lucide-react';
import { api } from '../services/api';
import './TeamView.css';

export default function TeamView({
  project,
  currentUser,
  onRefresh
}) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('contractor'); // 'contractor' | 'subcontractor'
  const [editingCompany, setEditingCompany] = useState(null); // null = add, object = edit

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    trade: '',
    parent_contractor_id: ''
  });

  const isAdminOrGc = currentUser?.role === 'admin' || currentUser?.role === 'general_contractor';

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await api.getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // Separate Contractors and Subcontractors
  const contractors = companies.filter(c => c.type === 'contractor' || c.type === 'admin');
  const subcontractors = companies.filter(c => c.type === 'subcontractor');

  const handleOpenAdd = (type) => {
    if (!isAdminOrGc) {
      alert('Only administrators and general contractors can manage project participants.');
      return;
    }
    setModalType(type);
    setEditingCompany(null);
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      trade: type === 'subcontractor' ? 'Electrical' : 'General Construction',
      parent_contractor_id: contractors[0]?.id || ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (company) => {
    if (!isAdminOrGc) {
      alert('Only administrators and general contractors can manage project participants.');
      return;
    }
    setModalType(company.type || 'contractor');
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      contact_person: company.contact_person || '',
      email: company.email || '',
      phone: company.phone || '',
      trade: company.trade || '',
      parent_contractor_id: company.parent_contractor_id || ''
    });
    setModalOpen(true);
  };

  const handleRemove = async (company) => {
    if (!isAdminOrGc) {
      alert('Only administrators can remove project participants.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${company.name} from the project?`)) {
      return;
    }
    try {
      await api.deleteCompany(company.id);
      await loadCompanies();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error removing company:', err);
      alert('Failed to remove company: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Company name is required');
      return;
    }

    try {
      if (editingCompany) {
        // Update
        await api.updateCompany(editingCompany.id, {
          ...formData,
          type: modalType
        });
      } else {
        // Create
        await api.createCompany({
          ...formData,
          type: modalType
        });
      }
      setModalOpen(false);
      await loadCompanies();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving company:', err);
      alert('Failed to save company: ' + err.message);
    }
  };

  return (
    <div className="team-view-container">
      {/* Header */}
      <div className="team-view-header">
        <div className="team-view-title">
          <h1>
            <Users size={26} color="#D97706" />
            Project Team & Participant Management
          </h1>
          <div className="team-view-subtitle">
            Manage General Contractors, Trade Subcontractors, contacts, and access permissions across the project.
          </div>
        </div>

        {!isAdminOrGc && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: 6,
            color: '#92400E',
            fontSize: 12,
            fontWeight: 700
          }}>
            <Shield size={14} color="#D97706" />
            <span>Read-Only: Administrator permissions required to edit team</span>
          </div>
        )}
      </div>

      {/* Main Grid: Contractors & Subcontractors side-by-side */}
      <div className="team-sections-grid">
        {/* CONTRACTORS SECTION */}
        <div className="team-section-card">
          <div className="team-section-header">
            <h2>
              <Building2 size={20} color="#5C3A21" />
              Contractors ({contractors.length})
            </h2>
          </div>

          <div className="team-list">
            {contractors.map((c) => (
              <div key={c.id} className="team-entry-row">
                <div>
                  <div className="team-entry-name">
                    <span>{c.name}</span>
                    {c.type === 'admin' && (
                      <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', fontWeight: 800 }}>
                        PRIMARY GC / ADMIN
                      </span>
                    )}
                  </div>
                  <div className="team-entry-details">
                    {c.contact_person && <span>Contact: {c.contact_person}</span>}
                    {c.phone && <span>• {c.phone}</span>}
                    {c.email && <span>• {c.email}</span>}
                  </div>
                </div>

                {isAdminOrGc && (
                  <div className="team-action-buttons">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="team-btn-edit"
                      title="Edit contractor details"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    {c.type !== 'admin' && (
                      <button
                        onClick={() => handleRemove(c)}
                        className="team-btn-remove"
                        title="Remove contractor"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAdminOrGc && (
            <button
              onClick={() => handleOpenAdd('contractor')}
              className="team-btn-add"
            >
              <Plus size={15} /> Add Contractor
            </button>
          )}
        </div>

        {/* SUBCONTRACTORS SECTION */}
        <div className="team-section-card">
          <div className="team-section-header">
            <h2>
              <HardHat size={20} color="#D97706" />
              Subcontractors ({subcontractors.length})
            </h2>
          </div>

          <div className="team-list">
            {subcontractors.map((sub) => {
              const parentContractor = contractors.find(c => c.id === sub.parent_contractor_id);
              return (
                <div key={sub.id} className="team-entry-row">
                  <div>
                    <div className="team-entry-name">
                      <span>{sub.name}</span>
                      {sub.trade && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 800 }}>
                          {sub.trade.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="team-entry-details">
                      {parentContractor && <span>Contractor: {parentContractor.name}</span>}
                      {sub.contact_person && <span>• Contact: {sub.contact_person}</span>}
                      {sub.phone && <span>• {sub.phone}</span>}
                    </div>
                  </div>

                  {isAdminOrGc && (
                    <div className="team-action-buttons">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="team-btn-edit"
                        title="Edit subcontractor details"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleRemove(sub)}
                        className="team-btn-remove"
                        title="Remove subcontractor"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isAdminOrGc && (
            <button
              onClick={() => handleOpenAdd('subcontractor')}
              className="team-btn-add"
            >
              <Plus size={15} /> Add Subcontractor
            </button>
          )}
        </div>
      </div>

      {/* Modal for Add / Edit */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480, width: '92%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1.5px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 16, color: '#1C1917' }}>
                {modalType === 'contractor' ? <Building2 size={20} color="#5C3A21" /> : <HardHat size={20} color="#D97706" />}
                <span>
                  {editingCompany ? `Edit ${editingCompany.name}` : `Add New ${modalType === 'contractor' ? 'Contractor' : 'Subcontractor'}`}
                </span>
              </div>
              <button onClick={() => setModalOpen(false)} className="btn-ghost" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div className="team-modal-field">
                <label>Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder={modalType === 'contractor' ? 'e.g. ABC Construction Corp' : 'e.g. Metro Electrical Team'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {modalType === 'subcontractor' && (
                <>
                  <div className="team-modal-field">
                    <label>Trade / Discipline</label>
                    <select
                      value={formData.trade}
                      onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                    >
                      <option value="Electrical">Electrical</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="HVAC">HVAC / Mechanical</option>
                      <option value="Drywall">Drywall & Framing</option>
                      <option value="Concrete">Concrete & Masonry</option>
                      <option value="Painting">Painting & Finishes</option>
                      <option value="Architectural">Architectural / Millwork</option>
                      <option value="Fire Protection">Fire Protection</option>
                      <option value="Other">Other Specialty</option>
                    </select>
                  </div>

                  <div className="team-modal-field">
                    <label>Supervising General Contractor</label>
                    <select
                      value={formData.parent_contractor_id}
                      onChange={(e) => setFormData({ ...formData, parent_contractor_id: e.target.value })}
                    >
                      <option value="">-- Select Supervising Contractor --</option>
                      {contractors.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="team-modal-field">
                <label>Primary Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="team-modal-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="contact@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="team-modal-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-ghost"
                  style={{ padding: '8px 16px', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontWeight: 800, backgroundColor: '#5C3A21' }}
                >
                  <Save size={14} /> {editingCompany ? 'Save Changes' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

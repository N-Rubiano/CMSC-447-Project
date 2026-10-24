import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Shield, HardHat, Wrench, Trash2, CheckCircle2, UserCheck, Layers, Building2 } from 'lucide-react';
import { api } from '../services/api';

const ROLE_DISPLAY = {
  admin: { label: 'Facility Administrator', icon: Shield, color: '#DC2626', bg: '#FEE2E2' },
  general_contractor: { label: 'General Contractor', icon: HardHat, color: '#D97706', bg: '#FFFBEB' },
  sub_contractor: { label: 'Trade Subcontractor', icon: Wrench, color: '#4B5563', bg: '#F4F4F5' },
  architect: { label: 'Architect', icon: Layers, color: '#2563EB', bg: '#DBEAFE' },
  owner: { label: 'Owner / Client Rep', icon: Building2, color: '#059669', bg: '#D1FAE5' },
  field_inspector: { label: 'Field Inspector', icon: CheckCircle2, color: '#EA580C', bg: '#FFEDD5' }
};

export default function ProjectTeamModal({ project, currentUser, allUsers, onClose, onProjectUpdated }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGcId, setSelectedGcId] = useState(project?.gc_user_id || '');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [savingGc, setSavingGc] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isGc = currentUser?.role === 'general_contractor';

  useEffect(() => {
    if (!project) return;
    loadMembers();
  }, [project?.id]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await api.getProjectMembers(project.id);
      setMembers(data);
    } catch (err) {
      console.error('Error loading project members:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter available GCs (for Admin dropdown)
  const availableGcs = allUsers.filter(u => u.role === 'general_contractor' || u.role === 'admin');

  // Filter available Subcontractors not yet in this project
  const memberUserIds = new Set(members.map(m => m.id));
  const availableSubs = allUsers.filter(u => u.role === 'sub_contractor' && !memberUserIds.has(u.id));

  // Admin assigns/changes General Contractor
  const handleAssignGc = async () => {
    if (!selectedGcId) return;
    setSavingGc(true);
    setError('');
    try {
      const updated = await api.assignProjectGc(project.id, selectedGcId);
      await loadMembers();
      if (onProjectUpdated) onProjectUpdated(updated);
    } catch (err) {
      setError(err.message || 'Failed to assign General Contractor');
    } finally {
      setSavingGc(false);
    }
  };

  // Add Subcontractor to project
  const handleAddSub = async () => {
    if (!selectedSubId) return;
    setAddingSub(true);
    setError('');
    try {
      const updatedMembers = await api.addProjectMember(project.id, selectedSubId, 'sub_contractor');
      setMembers(updatedMembers);
      setSelectedSubId('');
    } catch (err) {
      setError(err.message || 'Failed to add Subcontractor');
    } finally {
      setAddingSub(false);
    }
  };

  // Remove Subcontractor from project
  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this contractor from the project team?')) return;
    try {
      const updatedMembers = await api.removeProjectMember(project.id, userId);
      setMembers(updatedMembers);
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(24, 24, 27, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 500,
      padding: 16
    }}>
      <div style={{
        width: '100%',
        maxWidth: 580,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: '1.5px solid #DCD5C8',
        boxShadow: '0 24px 64px rgba(40, 30, 20, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #5C3A21 0%, #3E2413 100%)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: 'rgba(234, 179, 8, 0.2)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={20} color="#FEF3C7" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.3px' }}>
                Project Team & Hierarchy
              </div>
              <div style={{ fontSize: 11.5, color: '#FEF3C7', opacity: 0.9 }}>
                {project?.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 8,
              color: '#DC2626',
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 16
            }}>
              {error}
            </div>
          )}

          {/* ADMIN ONLY: General Contractor Assignment */}
          {isAdmin && (
            <div style={{
              backgroundColor: '#FFFBEB',
              border: '1.5px solid #FCD34D',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Shield size={16} color="#D97706" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Admin Control: Primary General Contractor
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#78350F', margin: '0 0 12px 0' }}>
                Assign the General Contractor responsible for overseeing this project and assigning Subcontractors.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={selectedGcId}
                  onChange={(e) => setSelectedGcId(e.target.value)}
                  style={{
                    flex: 1,
                    height: 40,
                    padding: '0 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #FCD34D',
                    borderRadius: 8,
                    color: '#18181B'
                  }}
                >
                  <option value="">-- Select General Contractor --</option>
                  {availableGcs.map((gc) => (
                    <option key={gc.id} value={gc.id}>
                      {gc.name} ({gc.company})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignGc}
                  disabled={savingGc || !selectedGcId || selectedGcId === project?.gc_user_id}
                  style={{
                    height: 40,
                    padding: '0 16px',
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: (!selectedGcId || selectedGcId === project?.gc_user_id || savingGc) ? 0.5 : 1
                  }}
                >
                  {savingGc ? 'Assigning...' : 'Assign GC'}
                </button>
              </div>
            </div>
          )}

          {/* GC ONLY: Add Subcontractor to Project */}
          {isGc && (
            <div style={{
              backgroundColor: '#FAFAF7',
              border: '1.5px solid #E8E3D9',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <UserPlus size={16} color="#5C3A21" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#5C3A21', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Assign Subcontractor to Project
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#78716C', margin: '0 0 12px 0' }}>
                Add Subcontractor trade partners to this project so they can view assigned punch items.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  style={{
                    flex: 1,
                    height: 40,
                    padding: '0 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DCD5C8',
                    borderRadius: 8,
                    color: '#18181B'
                  }}
                >
                  <option value="">-- Select Subcontractor --</option>
                  {availableSubs.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} • {sub.company}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddSub}
                  disabled={addingSub || !selectedSubId}
                  style={{
                    height: 40,
                    padding: '0 16px',
                    backgroundColor: '#5C3A21',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: (!selectedSubId || addingSub) ? 0.5 : 1
                  }}
                >
                  {addingSub ? 'Adding...' : 'Add Subcontractor'}
                </button>
              </div>
            </div>
          )}

          {/* Current Members List */}
          <div>
            <div style={{
              fontSize: 12.5,
              fontWeight: 800,
              color: '#5C3A21',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 12
            }}>
              Current Project Team ({members.length})
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#78716C', fontSize: 13 }}>
                Loading members...
              </div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#78716C', fontSize: 13 }}>
                No contractors assigned to this project yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.map((member) => {
                  const isPrimaryGc = project?.gc_user_id === member.id;
                  const roleKey = member.system_role || member.role || member.project_role || 'sub_contractor';
                  const roleConfig = ROLE_DISPLAY[roleKey] || ROLE_DISPLAY.sub_contractor;
                  const Icon = roleConfig.icon;

                  return (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        backgroundColor: isPrimaryGc ? '#FFFBEB' : '#FAFAF7',
                        border: `1px solid ${isPrimaryGc ? '#FCD34D' : '#E8E3D9'}`,
                        borderRadius: 10
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={member.avatar_url}
                          alt={member.name}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `2px solid ${roleConfig.color}`
                          }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#18181B' }}>
                              {member.name}
                            </span>
                            {isPrimaryGc && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#D97706',
                                backgroundColor: '#FEF3C7',
                                padding: '1px 6px',
                                borderRadius: 4,
                                textTransform: 'uppercase'
                              }}>
                                Primary GC
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#78716C' }}>
                            {member.company} • {member.email}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: roleConfig.color,
                          backgroundColor: roleConfig.bg,
                          padding: '3px 8px',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {roleConfig.label}
                        </span>

                        {(isAdmin || (isGc && member.system_role === 'sub_contractor')) && !isPrimaryGc && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            title="Remove contractor"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#A69882',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 6,
                              transition: 'color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#A69882'}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

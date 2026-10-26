import React, { useState, useEffect } from 'react';
import {
  Shield,
  HardHat,
  Wrench,
  Users,
  UserPlus,
  Mail,
  Phone,
  Search,
  CheckCircle2,
  Trash2,
  X,
  Building2,
  Briefcase,
  Layers,
  Plus
} from 'lucide-react';
import { TRADES } from '../data/mockData';
import { api } from '../services/api';

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetTeam, setTargetTeam] = useState('admin'); // 'admin' | 'contractor' | 'subcontractor' | 'crew'

  // Form State for Adding a Member
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    company: '',
    trade: 'DW',
    presence: 'on_site'
  });

  // Team roster organized by the 4 required categories
  const [teamMembers, setTeamMembers] = useState({
    admin: [
      {
        id: 'adm-1',
        name: 'Sarah Chen, PE',
        email: 'sarah.chen@apexconstruct.com',
        phone: '+1 (617) 555-0199',
        role: 'Project Executive & Principal Admin',
        company: 'Apex Construction Group',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        presence: 'on_site',
        presenceText: 'On site — Field Office'
      },
      {
        id: 'adm-2',
        name: 'Gregory Hughes',
        email: 'g.hughes@beaconcapital.com',
        phone: '+1 (617) 555-0377',
        role: "Owner's Representative & Director",
        company: 'Beacon Point Capital RE',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        presence: 'on_site',
        presenceText: 'On site — QA Walk'
      }
    ],
    contractor: [
      {
        id: 'cnt-1',
        name: 'Marcus Vance',
        email: 'marcus.vance@apexconstruct.com',
        phone: '+1 (617) 555-0142',
        role: 'General Contractor Superintendent',
        company: 'Apex Construction GC',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        presence: 'on_site',
        presenceText: 'On site — Level 03'
      },
      {
        id: 'cnt-2',
        name: 'Liam Harrington',
        email: 'liam.h@apexconstruct.com',
        phone: '+1 (617) 555-0183',
        role: 'Senior Project Engineer',
        company: 'Apex Construction GC',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        presence: 'away',
        presenceText: 'Away — Site Survey'
      },
      {
        id: 'cnt-3',
        name: 'Clara Oswald, AIA',
        email: 'c.oswald@studiovanguard.com',
        phone: '+1 (617) 555-0211',
        role: 'Architect of Record (GC Partner)',
        company: 'Studio Vanguard Architects',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
        presence: 'offline',
        presenceText: 'Offline'
      }
    ],
    subcontractor: [
      {
        id: 'sub-1',
        name: 'Elena Rostova',
        email: 'elena@primedrywall.com',
        phone: '+1 (617) 555-7102',
        role: 'Drywall & Framing Foreman',
        trade: 'DW',
        company: 'Prime Drywall & Doors',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        presence: 'on_site',
        presenceText: 'On site — Corridor B'
      },
      {
        id: 'sub-2',
        name: "Dave O'Connor",
        email: 'dave@beaconfire.com',
        phone: '+1 (617) 555-7101',
        role: 'Fire Suppression Subcontractor',
        trade: 'FP',
        company: 'Beacon Fire Protection & MEP',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
        presence: 'on_site',
        presenceText: 'On site — Riser Room'
      },
      {
        id: 'sub-3',
        name: 'Devon Patel',
        email: 'devon@voltline.com',
        phone: '+1 (617) 555-7103',
        role: 'Electrical Subcontractor Lead',
        trade: 'EL',
        company: 'VoltLine Electric Inc.',
        avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=200&q=80',
        presence: 'away',
        presenceText: 'Away — Shop Prefab'
      }
    ],
    crew: [
      {
        id: 'crw-1',
        name: 'Carlos Mendez',
        email: 'carlos.m@primedrywall.com',
        phone: '+1 (617) 555-8812',
        role: 'Journeyman Drywall Hanger',
        trade: 'DW',
        company: 'Prime Drywall & Doors',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        presence: 'on_site',
        presenceText: 'On site — Level 03'
      },
      {
        id: 'crw-2',
        name: 'Jake Kowalski',
        email: 'jake.k@voltline.com',
        phone: '+1 (617) 555-8843',
        role: 'Apprentice Electrician',
        trade: 'EL',
        company: 'VoltLine Electric Inc.',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80',
        presence: 'on_site',
        presenceText: 'On site — Conduits'
      },
      {
        id: 'crw-3',
        name: 'Samir Khan',
        email: 'samir.k@beaconfire.com',
        phone: '+1 (617) 555-8877',
        role: 'Pipefitter & Suppression Tech',
        trade: 'FP',
        company: 'Beacon Fire Protection & MEP',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
        presence: 'offline',
        presenceText: 'Offline'
      }
    ]
  });

  // Team configurations
  const TEAMS = [
    {
      key: 'admin',
      title: 'Admin Team',
      subtitle: 'Project directors, platform administrators, and executive owners',
      icon: Shield,
      color: '#DC2626',
      bg: '#FEE2E2',
      border: '#FCA5A5',
      defaultRole: 'Project Executive'
    },
    {
      key: 'contractor',
      title: 'Contractor Team',
      subtitle: 'General contractor management, field superintendents, and project engineers',
      icon: HardHat,
      color: '#D97706',
      bg: '#FEF3C7',
      border: '#FCD34D',
      defaultRole: 'Site Superintendent'
    },
    {
      key: 'subcontractor',
      title: 'Sub-contractor Team',
      subtitle: 'Licensed trade subcontractor partners and specialized trade foremen',
      icon: Wrench,
      color: '#2563EB',
      bg: '#DBEAFE',
      border: '#93C5FD',
      defaultRole: 'Trade Foreman'
    },
    {
      key: 'crew',
      title: 'Crew Members',
      subtitle: 'Field trade craft crews, journeymen, apprentices, and site technicians',
      icon: Users,
      color: '#16A34A',
      bg: '#DCFCE7',
      border: '#86EFAC',
      defaultRole: 'Journeyman / Field Tech'
    }
  ];

  // Open modal with specific target team pre-selected
  const handleOpenAddModal = (teamKey) => {
    setTargetTeam(teamKey);
    const cfg = TEAMS.find(t => t.key === teamKey);
    setForm({
      name: '',
      email: '',
      phone: '+1 (617) 555-',
      role: cfg?.defaultRole || '',
      company: teamKey === 'contractor' ? 'Apex Construction GC' : '',
      trade: 'DW',
      presence: 'on_site'
    });
    setIsModalOpen(true);
  };

  // Load team members from database
  useEffect(() => {
    async function fetchTeam() {
      try {
        const data = await api.getTeam();
        if (Array.isArray(data) && data.length > 0) {
          const grouped = { admin: [], contractor: [], subcontractor: [], crew: [] };
          data.forEach(m => {
            const cat = m.teamCategory === 'sub_contractor' ? 'subcontractor' : (m.teamCategory || 'crew');
            if (grouped[cat]) {
              grouped[cat].push(m);
            } else {
              grouped.crew.push(m);
            }
          });
          setTeamMembers(grouped);
        }
      } catch (err) {
        console.warn('Could not load team members from database:', err);
      }
    }
    fetchTeam();
  }, []);

  // Submit new member
  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || '+1 (617) 555-0100',
      role: form.role.trim() || 'Team Member',
      organization: form.company.trim() || (targetTeam === 'contractor' ? 'Apex Construction GC' : 'Field Operations'),
      teamCategory: targetTeam === 'subcontractor' ? 'sub_contractor' : targetTeam,
      presence: form.presence,
      presenceText: form.presence === 'on_site' ? 'On site' : form.presence === 'away' ? 'Away' : 'Offline'
    };

    let newMember = null;
    try {
      newMember = await api.addTeamMember(payload);
    } catch (err) {
      console.warn('Backend add member error, using fallback:', err);
      newMember = {
        id: `${targetTeam.slice(0, 3)}-${Date.now()}`,
        ...payload,
        company: payload.organization,
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80`
      };
    }

    setTeamMembers(prev => ({
      ...prev,
      [targetTeam]: [newMember, ...prev[targetTeam]]
    }));

    setIsModalOpen(false);
  };

  // Remove member
  const handleRemoveMember = async (teamKey, memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the database?')) return;
    try {
      await api.deleteTeamMember(memberId);
    } catch (err) {
      console.warn('Could not delete from backend database:', err);
    }
    setTeamMembers(prev => ({
      ...prev,
      [teamKey]: prev[teamKey].filter(m => m.id !== memberId)
    }));
  };

  const getPresenceDot = (presence) => {
    if (presence === 'on_site') return { color: '#16A34A', text: 'On site' };
    if (presence === 'away') return { color: '#D97706', text: 'Away' };
    return { color: '#71717A', text: 'Offline' };
  };

  // Total member counter
  const totalCount = Object.values(teamMembers).reduce((acc, list) => acc + list.length, 0);

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '28px 32px',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }}>
      {/* ── Top Header & Global Search ───────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--amber)', marginBottom: 4 }}>
            Project Directory & Roster
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Project Team & Organization
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Manage authorized project personnel across Admins, Contractors, Sub-contractors, and Crew Members.
          </p>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Search by name, role, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36, height: 38, fontSize: 13 }}
          />
        </div>
      </div>

      {/* ── 4 Dedicated Team Containers ──────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {TEAMS.map((team) => {
          const TeamIcon = team.icon;
          const allMembers = teamMembers[team.key] || [];

          // Filter by search query if present
          const filteredMembers = allMembers.filter(m => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            return (
              m.name.toLowerCase().includes(q) ||
              m.email.toLowerCase().includes(q) ||
              m.role.toLowerCase().includes(q) ||
              (m.company && m.company.toLowerCase().includes(q))
            );
          });

          return (
            <div
              key={team.key}
              id={`team-container-${team.key}`}
              className="card"
              style={{
                padding: '22px 24px',
                borderRadius: 'var(--radius-card)',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              {/* Container Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 16,
                paddingBottom: 14,
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    backgroundColor: team.bg,
                    border: `1.5px solid ${team.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TeamIcon size={20} color={team.color} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
                        {team.title}
                      </h2>
                      <span
                        className="chip-mono"
                        style={{
                          backgroundColor: team.bg,
                          color: team.color,
                          borderColor: team.border,
                          fontWeight: 700
                        }}
                      >
                        {allMembers.length} {allMembers.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {team.subtitle}
                    </div>
                  </div>
                </div>

                {/* Container Specific "+ Add Member" Button */}
                <button
                  type="button"
                  id={`btn-add-${team.key}`}
                  onClick={() => handleOpenAddModal(team.key)}
                  className="btn"
                  style={{
                    backgroundColor: team.bg,
                    color: team.color,
                    border: `1.5px solid ${team.border}`,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '8px 14px',
                    borderRadius: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    transition: 'all 120ms ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(0.95)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'none';
                  }}
                >
                  <Plus size={15} strokeWidth={2.6} />
                  <span>Add {team.title.replace(' Team', '').replace(' Members', '')}</span>
                </button>
              </div>

              {/* Members Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{
                      borderBottom: '1.5px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      <th style={{ padding: '10px 12px' }}>Name & Contact</th>
                      <th style={{ padding: '10px 12px' }}>Role / Position</th>
                      <th style={{ padding: '10px 12px' }}>Company / Organization</th>
                      { (team.key === 'subcontractor' || team.key === 'crew') && (
                        <th style={{ padding: '10px 12px' }}>Trade</th>
                      )}
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const presence = getPresenceDot(member.presence);
                      const tradeInfo = member.trade ? TRADES[member.trade] : null;

                      return (
                        <tr
                          key={member.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background 120ms ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {/* Name & Avatar */}
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <img
                                src={member.avatar}
                                alt={member.name}
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1.5px solid var(--border)'
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{member.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              display: 'inline-flex',
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: 'var(--surface-muted)',
                              color: 'var(--ink)',
                              fontSize: 12,
                              fontWeight: 600,
                              border: '1px solid var(--border)'
                            }}>
                              {member.role}
                            </span>
                          </td>

                          {/* Company */}
                          <td style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {member.company}
                          </td>

                          {/* Trade Stamp (for Subcontractor or Crew) */}
                          { (team.key === 'subcontractor' || team.key === 'crew') && (
                            <td style={{ padding: '12px' }}>
                              {tradeInfo ? (
                                <span
                                  className="trade-stamp-badge"
                                  style={{ backgroundColor: tradeInfo.color }}
                                  title={tradeInfo.name}
                                >
                                  {tradeInfo.code}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                              )}
                            </td>
                          )}

                          {/* Presence Status */}
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: presence.color }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                                {member.presenceText || presence.text}
                              </span>
                            </div>
                          </td>

                          {/* Quick Actions */}
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <a
                                href={`mailto:${member.email}`}
                                className="btn-icon"
                                style={{ width: 30, height: 30 }}
                                title={`Email ${member.name}`}
                              >
                                <Mail size={15} />
                              </a>
                              {member.phone && (
                                <a
                                  href={`tel:${member.phone}`}
                                  className="btn-icon"
                                  style={{ width: 30, height: 30 }}
                                  title={`Call ${member.phone}`}
                                >
                                  <Phone size={15} />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(team.key, member.id)}
                                className="btn-icon"
                                style={{ width: 30, height: 30, color: 'var(--crimson)' }}
                                title="Remove member"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Empty State for Container */}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td
                          colSpan={team.key === 'subcontractor' || team.key === 'crew' ? 6 : 5}
                          style={{ padding: '36px 16px', textAlign: 'center' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <Users size={30} color="var(--border)" />
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                              {searchQuery ? `No members match "${searchQuery}"` : `No ${team.title} members added yet`}
                            </div>
                            {!searchQuery && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddModal(team.key)}
                                className="btn-secondary"
                                style={{ fontSize: 12, padding: '5px 12px', marginTop: 4 }}
                              >
                                <Plus size={13} /> Add first {team.title.replace(' Team', '').replace(' Members', '')}
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
          );
        })}
      </div>

      {/* ── Add Member Modal ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 500, padding: '24px 28px', borderRadius: 12 }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>
                  Add Member to {TEAMS.find(t => t.key === targetTeam)?.title}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Configure user credentials, role attribution, and company affiliation.
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddMemberSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Target Team Selector */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                  Target Team Container
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TEAMS.map((t) => {
                    const isSelected = targetTeam === t.key;
                    return (
                      <button
                        type="button"
                        key={t.key}
                        onClick={() => {
                          setTargetTeam(t.key);
                          setForm(f => ({ ...f, role: t.defaultRole }));
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: isSelected ? `2px solid ${t.color}` : '1px solid var(--border)',
                          backgroundColor: isSelected ? t.bg : '#FFFFFF',
                          color: isSelected ? t.color : 'var(--ink)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <t.icon size={15} color={t.color} />
                        <span>{t.title.replace(' Team', '').replace(' Members', '')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Miller"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. jordan@construct.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Role & Company */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Role / Position Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Site Superintendent"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Construction GC"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Phone & Presence */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (617) 555-0100"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Initial Presence Status
                  </label>
                  <select
                    value={form.presence}
                    onChange={(e) => setForm({ ...form, presence: e.target.value })}
                    className="select-field"
                  >
                    <option value="on_site">🟢 On site</option>
                    <option value="away">🟡 Away</option>
                    <option value="offline">⚪ Offline</option>
                  </select>
                </div>
              </div>

              {/* Trade Code (for Subcontractor or Crew) */}
              {(targetTeam === 'subcontractor' || targetTeam === 'crew') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Trade Stamp Attribution
                  </label>
                  <select
                    value={form.trade}
                    onChange={(e) => setForm({ ...form, trade: e.target.value })}
                    className="select-field"
                  >
                    {Object.keys(TRADES).map(k => (
                      <option key={k} value={k}>
                        [{k}] {TRADES[k].name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                  style={{ fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: 13, padding: '8px 18px' }}
                >
                  <UserPlus size={16} /> Add to {TEAMS.find(t => t.key === targetTeam)?.title}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

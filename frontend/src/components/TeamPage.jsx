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
  Plus,
  Check,
  Ban,
  RotateCw,
  Copy,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { TRADES } from '../data/mockData';
import { api } from '../services/api';


// Canonical Project Roles Matrix
export const CANONICAL_ROLES = [
  {
    key: 'admin',
    label: 'Facility Administrator',
    title: 'Project Director, Facility Owner',
    description: 'Full System Authority: Provisions user accounts, manages sheet uploads, modifies system settings, and is the only role authorized to close or delete punch items.',
    teamCategory: 'admin',
    color: '#DC2626',
    bg: '#FEE2E2',
    border: '#FCA5A5'
  },
  {
    key: 'general_contractor',
    label: 'General Contractor',
    title: 'Project Superintendent, GC Project Manager',
    description: 'Field Coordination: Allocates items to trade subcontractors, approves or rejects subcontractor remediation submissions, and sponsors subcontractor accounts.',
    teamCategory: 'contractor',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FCD34D'
  },
  {
    key: 'sub_contractor',
    label: 'Trade Subcontractor',
    title: 'Mechanical, Electrical, Plumbing, Drywall Foremen',
    description: 'Strictly Scoped: Can only view pins assigned to their trade/company. Can transition items (Open → In Progress → Contractor Review) and upload proof photos.',
    teamCategory: 'subcontractor',
    color: '#2563EB',
    bg: '#DBEAFE',
    border: '#93C5FD'
  },
  {
    key: 'architect',
    label: 'Architect / Engineer',
    title: 'Design Team AIA, Structural Consultant',
    description: 'Specification Compliance: Drops specification discrepancy pins, reviews drawing sets, and audits punch progress.',
    teamCategory: 'admin',
    color: '#7C3AED',
    bg: '#EDE9FE',
    border: '#C4B5FD'
  },
  {
    key: 'owner',
    label: 'Owner Representative',
    title: 'Client Executive, Capital Asset Manager',
    description: 'Executive Visibility: Read-only oversight across project milestones, punch progress gauges, and formal PDF export generation.',
    teamCategory: 'admin',
    color: '#059669',
    bg: '#D1FAE5',
    border: '#6EE7B7'
  },
  {
    key: 'field_inspector',
    label: 'Field Inspector',
    title: 'Municipal Building Inspector, QA/QC Lead',
    description: 'Inspection Capture: Walks jobsite floors, anchors punch pins with photos and priority tags.',
    teamCategory: 'contractor',
    color: '#EA580C',
    bg: '#FFEDD5',
    border: '#FDBA74'
  }
];

export const ROLE_LABELS = {
  admin: 'Facility Administrator',
  general_contractor: 'General Contractor',
  sub_contractor: 'Trade Subcontractor',
  architect: 'Architect / Engineer',
  owner: 'Owner Representative',
  field_inspector: 'Field Inspector'
};

export const STANDARD_ORGANIZATIONS = [
  'UMBC Facility Operations',
  'Apex Construction General Contracting',
  'Mechanical Partners Inc (HVAC & Plumbing)',
  'BrightVolt Electrical Services',
  'Apex Drywall & Finishes',
  'Design Team AIA & Structural Consultants',
  'Municipal Building & Safety Inspection'
];

export const isRealProject = (p) => {
  if (!p) return false;
  const id = String(p.id || '').toLowerCase();
  const name = String(p.name || '').toLowerCase();
  if (
    id.startsWith('proj-demo') ||
    id === 'b24a830c-17b8-4ef4-801e-ab32d1e21408' ||
    id === '757c1301-1828-45c6-951f-e9d91ce88e1f' ||
    id === 'proj-2' || id === 'proj-3' ||
    name.includes('mission bay') ||
    name.includes('salesforce transit') ||
    name.includes('harbor point tower 2') ||
    name.includes('beacon health')
  ) {
    return false;
  }
  return true;
};

export const isOpenProject = (p) => {
  if (!isRealProject(p)) return false;
  const s = String(p.status || 'active').toLowerCase().trim();
  return s === 'active' || s === 'open' || s === 'in_progress' || s === 'ongoing';
};

let _cachedTeamData = null;

export default function TeamPage({ currentUser, projects = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending_approval' | 'pending_invitation' | 'active' | 'suspended'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetTeam, setTargetTeam] = useState('admin'); // 'admin' | 'contractor' | 'subcontractor' | 'crew'

  // Credential Handoff Modal State (shows newly generated invite token & link)
  const [inviteModalData, setInviteModalData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Rejection Dialog State
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Notification Toast State
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Determine permissions based on current user role
  const userRole = currentUser?.role || 'admin';
  const isAdmin = userRole === 'admin' || userRole === 'Project Executive' || userRole === 'executive';
  const isGC = userRole === 'general_contractor' || userRole.includes('Contractor') || userRole.includes('Superintendent');

  // Organizations list (preloaded with standard organizations, merged with DB companies)
  const [availableCompanies, setAvailableCompanies] = useState(STANDARD_ORGANIZATIONS);
  const [isCustomOrg, setIsCustomOrg] = useState(false);

  // Form State for Adding / Provisioning a Member
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'sub_contractor',
    company: 'Mechanical Partners Inc (HVAC & Plumbing)',
    customCompany: '',
    trade: 'DW',
    presence: 'on_site',
    projectIds: []
  });

  const [loadingTeam, setLoadingTeam] = useState(!_cachedTeamData);

  // Team roster organized by the 4 required categories (purely database driven with memory cache)
  const [teamMembers, setTeamMembers] = useState(() => {
    return _cachedTeamData || {
      admin: [],
      contractor: [],
      subcontractor: [],
      crew: []
    };
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

  // Open modal with specific target team pre-selected and all open projects assigned by default
  const handleOpenAddModal = (teamKey) => {
    // If GC, restrict to subcontractor
    const effectiveTeam = (isGC && !isAdmin) ? 'subcontractor' : teamKey;
    setTargetTeam(effectiveTeam);

    let defaultRoleKey = 'sub_contractor';
    if (isGC && !isAdmin) {
      defaultRoleKey = 'sub_contractor';
    } else if (effectiveTeam === 'admin') {
      defaultRoleKey = 'admin';
    } else if (effectiveTeam === 'contractor') {
      defaultRoleKey = 'general_contractor';
    } else if (effectiveTeam === 'subcontractor') {
      defaultRoleKey = 'sub_contractor';
    } else {
      defaultRoleKey = 'field_inspector';
    }

    let defaultCompany = 'UMBC Facility Operations';
    if (defaultRoleKey === 'general_contractor') defaultCompany = 'Apex Construction General Contracting';
    else if (defaultRoleKey === 'sub_contractor') defaultCompany = 'Mechanical Partners Inc (HVAC & Plumbing)';
    else if (defaultRoleKey === 'architect') defaultCompany = 'Design Team AIA & Structural Consultants';
    else if (defaultRoleKey === 'owner') defaultCompany = 'UMBC Facility Operations';
    else if (defaultRoleKey === 'field_inspector') defaultCompany = 'Municipal Building & Safety Inspection';

    // Assigned projects default to all open/active projects
    const openProjects = projects.filter(isOpenProject);
    const defaultProjectIds = openProjects.length > 0 ? openProjects.map(p => p.id) : projects.map(p => p.id);

    setForm({
      name: '',
      email: '',
      phone: '+1 (617) 555-0100',
      role: defaultRoleKey,
      company: defaultCompany,
      customCompany: '',
      trade: 'DW',
      presence: 'on_site',
      projectIds: defaultProjectIds
    });
    setIsCustomOrg(false);
    setIsModalOpen(true);
  };

  // Load team members from database
  const refreshTeam = async () => {
    setLoadingTeam(true);
    try {
      const data = await api.getTeam();
      if (Array.isArray(data)) {
        const grouped = { admin: [], contractor: [], subcontractor: [], crew: [] };
        data.forEach(m => {
          let cat = m.teamCategory;
          if (!cat) {
            const r = (m.role || '').toLowerCase();
            if (r === 'admin') cat = 'admin';
            else if (r === 'general_contractor') cat = 'contractor';
            else if (r === 'sub_contractor') cat = 'subcontractor';
            else cat = 'crew';
          } else if (cat === 'sub_contractor') {
            cat = 'subcontractor';
          }
          if (grouped[cat]) {
            grouped[cat].push(m);
          } else {
            grouped.crew.push(m);
          }
        });
        _cachedTeamData = grouped;
        setTeamMembers(grouped);
      }
    } catch (err) {
      console.warn('Could not load team members from database:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    refreshTeam();
    api.getCompanies().then(comps => {
      if (Array.isArray(comps)) {
        const names = comps.map(c => c.name).filter(Boolean);
        setAvailableCompanies(prev => Array.from(new Set([...prev, ...names])));
      }
    }).catch(() => {});
  }, []);

  // Submit new member provisioning
  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    const finalCompany = (isCustomOrg ? form.customCompany.trim() : form.company.trim()) || 'PunchList Pro';
    const roleObj = CANONICAL_ROLES.find(r => r.key === form.role);
    const resolvedCategory = roleObj ? roleObj.teamCategory : (targetTeam === 'subcontractor' ? 'sub_contractor' : targetTeam);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || '+1 (617) 555-0100',
      role: form.role,
      organization: finalCompany,
      teamCategory: resolvedCategory === 'subcontractor' ? 'sub_contractor' : resolvedCategory,
      trade: (resolvedCategory === 'subcontractor' || resolvedCategory === 'crew' || form.role === 'sub_contractor') ? form.trade : undefined,
      project_ids: form.projectIds,
      presence: form.presence,
      presenceText: form.presence === 'on_site' ? 'On site' : form.presence === 'away' ? 'Away' : 'Offline'
    };

    try {
      const res = await api.addTeamMember(payload);
      setIsModalOpen(false);

      const createdMember = res.user || res;
      const inviteUrl = res.invitation_url || (res.invitation_token ? `${window.location.origin}/#onboard?token=${res.invitation_token}` : null);

      const targetTeamKey = (resolvedCategory === 'sub_contractor') ? 'subcontractor' : (resolvedCategory || 'admin');

      // Prepend to roster state safely
      setTeamMembers(prev => {
        const existingList = prev[targetTeamKey] || [];
        return {
          ...prev,
          [targetTeamKey]: [createdMember, ...existingList.filter(m => m.id !== createdMember.id)]
        };
      });

      // Refresh team state from DB in background
      refreshTeam();

      // Display credential handoff dialog with link
      if (inviteUrl) {
        setInviteModalData({
          member: createdMember,
          inviteUrl,
          inviteToken: res.invitation_token
        });
      } else {
        showToast('success', `Account for ${createdMember.name} created successfully.`);
      }
    } catch (err) {
      console.error('Error provisioning member:', err);
      showToast('error', err.message || 'Failed to provision user account.');
    }
  };

  // Lifecycle Action Handlers
  const handleApproveMember = async (member) => {
    try {
      const updated = await api.approveTeamMember(member.id);
      showToast('success', `${member.name} has been approved.`);
      setTeamMembers(prev => {
        const copy = { ...prev };
        for (const k of Object.keys(copy)) {
          copy[k] = copy[k].map(m => m.id === member.id ? { ...m, ...updated, status: updated.status || 'pending_invitation' } : m);
        }
        return copy;
      });
    } catch (err) {
      showToast('error', err.message || 'Approval failed.');
    }
  };

  const handleOpenRejectModal = (member) => {
    setRejectionTarget(member);
    setRejectionReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectionTarget) return;
    try {
      const updated = await api.rejectTeamMember(rejectionTarget.id, rejectionReason);
      showToast('info', `${rejectionTarget.name}'s account was rejected.`);
      setTeamMembers(prev => {
        const copy = { ...prev };
        for (const k of Object.keys(copy)) {
          copy[k] = copy[k].map(m => m.id === rejectionTarget.id ? { ...m, ...updated, status: 'rejected' } : m);
        }
        return copy;
      });
      setRejectionTarget(null);
    } catch (err) {
      showToast('error', err.message || 'Rejection failed.');
    }
  };

  const handleSuspendMember = async (member) => {
    if (!window.confirm(`Are you sure you want to suspend access for ${member.name}? They will be immediately blocked from all protected project resources.`)) {
      return;
    }
    try {
      const updated = await api.suspendTeamMember(member.id);
      showToast('info', `${member.name}'s account is now suspended.`);
      setTeamMembers(prev => {
        const copy = { ...prev };
        for (const k of Object.keys(copy)) {
          copy[k] = copy[k].map(m => m.id === member.id ? { ...m, ...updated, status: 'suspended' } : m);
        }
        return copy;
      });
    } catch (err) {
      showToast('error', err.message || 'Suspension failed.');
    }
  };

  const handleReactivateMember = async (member) => {
    try {
      const updated = await api.reactivateTeamMember(member.id);
      showToast('success', `${member.name}'s account access has been restored.`);
      setTeamMembers(prev => {
        const copy = { ...prev };
        for (const k of Object.keys(copy)) {
          copy[k] = copy[k].map(m => m.id === member.id ? { ...m, ...updated, status: updated.status || 'active' } : m);
        }
        return copy;
      });
    } catch (err) {
      showToast('error', err.message || 'Reactivation failed.');
    }
  };

  const handleResendInvite = async (member) => {
    try {
      const res = await api.resendInvitation(member.id);
      const inviteUrl = res.invitation_url || `${window.location.origin}/#onboard?token=${res.invitation_token}`;
      setInviteModalData({
        member,
        inviteUrl,
        inviteToken: res.invitation_token
      });
      showToast('success', `New invitation link generated for ${member.name}.`);
    } catch (err) {
      showToast('error', err.message || 'Failed to generate invitation.');
    }
  };

  const handleRemoveMember = async (teamKey, memberId) => {
    if (!window.confirm('Are you sure you want to delete this member account?')) return;
    try {
      await api.deleteTeamMember(memberId);
      showToast('info', 'Member account removed.');
    } catch (err) {
      console.warn('Could not delete from backend database:', err);
    }
    setTeamMembers(prev => ({
      ...prev,
      [teamKey]: prev[teamKey].filter(m => m.id !== memberId)
    }));
  };

  const handleCopyInvite = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (_) {
      // Fallback
      setCopiedLink(true);
    }
  };

  const getPresenceDot = (presence) => {
    if (presence === 'on_site') return { color: '#16A34A', text: 'On site' };
    if (presence === 'away') return { color: '#D97706', text: 'Away' };
    return { color: '#71717A', text: 'Offline' };
  };

  // Render Account Status Pill
  const renderStatusBadge = (status) => {
    const s = status || 'active';
    switch (s) {
      case 'pending_approval':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 12,
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            border: '1px solid #FCD34D',
            fontSize: 11,
            fontWeight: 700
          }}>
            <Clock size={11} /> Pending Approval
          </span>
        );
      case 'pending_invitation':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 12,
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
            fontSize: 11,
            fontWeight: 700
          }}>
            <Mail size={11} /> Invite Sent
          </span>
        );
      case 'suspended':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 12,
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            border: '1px solid #FCA5A5',
            fontSize: 11,
            fontWeight: 700
          }}>
            <Ban size={11} /> Suspended
          </span>
        );
      case 'rejected':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 12,
            backgroundColor: '#F4F4F5',
            color: '#71717A',
            border: '1px solid #E4E4E7',
            fontSize: 11,
            fontWeight: 700,
            textDecoration: 'line-through'
          }}>
            <X size={11} /> Rejected
          </span>
        );
      case 'active':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 12,
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            border: '1px solid #86EFAC',
            fontSize: 11,
            fontWeight: 700
          }}>
            <CheckCircle2 size={11} /> Active
          </span>
        );
    }
  };

  // Count pending approvals across all categories
  const pendingApprovalCount = Object.values(teamMembers)
    .flat()
    .filter(m => (m.status || 'active') === 'pending_approval').length;

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '28px 32px',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 32,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 18px',
          borderRadius: 8,
          backgroundColor: toast.type === 'error' ? '#991B1B' : toast.type === 'info' ? '#1F2937' : '#065F46',
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : toast.type === 'info' ? <Info size={16} /> : <CheckCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Top Header & Global Search ───────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            Project Directory &amp; Provisioning
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>
            Team Administration &amp; Onboarding
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Manage authorized project personnel, approve contractor sponsorship requests, and coordinate secure credential onboarding.
          </p>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Search team"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36, height: 38, fontSize: 13 }}
          />
        </div>
      </div>

      {/* ── Lifecycle Filter Tabs & Pending Badge ───────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 4,
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'all', label: 'All Personnel' },
            { key: 'pending_approval', label: 'Pending Approval', count: pendingApprovalCount, highlight: pendingApprovalCount > 0 },
            { key: 'pending_invitation', label: 'Pending Invitation' },
            { key: 'active', label: 'Active' },
            { key: 'suspended', label: 'Suspended' }
          ].map(tab => {
            const isSelected = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--ink)' : '1px solid var(--border)',
                  backgroundColor: isSelected ? 'var(--ink)' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'background-color 120ms ease, color 120ms ease, border-color 120ms ease'
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{
                    backgroundColor: tab.highlight ? '#EF4444' : '#6B7280',
                    color: '#FFFFFF',
                    padding: '1px 6px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Informative badge for GC user */}
        {isGC && !isAdmin && (
          <div style={{
            fontSize: 12,
            color: '#B45309',
            backgroundColor: '#FEF3C7',
            padding: '5px 12px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid #FCD34D'
          }}>
            <Info size={14} /> General Contractor sponsorship mode: Added subcontractors require Facility Administrator approval.
          </div>
        )}
      </div>

      {/* ── 4 Dedicated Team Containers ──────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {TEAMS.map((team) => {
          const TeamIcon = team.icon;
          const allMembers = teamMembers[team.key] || [];

          // Filter by search query and lifecycle status filter
          const filteredMembers = allMembers.filter(m => {
            const currentStatus = m.status || 'active';
            if (statusFilter !== 'all' && currentStatus !== statusFilter) {
              return false;
            }
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            return (
              m.name.toLowerCase().includes(q) ||
              m.email.toLowerCase().includes(q) ||
              m.role.toLowerCase().includes(q) ||
              (m.company && m.company.toLowerCase().includes(q))
            );
          });

          // GC can only add subcontractors
          const canAddMemberToTeam = isAdmin || (isGC && team.key === 'subcontractor');

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
                {canAddMemberToTeam && (
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
                  >
                    <Plus size={15} strokeWidth={2.6} />
                    <span>Provision {team.title.replace(' Team', '').replace(' Members', '')}</span>
                  </button>
                )}
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
                      <th style={{ padding: '10px 12px' }}>Account Status</th>
                      <th style={{ padding: '10px 12px' }}>Presence</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions & Handoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const presence = getPresenceDot(member.presence);
                      const tradeInfo = member.trade ? TRADES[member.trade] : null;
                      const status = member.status || 'active';
                      const isPendingApproval = status === 'pending_approval';
                      const isPendingInvitation = status === 'pending_invitation';
                      const isSuspended = status === 'suspended';
                      const isRejected = status === 'rejected';
                      const isSelf = currentUser && member.id === currentUser.id;

                      return (
                        <tr
                          key={member.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: isPendingApproval ? '#FEFCE8' : isSuspended ? '#FEF2F2' : 'transparent',
                            transition: 'background 120ms ease'
                          }}
                        >
                          {/* Name & Avatar */}
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <img
                                src={member.avatar_url || member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
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
                              {ROLE_LABELS[member.role] || member.role}
                            </span>
                          </td>

                          {/* Company */}
                          <td style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {member.company || member.organization || '—'}
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

                          {/* Account Lifecycle Status */}
                          <td style={{ padding: '12px' }}>
                            {renderStatusBadge(status)}
                            {isRejected && member.rejection_reason && (
                              <div style={{ fontSize: 10, color: '#DC2626', marginTop: 2 }}>
                                Reason: {member.rejection_reason}
                              </div>
                            )}
                          </td>

                          {/* Presence Status */}
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: presence.color }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                                {member.presenceText || presence.text}
                              </span>
                            </div>
                          </td>

                          {/* Actions & Lifecycle Handlers */}
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                              {/* Pending Approval Controls for Administrator */}
                              {isPendingApproval && isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveMember(member)}
                                    className="btn"
                                    style={{
                                      backgroundColor: '#DCFCE7',
                                      color: '#15803D',
                                      border: '1px solid #86EFAC',
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                    title="Approve this account"
                                  >
                                    <Check size={13} strokeWidth={3} /> Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRejectModal(member)}
                                    className="btn"
                                    style={{
                                      backgroundColor: '#FEE2E2',
                                      color: '#B91C1C',
                                      border: '1px solid #FCA5A5',
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                    title="Reject this account"
                                  >
                                    <X size={13} strokeWidth={3} /> Reject
                                  </button>
                                </>
                              )}

                              {/* Credential Handoff / Resend Invitation */}
                              {(isPendingInvitation || isPendingApproval) && (
                                <button
                                  type="button"
                                  onClick={() => handleResendInvite(member)}
                                  className="btn-icon"
                                  style={{
                                    width: 30,
                                    height: 30,
                                    color: '#2563EB',
                                    backgroundColor: '#EFF6FF',
                                    border: '1px solid #BFDBFE'
                                  }}
                                  title="Resend invitation link / copy onboarding credential"
                                >
                                  <Copy size={14} />
                                </button>
                              )}

                              {/* Admin Suspend / Reactivate Controls */}
                              {isAdmin && !isSelf && !isPendingApproval && !isRejected && (
                                <>
                                  {isSuspended ? (
                                    <button
                                      type="button"
                                      onClick={() => handleReactivateMember(member)}
                                      className="btn-icon"
                                      style={{
                                        width: 30,
                                        height: 30,
                                        color: '#15803D',
                                        backgroundColor: '#DCFCE7',
                                        border: '1px solid #86EFAC'
                                      }}
                                      title="Reactivate account access"
                                    >
                                      <RotateCw size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSuspendMember(member)}
                                      className="btn-icon"
                                      style={{
                                        width: 30,
                                        height: 30,
                                        color: '#DC2626',
                                        backgroundColor: '#FEF2F2',
                                        border: '1px solid #FECACA'
                                      }}
                                      title="Suspend account access"
                                    >
                                      <Ban size={14} />
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Email & Phone Links */}
                              <a
                                href={`mailto:${member.email}`}
                                className="btn-icon"
                                style={{ width: 30, height: 30 }}
                                title={`Email ${member.name}`}
                              >
                                <Mail size={14} />
                              </a>
                              {member.phone && (
                                <a
                                  href={`tel:${member.phone}`}
                                  className="btn-icon"
                                  style={{ width: 30, height: 30 }}
                                  title={`Call ${member.phone}`}
                                >
                                  <Phone size={14} />
                                </a>
                              )}

                              {/* Delete Account (Admin only) */}
                              {isAdmin && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(team.key, member.id)}
                                  className="btn-icon"
                                  style={{ width: 30, height: 30, color: 'var(--crimson)' }}
                                  title="Remove member permanently"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Loading State for Container */}
                    {loadingTeam && filteredMembers.length === 0 && (
                      <tr>
                        <td
                          colSpan={team.key === 'subcontractor' || team.key === 'crew' ? 7 : 6}
                          style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: '50%',
                              border: '2px solid var(--amber)', borderTopColor: 'transparent',
                              animation: 'spin 0.7s linear infinite', display: 'inline-block'
                            }} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>Loading personnel roster…</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Empty State for Container (only when NOT loading) */}
                    {!loadingTeam && filteredMembers.length === 0 && (
                      <tr>
                        <td
                          colSpan={team.key === 'subcontractor' || team.key === 'crew' ? 7 : 6}
                          style={{ padding: '36px 16px', textAlign: 'center' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <Users size={30} color="var(--border)" />
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                              {searchQuery
                                ? `No members match "${searchQuery}"`
                                : statusFilter !== 'all'
                                ? `No members with status "${statusFilter.replace('_', ' ')}"`
                                : `No ${team.title} members registered yet`}
                            </div>
                            {!searchQuery && canAddMemberToTeam && (
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

      {/* ── Provision Member Modal ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540, padding: '24px 28px', borderRadius: 12 }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>
                  Provision User Account
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Assign authorized roles, trade classification, project access, and issue onboarding credentials.
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* General Contractor Notification */}
            {isGC && !isAdmin && (
              <div style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                fontSize: 12,
                color: '#92400E',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start'
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Contractor Sponsorship Notice:</strong> As a General Contractor, newly provisioned subcontractor accounts will be created in a <em>Pending Approval</em> state and must be authorized by a Facility Administrator before access is activated.
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddMemberSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Target Team Container Selector */}
              {isAdmin && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Personnel Category
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
              )}

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
                    Work Email *
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

              {/* Role & Company Dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Role / Position Title Dropdown */}
                <div>
                  <label htmlFor="user-role-select" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Role / Position Title *
                  </label>
                  <select
                    id="user-role-select"
                    required
                    value={form.role}
                    onChange={(e) => {
                      const selectedKey = e.target.value;
                      const roleObj = CANONICAL_ROLES.find(r => r.key === selectedKey);
                      setForm(f => ({ ...f, role: selectedKey }));
                      if (roleObj) {
                        setTargetTeam(roleObj.teamCategory);
                      }
                    }}
                    className="select-field"
                    style={{ width: '100%', height: 38 }}
                  >
                    {(isGC && !isAdmin
                      ? CANONICAL_ROLES.filter(r => r.key === 'sub_contractor')
                      : CANONICAL_ROLES
                    ).map(r => (
                      <option key={r.key} value={r.key}>
                        {r.label} — {r.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company / Organization Dropdown */}
                <div>
                  <label htmlFor="user-org-select" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Company / Organization *
                  </label>
                  <select
                    id="user-org-select"
                    value={isCustomOrg ? '__custom__' : form.company}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setIsCustomOrg(true);
                      } else {
                        setIsCustomOrg(false);
                        setForm(f => ({ ...f, company: val }));
                      }
                    }}
                    className="select-field"
                    style={{ width: '100%', height: 38 }}
                  >
                    {availableCompanies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__custom__">+ Other / Custom Organization...</option>
                  </select>

                  {isCustomOrg && (
                    <div style={{ marginTop: 6 }}>
                      <input
                        type="text"
                        required
                        placeholder="Enter organization name..."
                        value={form.customCompany}
                        onChange={(e) => setForm(f => ({ ...f, customCompany: e.target.value }))}
                        className="input-field"
                        style={{ width: '100%', height: 34, fontSize: 12 }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Role Scope & Authority Guidance Card */}
              {(() => {
                const activeRoleObj = CANONICAL_ROLES.find(r => r.key === form.role);
                if (!activeRoleObj) return null;
                return (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    backgroundColor: activeRoleObj.bg || '#F3F4F6',
                    border: `1px solid ${activeRoleObj.border || '#E5E7EB'}`,
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: 'var(--ink)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: activeRoleObj.color, marginBottom: 2 }}>
                      <span>{activeRoleObj.label}</span>
                      <span style={{ fontWeight: 500, opacity: 0.85 }}>({activeRoleObj.title})</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                      {activeRoleObj.description}
                    </div>
                  </div>
                );
              })()}

              {/* Project Assignment (Defaults to All Open Projects) */}
              {projects.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                      Assigned Project(s)
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const openIds = projects.filter(isOpenProject).map(p => p.id);
                          setForm(f => ({ ...f, projectIds: openIds }));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: 11,
                          color: '#2563EB',
                          cursor: 'pointer',
                          fontWeight: 600,
                          textDecoration: 'underline'
                        }}
                      >
                        Select All Open ({projects.filter(isOpenProject).length})
                      </button>
                      <span style={{ color: 'var(--border)', fontSize: 11 }}>|</span>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, projectIds: [] }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    All open projects are selected by default. You can customize assignments below.
                  </div>
                  <div style={{
                    maxHeight: 125,
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    {projects.filter(isRealProject).map(proj => {
                      const isChecked = form.projectIds.includes(proj.id);
                      const isOpen = isOpenProject(proj);
                      return (
                        <label
                          key={proj.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            fontSize: 12,
                            cursor: 'pointer',
                            padding: '2px 0'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setForm(f => ({ ...f, projectIds: [...f.projectIds, proj.id] }));
                                } else {
                                  setForm(f => ({ ...f, projectIds: f.projectIds.filter(id => id !== proj.id) }));
                                }
                              }}
                            />
                            <span style={{ fontWeight: isChecked ? 600 : 400, color: 'var(--ink)' }}>{proj.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({proj.code || 'Project'})</span>
                          </div>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: isOpen ? '#DCFCE7' : '#F3F4F6',
                            color: isOpen ? '#15803D' : '#6B7280',
                            border: `1px solid ${isOpen ? '#86EFAC' : '#E5E7EB'}`
                          }}>
                            {isOpen ? 'Open' : (proj.status || 'Archived')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  <UserPlus size={16} /> Provision User & Generate Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Credential Handoff / Invitation Modal ───────────────────────── */}
      {inviteModalData && (
        <div className="modal-overlay" onClick={() => setInviteModalData(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, padding: '26px 28px', borderRadius: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                border: '2px solid #86EFAC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#15803D'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>
                  Account Provisioned & Ready
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  A secure, single-use onboarding credential has been generated.
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '14px 16px',
              marginBottom: 18,
              fontSize: 13
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#6B7280' }}>Recipient:</span>
                <strong style={{ color: '#111827' }}>{inviteModalData.member?.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#6B7280' }}>Email Address:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#111827' }}>{inviteModalData.member?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Assigned Role:</span>
                <strong style={{ color: '#111827' }}>{inviteModalData.member?.role}</strong>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
              Secure Onboarding Invitation Link (Expires in 7 Days)
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                type="text"
                readOnly
                value={inviteModalData.inviteUrl}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--ink)'
                }}
              />
              <button
                type="button"
                onClick={() => handleCopyInvite(inviteModalData.inviteUrl)}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '0 16px'
                }}
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            <div style={{
              fontSize: 11,
              color: '#6B7280',
              lineHeight: 1.5,
              marginBottom: 20
            }}>
              <strong>Security Protocol:</strong> This credential link allows the recipient to complete first-login identity verification and establish their own private password. Plaintext credentials are never emailed or stored in plaintext.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setInviteModalData(null)}
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '7px 20px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Reason Modal ────────────────────────────────────────── */}
      {rejectionTarget && (
        <div className="modal-overlay" onClick={() => setRejectionTarget(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460, padding: '24px 26px', borderRadius: 12 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#DC2626" />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                  Reject Account Authorization
                </h3>
              </div>
              <button onClick={() => setRejectionTarget(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Are you sure you want to reject the provisioning request for <strong>{rejectionTarget.name}</strong> ({rejectionTarget.email})?
            </p>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Rejection Reason (Recorded in Audit Log)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Unverified trade license or contractor relationship..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input-field"
                style={{ width: '100%', resize: 'none', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="btn btn-ghost"
                style={{ fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="btn"
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '8px 18px',
                  borderRadius: 6
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
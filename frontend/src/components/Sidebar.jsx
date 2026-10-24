/**
 * Sidebar.jsx
 * Collapsible, responsive sidebar navigation for PunchList Pro.
 *
 * Features:
 *  - Persistent left rail on desktop, slide-over drawer below 1024px
 *  - Nav items grouped by purpose, with optional count badges (`badges` prop)
 *  - Collapses to an icon-only rail with instant custom tooltips
 *  - Active project switcher (renders only when `projects` / `activeProject` are provided)
 *  - Compact user card with role indicator and sign out
 *  - Keyboard friendly: visible focus, Esc closes drawer / menu, hidden drawer isn't tabbable
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
  LogOut,
  HardHat,
  Menu,
  Plus,
  X,
} from 'lucide-react';
import './Sidebar.css';

const MOBILE_QUERY = '(max-width: 1023px)';

// Items are grouped with titles; dividers and section headers are drawn between groups.
const NAV_GROUPS = [
  {
    title: 'CORE WORKSPACE',
    items: [
      { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, title: 'Project Overview & Metrics' },
      { key: 'projects', label: 'Ongoing Projects', Icon: FolderKanban, title: 'All Ongoing Projects' },
    ],
  },
  {
    title: 'FIELD OPERATIONS',
    items: [
      { key: 'fieldreport', label: 'Field Report', Icon: ClipboardList, title: 'Field Activity & Comments' },
      { key: 'documents', label: 'Documents', Icon: FileText, title: 'Project Documents & Plan Issues' },
      { key: 'photos', label: 'Photos', Icon: ImageIcon, title: 'Photo Gallery' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { key: 'team', label: 'Team', Icon: Users, title: 'Contractors & Subcontractors' },
      { key: 'settings', label: 'Settings', Icon: Settings, title: 'Configuration Settings' },
    ],
  },
];

const ROLE_LABELS = {
  admin: 'Facility Administrator',
  general_contractor: 'General Contractor',
  sub_contractor: 'Trade Subcontractor',
  architect: 'Architect',
  owner: 'Owner / Client Rep',
  field_inspector: 'Field Inspector',
};

const ROLE_COLORS = {
  admin: 'var(--brand-red, #DC2626)',
  general_contractor: 'var(--brand-yellow-dark, #D97706)',
  sub_contractor: 'var(--text-muted, #78716C)',
  architect: '#2563EB',
  owner: '#059669',
  field_inspector: '#EA580C',
};

const sameProject = (a, b) =>
  !!a && !!b && (a.id !== undefined ? a.id === b.id : a.name === b.name);

export default function Sidebar({
  activeModule,
  onNavigate,
  currentUser,
  activeProject,
  projects = [],
  onSelectProject,
  onOpenNewProject,
  onLogout,
  onToggleCollapse,
  badges = {}, // optional counts, e.g. { fieldreport: 3 }
}) {
  // Desktop collapse preference (persisted)
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sidebar_collapsed') || 'false'); }
    catch { return false; }
  });

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MOBILE_QUERY).matches
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tip, setTip] = useState(null);

  const projectRef = useRef(null);
  const onToggleRef = useRef(onToggleCollapse);

  // The drawer on small screens is always full width, so the icon-only
  // state only applies to the desktop rail.
  const isCollapsed = collapsed && !isMobile;

  // Track the breakpoint
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Persist collapse state and notify the parent layout.
  // The callback lives in a ref so an inline parent handler can't re-fire this.
  useEffect(() => { onToggleRef.current = onToggleCollapse; });
  useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsed)); }
    catch { /* ignore */ }
    if (onToggleRef.current) onToggleRef.current(collapsed);
  }, [collapsed]);

  // Esc closes the drawer and the project menu
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Click outside closes the project menu
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (projectRef.current && !projectRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const toggleCollapsed = () => {
    setMenuOpen(false);
    setTip(null);
    setCollapsed((c) => !c);
  };

  const handleNavClick = (key) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  // Tooltips for the icon-only rail. Rendered outside <nav> with fixed
  // positioning so the sidebar's overflow clipping can't cut them off.
  const tipProps = (text) => {
    if (!isCollapsed || !text) return {};
    const show = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ text, top: r.top + r.height / 2 });
    };
    return { onMouseEnter: show, onFocus: show, onMouseLeave: () => setTip(null), onBlur: () => setTip(null) };
  };

  const userName = currentUser?.name || 'Unknown User';
  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase()
    : '?';
  const roleLabel = ROLE_LABELS[currentUser?.role] || currentUser?.role || 'User';
  const roleColor = ROLE_COLORS[currentUser?.role] || '#78716C';

  const showProjects = !!activeProject || projects.length > 0;
  const projectInitials = (activeProject?.name || 'P').trim().slice(0, 2).toUpperCase();

  return (
    <>
      {/* ── Mobile hamburger (small screens only) ── */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
        aria-controls="sidebar-panel"
      >
        <Menu size={22} />
      </button>

      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <nav
        id="sidebar-panel"
        className={[
          'sidebar',
          isCollapsed ? 'sidebar--collapsed' : '',
          mobileOpen ? 'sidebar--mobile-open' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Main navigation"
      >
        {/* ── Brand ── */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-mark" {...tipProps('PunchList PRO')}>
              <HardHat size={20} strokeWidth={2.2} />
            </span>
            {!isCollapsed && (
              <div className="sidebar-logo-text">
                <span className="sidebar-logo-primary">PunchList</span>
                <span className="sidebar-logo-secondary">PRO</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Active project ── */}
        {showProjects && (
          <div className="sidebar-project" ref={projectRef}>
            {isCollapsed ? (
              <button
                className="sidebar-project-chip"
                onClick={() => { setTip(null); setCollapsed(false); setMenuOpen(true); }}
                aria-label={`Active project: ${activeProject?.name || 'none'}. Expand to switch.`}
                {...tipProps(activeProject?.name || 'Select project')}
              >
                {projectInitials}
              </button>
            ) : (
              <button
                className={`sidebar-project-btn ${menuOpen ? 'open' : ''}`}
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <span className="sidebar-project-dot" aria-hidden="true" />
                <span className="sidebar-project-info">
                  <span className="sidebar-project-name">{activeProject?.name || 'Select a project'}</span>
                  {activeProject?.code && <span className="sidebar-project-code">{activeProject.code}</span>}
                </span>
                <ChevronsUpDown size={15} className="sidebar-project-chevron" aria-hidden="true" />
              </button>
            )}

            {menuOpen && !isCollapsed && (
              <div className="sidebar-project-menu">
                <div className="sidebar-project-menu-list">
                  {projects.map((p, i) => {
                    const active = sameProject(activeProject, p);
                    return (
                      <button
                        key={p.id ?? p.code ?? i}
                        className={`sidebar-project-menu-item ${active ? 'active' : ''}`}
                        onClick={() => { onSelectProject?.(p); setMenuOpen(false); setMobileOpen(false); }}
                      >
                        <span className="sidebar-project-info">
                          <span className="sidebar-project-name">{p.name}</span>
                          {p.code && <span className="sidebar-project-code">{p.code}</span>}
                        </span>
                        {active && <Check size={15} className="sidebar-project-check" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
                <div className="sidebar-project-menu-footer">
                  <button
                    className="sidebar-menu-action"
                    onClick={() => { setMenuOpen(false); handleNavClick('projects'); }}
                  >
                    <FolderKanban size={14} /> View all projects
                  </button>
                  {onOpenNewProject && (
                    <button
                      className="sidebar-menu-action sidebar-menu-action--primary"
                      onClick={() => { setMenuOpen(false); setMobileOpen(false); onOpenNewProject(); }}
                    >
                      <Plus size={14} /> New project
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="sidebar-scroll">
          {NAV_GROUPS.map((group, gi) => {
            const items = group.items || group;
            return (
              <div key={gi} className="sidebar-nav-group">
                {!isCollapsed && group.title && (
                  <div className="sidebar-section-label" aria-hidden="true">
                    {group.title}
                  </div>
                )}
                <ul className="sidebar-nav" role="list">
                  {items.map(({ key, label, Icon, title }) => {
                    const isActive = activeModule === key;
                    const badge = Number(badges[key]) || 0;
                    return (
                      <li key={key} className="sidebar-nav-item">
                        <button
                          id={`sidebar-nav-${key}`}
                          className={`sidebar-nav-btn ${isActive ? 'sidebar-nav-btn--active' : ''}`}
                          onClick={() => handleNavClick(key)}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={isCollapsed ? label : undefined}
                          title={isCollapsed ? undefined : title}
                          {...tipProps(label)}
                        >
                          <span className="sidebar-nav-icon">
                            <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                            {isCollapsed && badge > 0 && <span className="sidebar-nav-dot" aria-hidden="true" />}
                          </span>
                          {!isCollapsed && <span className="sidebar-nav-label">{label}</span>}
                          {!isCollapsed && badge > 0 && (
                            <span className="sidebar-nav-badge">{badge > 99 ? '99+' : badge}</span>
                          )}
                          {isActive && <span className="sidebar-nav-active-bar" aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* ── Collapse / expand ── */}
        <div className="sidebar-collapse-section">
          <button
            className="sidebar-toggle-rail-btn"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? undefined : 'Collapse sidebar'}
            {...tipProps('Expand sidebar')}
          >
            <span className="sidebar-toggle-rail-icon">
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </span>
            {!isCollapsed && <span className="sidebar-toggle-rail-text">Collapse</span>}
          </button>
        </div>

        {/* ── User card ── */}
        <div className="sidebar-footer">
          <div className="sidebar-user" {...tipProps(`${userName} · ${roleLabel}`)}>
            <div className="sidebar-user-avatar">
              {currentUser?.avatar_url
                ? <img src={currentUser.avatar_url} alt={userName} />
                : <span>{userInitials}</span>}
            </div>
            {!isCollapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{userName}</span>
                <span className="sidebar-user-role" style={{ '--role-color': roleColor }}>
                  <i className="sidebar-user-role-dot" aria-hidden="true" />
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={onLogout}
            aria-label="Sign out"
            title={isCollapsed ? undefined : 'Sign out'}
            {...tipProps('Sign out')}
          >
            <LogOut size={17} />
          </button>
        </div>
      </nav>

      {isCollapsed && tip && (
        <div className="sidebar-tooltip" role="tooltip" style={{ top: tip.top }}>
          {tip.text}
        </div>
      )}
    </>
  );
}

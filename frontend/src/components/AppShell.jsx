import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  HardHat,
  LayoutDashboard,
  Layers,
  FileText,
  Camera,
  Users,
  Settings,
  ChevronDown,
  Search,
  WifiOff,
  RefreshCw,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Building2,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { umbcBuildings, getBuildingById } from '../data/umbcBuildings';
import './AppShell.css';

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const NAV_WORKSPACE = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'photos', label: 'Photos', icon: Camera }
];

const NAV_MANAGE = [
  { id: 'team', label: 'Team', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const getInitials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const getShortcutLabel = () =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)
    ? '⌘K'
    : 'Ctrl K';

/** Calls onDismiss('outside' | 'escape') while `active` is true. */
function useDismiss(ref, active, onDismiss) {
  const handler = useRef(onDismiss);
  useEffect(() => {
    handler.current = onDismiss;
  });

  useEffect(() => {
    if (!active) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler.current('outside');
    };
    const onKey = (e) => {
      if (e.key === 'Escape') handler.current('escape');
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, active]);
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function NavButton({ item, active, collapsed, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`nav-btn${active ? ' is-active' : ''}`}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      data-collapsed={collapsed || undefined}
    >
      <Icon size={19} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
      {!collapsed && <span className="nav-btn__label">{item.label}</span>}
      {!collapsed && item.badge != null && <span className="nav-btn__badge">{item.badge}</span>}
    </button>
  );
}

function Avatar({ user }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.avatar]);

  if (user?.avatar && !failed) {
    return (
      <img
        className="avatar"
        src={user.avatar}
        alt=""
        title={user?.name}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="avatar avatar--fallback" title={user?.name} aria-hidden="true">
      {getInitials(user?.name) || '?'}
    </div>
  );
}

function SyncBadge({ state, queuedCount, onToggle }) {
  return (
    <button
      type="button"
      className="sync-badge"
      data-state={state}
      onClick={onToggle}
      title="Click to cycle offline sync state (demo)"
      aria-live="polite"
    >
      {state === 'synced' && (
        <>
          <span className="sync-badge__dot" />
          <span>SYNCED</span>
        </>
      )}
      {state === 'syncing' && (
        <>
          <RefreshCw size={12} className="sync-badge__spin" aria-hidden="true" />
          <span>SYNCING…</span>
        </>
      )}
      {state === 'offline' && (
        <>
          <WifiOff size={13} aria-hidden="true" />
          <span>OFFLINE · {queuedCount} QUEUED</span>
        </>
      )}
    </button>
  );
}

function NotificationsMenu({ notifications, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="notif" ref={ref}>
      <button
        type="button"
        className="btn-icon"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        style={{ position: 'relative' }}
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && <span className="notif__dot" />}
      </button>

      {open && (
        <div className="glass-hud notif__panel">
          <div className="notif__head">
            <span className="notif__title">Field Notifications</span>
            <button
              type="button"
              className="notif__mark"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="notif__empty">You're all caught up</div>
          ) : (
            <div className="notif__list">
              {notifications.map((n) => (
                <div key={n.id} className={`notif__item${n.unread ? ' is-unread' : ''}`}>
                  <div className="notif__item-title">{n.title}</div>
                  <div className="notif__item-text">{n.text}</div>
                  <div className="notif__item-time">{n.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Building & floor selector                                           */
/* ------------------------------------------------------------------ */

function BuildingFloorSelector({
  selectedBuildingId,
  selectedFloorId,
  onSelectBuilding,
  onSelectFloor
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('building'); // 'building' | 'floor' (mobile stepper)
  const [query, setQuery] = useState('');
  const [hoveredId, setHoveredId] = useState(selectedBuildingId || umbcBuildings[0]?.id);

  const rootRef = useRef(null);
  const buildingBtnRef = useRef(null);
  const floorBtnRef = useRef(null);
  const searchRef = useRef(null);
  const buildingsRef = useRef(null);
  const floorsRef = useRef(null);

  const selected = getBuildingById(selectedBuildingId);
  const preview = getBuildingById(hoveredId) || selected || umbcBuildings[0];

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return umbcBuildings;
    return umbcBuildings.filter(
      (b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    );
  }, [query]);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    setQuery(''); // reopening should never show a stale filter
    if (returnFocus) buildingBtnRef.current?.focus();
  }, []);

  useDismiss(rootRef, open, (reason) => close(reason === 'escape'));

  const openAt = (nextStep) => {
    if (open) {
      close();
      return;
    }
    setStep(nextStep);
    setHoveredId(selectedBuildingId || umbcBuildings[0]?.id); // sync preview with selection
    setOpen(true);
  };

  const pickBuilding = (id) => {
    setHoveredId(id);
    onSelectBuilding(id);
    setStep('floor');
  };

  const pickFloor = (floor, buildingId) => {
    onSelectFloor(floor, buildingId);
    close(true);
  };

  /* Keyboard: search -> buildings -> floors */
  const buildingButtons = () => [...(buildingsRef.current?.querySelectorAll('[data-building]') || [])];
  const floorButtons = () => [...(floorsRef.current?.querySelectorAll('[data-floor]') || [])];

  const move = (list, dir) => {
    if (!list.length) return;
    const idx = list.indexOf(document.activeElement);
    const next = list[Math.min(Math.max(idx + dir, 0), list.length - 1)];
    next?.focus();
  };

  const onSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      buildingButtons()[0]?.focus();
    }
  };

  const onBuildingKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(buildingButtons(), 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const list = buildingButtons();
      if (list.indexOf(document.activeElement) <= 0) searchRef.current?.focus();
      else move(list, -1);
    } else if (e.key === 'ArrowRight' && preview?.floors.length) {
      e.preventDefault();
      setStep('floor');
      requestAnimationFrame(() => floorButtons()[0]?.focus());
    }
  };

  const onFloorKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(floorButtons(), 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(floorButtons(), -1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setStep('building');
      requestAnimationFrame(() =>
        buildingsRef.current?.querySelector(`[data-building="${preview?.id}"]`)?.focus()
      );
    }
  };

  const floorCount = (n) => `${n} ${n === 1 ? 'floor' : 'floors'}`;

  return (
    <div className="selector" ref={rootRef}>
      <button
        ref={buildingBtnRef}
        type="button"
        id="umbc-building-btn"
        className={`sel-btn${selected ? ' has-value' : ''}${open ? ' is-open' : ''}`}
        onClick={() => openAt('building')}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Select UMBC building"
      >
        <span className="sel-btn__eyebrow">Building</span>
        <span className="sel-btn__value">
          <span>{selected ? selected.name : 'Select building'}</span>
          <ChevronDown size={14} color="var(--text-muted)" aria-hidden="true" />
        </span>
      </button>

      {selected && (
        <>
          <span className="selector__sep" aria-hidden="true">/</span>
          <button
            ref={floorBtnRef}
            type="button"
            id="umbc-floor-btn"
            className={`sel-btn sel-btn--floor${selectedFloorId ? ' has-value' : ''}${
              open && step === 'floor' ? ' is-open' : ''
            }`}
            onClick={() => openAt('floor')}
            aria-haspopup="dialog"
            aria-expanded={open}
            title={`Select floor in ${selected.name}`}
          >
            <span className="sel-btn__eyebrow">Floor</span>
            <span className="sel-btn__value">
              <span>{selectedFloorId || 'Select floor'}</span>
              <ChevronDown size={14} color="var(--text-muted)" aria-hidden="true" />
            </span>
          </button>
        </>
      )}

      {open && (
        <div
          className="glass-hud floating-hud sel-panel"
          role="dialog"
          aria-label="UMBC building and floor selector"
        >
          <div className="sel-panel__head">
            <div className="sel-panel__title-row">
              <div className="sel-panel__title">
                <Building2 size={16} color="var(--amber)" aria-hidden="true" />
                <span>UMBC Campus Building &amp; Floor Selector</span>
              </div>
              <div className="sel-panel__path">
                {selected ? (
                  <>
                    <strong>{selected.name}</strong>
                    {selectedFloorId && <em> · {selectedFloorId}</em>}
                  </>
                ) : (
                  'Choose a building first'
                )}
              </div>
            </div>

            <div className="sel-search">
              <Search size={14} color="var(--text-muted)" aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                className="input-field"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={`Search ${umbcBuildings.length} UMBC buildings (e.g. Engineering, ILSB, Library)…`}
                aria-label="Search buildings"
                autoFocus
              />
            </div>

            <div className="mobile-step-tabs" style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={`sel-step sel-step--building${step === 'building' ? ' is-active' : ''}`}
                onClick={() => setStep('building')}
              >
                1. Building {selected ? `(${selected.name.split(' ')[0]})` : ''}
              </button>
              <button
                type="button"
                className={`sel-step sel-step--floor${step === 'floor' ? ' is-active' : ''}`}
                onClick={() => selected && setStep('floor')}
                disabled={!selected}
              >
                2. Floor {selectedFloorId ? `(${selectedFloorId})` : ''}
              </button>
            </div>
          </div>

          <div className="sel-panel__body">
            {/* Buildings */}
            <div
              ref={buildingsRef}
              className={`buildings-column${step === 'floor' ? ' hide-on-mobile' : ''}`}
              onKeyDown={onBuildingKeyDown}
            >
              <div className="col-label">Buildings ({filtered.length})</div>

              {filtered.map((b) => {
                const isSelected = selectedBuildingId === b.id;
                const isPreviewed = hoveredId === b.id;
                const hasFloors = b.floors.length > 0;
                return (
                  <button
                    key={b.id}
                    type="button"
                    data-building={b.id}
                    className={`b-row${isSelected ? ' is-selected' : ''}${isPreviewed ? ' is-previewed' : ''}`}
                    onMouseEnter={() => setHoveredId(b.id)}
                    onFocus={() => setHoveredId(b.id)}
                    onClick={() => pickBuilding(b.id)}
                    aria-pressed={isSelected}
                  >
                    <span className="b-row__text">
                      <div className="b-row__name">{b.name}</div>
                      <div className="b-row__meta">
                        {hasFloors ? floorCount(b.floors.length) : 'No floors'}
                      </div>
                    </span>
                    <span className="b-row__icons">
                      {isSelected && <CheckCircle2 size={14} color="var(--amber)" aria-hidden="true" />}
                      {hasFloors && <ChevronRight size={14} color="var(--text-muted)" aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="panel-empty">No UMBC buildings match "{query}"</div>
              )}
            </div>

            {/* Floors */}
            <div
              ref={floorsRef}
              className={`floors-column${step === 'building' ? ' hide-on-mobile' : ''}`}
              onKeyDown={onFloorKeyDown}
            >
              {preview ? (
                <>
                  <div className="floors-head">
                    <div className="col-label">Available floors</div>
                    <div className="floors-head__row">
                      <span>{preview.name}</span>
                      <span className="floors-head__count">{floorCount(preview.floors.length)}</span>
                    </div>
                  </div>

                  {preview.floors.length > 0 ? (
                    <div className="floor-list">
                      {preview.floors.map((floor) => {
                        const isFloorSelected =
                          selectedBuildingId === preview.id && selectedFloorId === floor;
                        return (
                          <button
                            key={floor}
                            type="button"
                            data-floor={floor}
                            className={`f-row${isFloorSelected ? ' is-selected' : ''}`}
                            onClick={() => pickFloor(floor, preview.id)}
                            aria-pressed={isFloorSelected}
                          >
                            <span className="f-row__label">
                              <Layers
                                size={14}
                                color={isFloorSelected ? '#FFFFFF' : 'var(--amber)'}
                                aria-hidden="true"
                              />
                              <span>{floor}</span>
                            </span>
                            {isFloorSelected && <CheckCircle2 size={15} color="#FFFFFF" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="floors-empty">
                      <p>No floor levels defined for this facility.</p>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 12, height: 32 }}
                        onClick={() => pickFloor('Ground Floor', preview.id)}
                      >
                        Select facility
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="panel-empty">Pick a building on the left to see its floors.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AppShell                                                            */
/* ------------------------------------------------------------------ */

export default function AppShell({
  activeModule,
  onNavigate,
  // UMBC building & floor selection
  selectedBuildingId,
  selectedFloorId,
  onSelectUmbcBuilding,
  onSelectUmbcFloor,
  currentUser,
  openPunchCount = 0,
  syncState, // 'synced' | 'syncing' | 'offline'
  queuedCount = 0,
  onToggleSyncState,
  onOpenQuickSearch,
  onLogout,
  initialNotifications = [],
  children
}) {
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const shortcut = useMemo(getShortcutLabel, []);

  const markAllRead = useCallback(
    () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false }))),
    []
  );

  // Open punch count rides on the Dashboard item (hidden when zero)
  const workspaceItems = useMemo(
    () =>
      NAV_WORKSPACE.map((item) =>
        item.id === 'dashboard' && openPunchCount > 0 ? { ...item, badge: openPunchCount } : item
      ),
    [openPunchCount]
  );

  const mobileItems = [...NAV_WORKSPACE, ...NAV_MANAGE];

  return (
    <div className="app-shell">
      {/* ---------------- Left rail ---------------- */}
      <aside className={`desktop-rail rail${isRailCollapsed ? ' is-collapsed' : ''}`}>
        <div className="rail__brand">
          <div className="rail__logo">
            <HardHat size={20} color="#FFFFFF" strokeWidth={2.4} aria-hidden="true" />
          </div>
          {!isRailCollapsed && (
            <div className="rail__name">
              PunchList <span>PRO</span>
            </div>
          )}
        </div>

        <nav className="rail__nav" aria-label="Main">
          <div>
            {!isRailCollapsed && <div className="rail__group-label">Workspace</div>}
            <div className="rail__group">
              {workspaceItems.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={activeModule === item.id}
                  collapsed={isRailCollapsed}
                  onClick={() => onNavigate(item.id)}
                />
              ))}
            </div>
          </div>

          <div>
            {!isRailCollapsed && <div className="rail__group-label">Manage</div>}
            <div className="rail__group">
              {NAV_MANAGE.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={activeModule === item.id}
                  collapsed={isRailCollapsed}
                  onClick={() => onNavigate(item.id)}
                />
              ))}
            </div>
          </div>
        </nav>

        <div className="rail__footer">
          <Avatar user={currentUser} />

          {!isRailCollapsed && (
            <div className="rail__user">
              <div className="rail__user-name">{currentUser?.name}</div>
              <div className="rail__user-role">{currentUser?.role}</div>
            </div>
          )}

          <button
            type="button"
            className="btn-icon rail__toggle"
            onClick={() => setIsRailCollapsed((c) => !c)}
            title={isRailCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isRailCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isRailCollapsed}
          >
            {isRailCollapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>

      {/* ---------------- Main column ---------------- */}
      <div className="shell-main">
        <header className="topbar">
          <BuildingFloorSelector
            selectedBuildingId={selectedBuildingId}
            selectedFloorId={selectedFloorId}
            onSelectBuilding={onSelectUmbcBuilding}
            onSelectFloor={onSelectUmbcFloor}
          />

          <div className="topbar__right">
            <button
              type="button"
              className="search-pill"
              onClick={onOpenQuickSearch}
              aria-label="Search"
            >
              <Search size={15} color="var(--text-secondary)" aria-hidden="true" />
              <span className="search-pill__label">Search field…</span>
              <kbd>{shortcut}</kbd>
            </button>

            <SyncBadge state={syncState} queuedCount={queuedCount} onToggle={onToggleSyncState} />

            <NotificationsMenu notifications={notifications} onMarkAllRead={markAllRead} />

            <button
              type="button"
              className="btn-icon"
              onClick={onLogout}
              title="Sign out of PunchList Pro"
              aria-label="Sign out"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="shell-content">{children}</main>

        {/* Mobile bottom tab bar (<820px) */}
        <nav className="mobile-tab-bar" aria-label="Main">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`tab-btn${active ? ' is-active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

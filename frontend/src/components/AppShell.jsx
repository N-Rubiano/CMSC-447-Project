import React, { useState, useRef, useEffect } from 'react';
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
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { umbcBuildings, getBuildingById } from '../data/umbcBuildings';

export default function AppShell({
  activeModule,
  onNavigate,
  projects,
  activeProject,
  onSelectProject,
  activeBuilding,
  onSelectBuilding,
  activeFloor,
  onSelectFloor,
  // UMBC Building & Floor Selection State & Handlers
  selectedBuildingId,
  selectedFloorId,
  onSelectUmbcBuilding,
  onSelectUmbcFloor,
  currentUser,
  openPunchCount,
  syncState, // 'synced' | 'syncing' | 'offline'
  onToggleSyncState,
  onOpenQuickSearch,
  onLogout,
  children
}) {
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'project' | 'umbc-selector' | 'notifications' | 'user'
  const [hoveredBuildingId, setHoveredBuildingId] = useState(selectedBuildingId || 'engineering');
  const [buildingSearchQuery, setBuildingSearchQuery] = useState('');
  const [mobileStep, setMobileStep] = useState('building'); // 'building' | 'floor'
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Critical Door Closer Open', text: 'PL-0401 requires positive latch verification', time: '10m ago', unread: true },
    { id: 2, title: 'RFI-0142 Answered', text: 'Throat dimension detail uploaded by Clara Oswald', time: '1h ago', unread: true },
    { id: 3, title: 'Sprinkler Inspection Passed', text: 'NFPA 13 hydrostatic test approved', time: '3h ago', unread: false }
  ]);

  const topbarRef = useRef(null);
  const sidebarRef = useRef(null);

  // Close dropdowns on outside click (checks both topbar and sidebar)
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const inTopbar = topbarRef.current && topbarRef.current.contains(e.target);
      const inSidebar = sidebarRef.current && sidebarRef.current.contains(e.target);
      if (!inTopbar && !inSidebar) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const navItemsWorkspace = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'photos', label: 'Photos', icon: Camera }
  ];

  const navItemsManage = [
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const buildings = activeProject?.buildings || [];
  const floors = activeBuilding?.floors || [];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
      {/* -------------------------------------------------------------
          LEFT RAIL (Collapsible 248px -> 72px)
          ------------------------------------------------------------- */}
      <aside
        ref={sidebarRef}
        className="desktop-rail"
        style={{
          width: isRailCollapsed ? 'var(--rail-collapsed-width)' : 'var(--rail-width)',
          backgroundColor: 'var(--ink)',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--ink-border)',
          transition: 'width var(--ease-smooth)',
          flexShrink: 0,
          zIndex: 40,
          position: 'relative'
        }}
      >
        {/* Brand Header */}
        <div style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: isRailCollapsed ? '0 18px' : '0 20px',
          gap: 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: 'var(--amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px var(--amber-glow)'
          }}>
            <HardHat size={20} color="#FFFFFF" strokeWidth={2.4} />
          </div>

          {!isRailCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                PunchList <span style={{ color: 'var(--amber)', fontWeight: 800 }}>PRO</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Workspace Group */}
          <div>
            {!isRailCollapsed && (
              <div style={{
                fontSize: 10,
                textTransform: 'uppercase',
                fontWeight: 700,
                color: '#71717A',
                letterSpacing: '0.09em',
                padding: '0 12px 8px'
              }}>
                Workspace
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navItemsWorkspace.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={isRailCollapsed ? item.label : undefined}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: isRailCollapsed ? '10px 0' : '10px 14px',
                      justifyContent: isRailCollapsed ? 'center' : 'flex-start',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(217, 119, 6, 0.16)' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#A1A1AA',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: 14,
                      transition: 'all var(--ease-quick)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#A1A1AA';
                      }
                    }}
                  >
                    {/* Active Left Amber Indicator */}
                    {isActive && (
                      <span style={{
                        position: 'absolute',
                        left: 0,
                        top: 6,
                        bottom: 6,
                        width: 3.5,
                        backgroundColor: 'var(--amber)',
                        borderRadius: '0 4px 4px 0'
                      }} />
                    )}
                    <Icon size={19} color={isActive ? 'var(--amber)' : 'currentColor'} strokeWidth={isActive ? 2.4 : 2} />
                    {!isRailCollapsed && (
                      <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    )}
                    {!isRailCollapsed && item.badge !== undefined && (
                      <span style={{
                        background: 'var(--amber)',
                        color: '#FFFFFF',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 12
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manage Group */}
          <div>
            {!isRailCollapsed && (
              <div style={{
                fontSize: 10,
                textTransform: 'uppercase',
                fontWeight: 700,
                color: '#71717A',
                letterSpacing: '0.09em',
                padding: '0 12px 8px'
              }}>
                Manage
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navItemsManage.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={isRailCollapsed ? item.label : undefined}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: isRailCollapsed ? '10px 0' : '10px 14px',
                      justifyContent: isRailCollapsed ? 'center' : 'flex-start',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(217, 119, 6, 0.16)' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#A1A1AA',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: 14,
                      transition: 'all var(--ease-quick)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#A1A1AA';
                      }
                    }}
                  >
                    {isActive && (
                      <span style={{
                        position: 'absolute',
                        left: 0,
                        top: 6,
                        bottom: 6,
                        width: 3.5,
                        backgroundColor: 'var(--amber)',
                        borderRadius: '0 4px 4px 0'
                      }} />
                    )}
                    <Icon size={19} color={isActive ? 'var(--amber)' : 'currentColor'} strokeWidth={isActive ? 2.4 : 2} />
                    {!isRailCollapsed && (
                      <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Card & Collapse Toggle at Rail Bottom */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: isRailCollapsed ? '12px 8px' : '14px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backgroundColor: 'var(--ink-dark)'
        }}>
          <img
            src={currentUser?.avatar}
            alt={currentUser?.name}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '2px solid var(--amber)',
              objectFit: 'cover',
              flexShrink: 0
            }}
          />

          {!isRailCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name}
              </div>
              <div style={{ fontSize: 11, color: '#A1A1AA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.role}
              </div>
            </div>
          )}

          <button
            onClick={() => setIsRailCollapsed(!isRailCollapsed)}
            className="btn-icon"
            title={isRailCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ color: '#A1A1AA', width: 32, height: 32 }}
          >
            {isRailCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          MAIN CONTENT AREA (Topbar + Page)
          ------------------------------------------------------------- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {/* Sticky Topbar (60px) */}
        <header
          ref={topbarRef}
          style={{
            height: 'var(--topbar-height)',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            position: 'sticky',
            top: 0,
            zIndex: 30
          }}
        >
          {/* UMBC Building & Floor Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', minWidth: 0 }}>
            {(() => {
              const selectedUmbcBuilding = getBuildingById(selectedBuildingId);
              const activePreviewBuilding = getBuildingById(hoveredBuildingId) || selectedUmbcBuilding || umbcBuildings[0];
              const filteredUmbcBuildings = umbcBuildings.filter(b => {
                if (!buildingSearchQuery.trim()) return true;
                const q = buildingSearchQuery.toLowerCase().trim();
                return b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
              });

              return (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Building Button */}
                  <button
                    id="umbc-building-btn"
                    onClick={() => {
                      setOpenDropdown(openDropdown === 'umbc-selector' ? null : 'umbc-selector');
                      setMobileStep('building');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '4px 12px',
                      borderRadius: 6,
                      border: openDropdown === 'umbc-selector' ? '1.5px solid var(--amber)' : '1px solid var(--border)',
                      backgroundColor: selectedUmbcBuilding ? 'var(--surface-muted)' : 'var(--surface-muted)',
                      cursor: 'pointer',
                      transition: 'all var(--ease-quick)'
                    }}
                    title="Select UMBC Building"
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--timber)', letterSpacing: '0.04em' }}>
                      Building
                    </span>
                    <span style={{ fontSize: 13, fontWeight: selectedUmbcBuilding ? 700 : 500, color: selectedUmbcBuilding ? 'var(--ink)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {selectedUmbcBuilding ? selectedUmbcBuilding.name : 'Select Building'}
                      <ChevronDown size={14} color="var(--text-muted)" />
                    </span>
                  </button>

                  {/* Floor Button (visible / active once building is selected, or shows Select Floor) */}
                  {selectedUmbcBuilding && (
                    <>
                      <span style={{ color: 'var(--border)', fontWeight: 300 }}>/</span>
                      <button
                        id="umbc-floor-btn"
                        onClick={() => {
                          setOpenDropdown(openDropdown === 'umbc-selector' ? null : 'umbc-selector');
                          setMobileStep('floor');
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '4px 12px',
                          borderRadius: 6,
                          border: openDropdown === 'umbc-selector' && mobileStep === 'floor' ? '1.5px solid var(--amber)' : '1px solid var(--border)',
                          backgroundColor: selectedFloorId ? 'var(--amber-light)' : 'var(--surface-muted)',
                          cursor: 'pointer',
                          transition: 'all var(--ease-quick)'
                        }}
                        title={`Select floor in ${selectedUmbcBuilding.name}`}
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--amber-hover)', letterSpacing: '0.04em' }}>
                          Floor
                        </span>
                        <span style={{ fontSize: 13, fontWeight: selectedFloorId ? 700 : 500, color: selectedFloorId ? 'var(--amber-hover)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {selectedFloorId || 'Select Floor'}
                          <ChevronDown size={14} color="var(--text-muted)" />
                        </span>
                      </button>
                    </>
                  )}

                  {/* Dropdown Menu (Desktop Flyout & Mobile/Tablet Stepper) */}
                  {openDropdown === 'umbc-selector' && (
                    <div
                      className="glass-hud floating-hud"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 8,
                        width: 'min(620px, 94vw)',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08)',
                        border: '1px solid var(--border)',
                        zIndex: 100,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* Search Header */}
                      <div style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: 'var(--surface-muted)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Building2 size={16} color="var(--amber)" />
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
                              UMBC Campus Building & Floor Selector
                            </span>
                          </div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {selectedUmbcBuilding ? (
                              <span>
                                <strong style={{ color: 'var(--ink)' }}>{selectedUmbcBuilding.name}</strong>
                                {selectedFloorId && <span style={{ color: 'var(--amber-hover)' }}> · {selectedFloorId}</span>}
                              </span>
                            ) : (
                              'Choose a building first'
                            )}
                          </div>
                        </div>

                        {/* Search input */}
                        <div style={{ position: 'relative' }}>
                          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="text"
                            value={buildingSearchQuery}
                            onChange={(e) => setBuildingSearchQuery(e.target.value)}
                            placeholder="Search 39 UMBC buildings (e.g. Engineering, ILSB, Library)..."
                            autoFocus
                            className="input-field"
                            style={{
                              width: '100%',
                              paddingLeft: 32,
                              height: 34,
                              fontSize: 12,
                              backgroundColor: '#FFFFFF'
                            }}
                          />
                        </div>

                        {/* Mobile/Tablet Step Tabs */}
                        <div className="mobile-step-tabs" style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setMobileStep('building')}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: mobileStep === 'building' ? 'var(--ink)' : 'var(--surface)',
                              color: mobileStep === 'building' ? '#FFFFFF' : 'var(--text-secondary)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            1. Building {selectedUmbcBuilding ? `(${selectedUmbcBuilding.name.split(' ')[0]})` : ''}
                          </button>
                          <button
                            onClick={() => selectedUmbcBuilding && setMobileStep('floor')}
                            disabled={!selectedUmbcBuilding}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: mobileStep === 'floor' ? 'var(--amber)' : 'var(--surface)',
                              color: mobileStep === 'floor' ? '#FFFFFF' : selectedUmbcBuilding ? 'var(--ink)' : 'var(--text-muted)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: selectedUmbcBuilding ? 'pointer' : 'not-allowed',
                              opacity: selectedUmbcBuilding ? 1 : 0.6
                            }}
                          >
                            2. Floor {selectedFloorId ? `(${selectedFloorId})` : ''}
                          </button>
                        </div>
                      </div>

                      {/* Cascading Split Pane */}
                      <div style={{ display: 'flex', height: 340, overflow: 'hidden' }}>
                        {/* Left: 39 UMBC Buildings */}
                        <div
                          className={`buildings-column ${mobileStep === 'floor' ? 'hide-on-mobile' : ''}`}
                          style={{
                            width: '54%',
                            minWidth: 260,
                            borderRight: '1px solid var(--border)',
                            overflowY: 'auto',
                            padding: 6
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--timber)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Buildings ({filteredUmbcBuildings.length})
                          </div>
                          {filteredUmbcBuildings.map((b) => {
                            const isHovered = (hoveredBuildingId || selectedBuildingId) === b.id;
                            const isSelected = selectedBuildingId === b.id;
                            const hasFloors = b.floors.length > 0;
                            return (
                              <div
                                key={b.id}
                                onMouseEnter={() => setHoveredBuildingId(b.id)}
                                onClick={() => {
                                  setHoveredBuildingId(b.id);
                                  onSelectUmbcBuilding(b.id);
                                  setMobileStep('floor');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  backgroundColor: isSelected ? 'var(--amber-light)' : isHovered ? 'var(--surface-hover)' : 'transparent',
                                  color: isSelected ? 'var(--amber-hover)' : 'var(--ink)',
                                  marginBottom: 2,
                                  transition: 'all 60ms ease-out'
                                }}
                              >
                                <div style={{ minWidth: 0, paddingRight: 6 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: isSelected || isHovered ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {b.name}
                                  </div>
                                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                    {hasFloors ? `${b.floors.length} ${b.floors.length === 1 ? 'Floor' : 'Floors'}` : 'No floors'}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  {isSelected && <CheckCircle2 size={14} color="var(--amber)" />}
                                  {hasFloors && <ChevronRight size={14} color="var(--text-muted)" />}
                                </div>
                              </div>
                            );
                          })}
                          {filteredUmbcBuildings.length === 0 && (
                            <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                              No UMBC buildings match "{buildingSearchQuery}"
                            </div>
                          )}
                        </div>

                        {/* Right: Available Floors for Hovered/Selected Building */}
                        <div
                          className={`floors-column ${mobileStep === 'building' ? 'hide-on-mobile' : ''}`}
                          style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: 8,
                            backgroundColor: 'var(--surface-muted)'
                          }}
                        >
                          {activePreviewBuilding ? (
                            <>
                              <div style={{ padding: '4px 8px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 8 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--timber)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  Available Floors
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span>{activePreviewBuilding.name}</span>
                                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {activePreviewBuilding.floors.length} {activePreviewBuilding.floors.length === 1 ? 'floor' : 'floors'}
                                  </span>
                                </div>
                              </div>

                              {activePreviewBuilding.floors.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {activePreviewBuilding.floors.map((floor) => {
                                    const isFloorSelected = selectedBuildingId === activePreviewBuilding.id && selectedFloorId === floor;
                                    return (
                                      <div
                                        key={floor}
                                        onClick={() => {
                                          onSelectUmbcFloor(floor, activePreviewBuilding.id);
                                          setOpenDropdown(null);
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '9px 12px',
                                          borderRadius: 6,
                                          cursor: 'pointer',
                                          backgroundColor: isFloorSelected ? 'var(--amber)' : '#FFFFFF',
                                          color: isFloorSelected ? '#FFFFFF' : 'var(--ink)',
                                          border: isFloorSelected ? '1px solid var(--amber)' : '1px solid var(--border-subtle)',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                          transition: 'all var(--ease-quick)'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isFloorSelected) {
                                            e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                                            e.currentTarget.style.borderColor = 'var(--amber)';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isFloorSelected) {
                                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                          }
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <Layers size={14} color={isFloorSelected ? '#FFFFFF' : 'var(--amber)'} />
                                          <span style={{ fontSize: 13, fontWeight: isFloorSelected ? 700 : 600 }}>
                                            {floor}
                                          </span>
                                        </div>
                                        {isFloorSelected && <CheckCircle2 size={15} color="#FFFFFF" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                                    No floor levels defined for this facility.
                                  </div>
                                  <button
                                    onClick={() => {
                                      onSelectUmbcFloor('Ground Floor', activePreviewBuilding.id);
                                      setOpenDropdown(null);
                                    }}
                                    className="btn btn-ghost"
                                    style={{ fontSize: 12, height: 32 }}
                                  >
                                    Select Facility
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                              Hover or tap a building on the left to reveal its floor levels.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right Controls: Search Pill, Offline Sync Badge, Notification Bell, Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search Pill with ⌘K Hint */}
            <button
              onClick={onOpenQuickSearch}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--surface-muted)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all var(--ease-quick)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--amber)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <Search size={15} color="var(--text-secondary)" />
              <span style={{ display: 'none', minWidth: 100, textAlign: 'left', '@media(min-width: 900px)': { display: 'inline' } }}>
                Search field...
              </span>
              <kbd style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                fontWeight: 600
              }}>
                ⌘K
              </kbd>
            </button>

            {/* Offline Sync Badge (Cycles states: synced -> syncing -> offline on click) */}
            <button
              onClick={onToggleSyncState}
              title="Click to cycle offline sync state (demo)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                border: syncState === 'synced'
                  ? '1px solid #86EFAC'
                  : syncState === 'syncing'
                    ? '1px solid #FCD34D'
                    : '1px solid #FCA5A5',
                backgroundColor: syncState === 'synced'
                  ? '#F0FDF4'
                  : syncState === 'syncing'
                    ? '#FFFBEB'
                    : '#FEF2F2',
                color: syncState === 'synced'
                  ? '#166534'
                  : syncState === 'syncing'
                    ? '#B45309'
                    : '#991B1B',
                transition: 'all var(--ease-quick)'
              }}
            >
              {syncState === 'synced' && (
                <>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#16A34A' }} />
                  <span>SYNCED</span>
                </>
              )}
              {syncState === 'syncing' && (
                <>
                  <RefreshCw size={12} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>SYNCING…</span>
                </>
              )}
              {syncState === 'offline' && (
                <>
                  <WifiOff size={13} color="#DC2626" />
                  <span>OFFLINE · 2 QUEUED</span>
                </>
              )}
            </button>

            {/* Notification Bell with Unread Dot */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setOpenDropdown(openDropdown === 'notifications' ? null : 'notifications')}
                className="btn-icon"
                style={{ position: 'relative' }}
              >
                <Bell size={19} />
                <span style={{
                  position: 'absolute',
                  top: 7,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'var(--amber)',
                  border: '1.5px solid #FFFFFF'
                }} />
              </button>

              {openDropdown === 'notifications' && (
                <div
                  className="glass-hud"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    width: 320,
                    padding: 12,
                    zIndex: 50
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Field Notifications</span>
                    <span style={{ fontSize: 11, color: 'var(--amber)', cursor: 'pointer', fontWeight: 600 }}>Mark all read</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {notifications.map((n) => (
                      <div key={n.id} style={{ padding: '8px 10px', borderRadius: 6, backgroundColor: n.unread ? 'var(--amber-light)' : 'var(--surface-muted)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{n.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{n.text}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="btn-icon"
              title="Sign out of PunchList Pro"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page View Container */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {children}
        </main>

        {/* -------------------------------------------------------------
            MOBILE BOTTOM TAB BAR (Screens <820px)
            ------------------------------------------------------------- */}
        <nav
          className="mobile-tab-bar"
          style={{
            height: 56,
            backgroundColor: 'var(--ink)',
            borderTop: '1px solid var(--ink-border)',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 40,
            padding: '0 6px'
          }}
        >
          {navItemsWorkspace.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? 'var(--amber)' : '#A1A1AA',
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  padding: '6px 12px'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => onNavigate('team')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'transparent',
              border: 'none',
              color: activeModule === 'team' ? 'var(--amber)' : '#A1A1AA',
              fontSize: 10,
              fontWeight: activeModule === 'team' ? 700 : 500,
              cursor: 'pointer',
              padding: '6px 12px'
            }}
          >
            <Users size={18} />
            <span>Team</span>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'transparent',
              border: 'none',
              color: activeModule === 'settings' ? 'var(--amber)' : '#A1A1AA',
              fontSize: 10,
              fontWeight: activeModule === 'settings' ? 700 : 500,
              cursor: 'pointer',
              padding: '6px 12px'
            }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

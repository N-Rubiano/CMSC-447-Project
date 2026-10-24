import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  FileText,
  LayoutDashboard,
  Layers,
  Wifi,
  WifiOff,
  Upload,
  Plus,
  ChevronDown,
  ChevronRight,
  Users,
  CheckCircle2,
  LogOut,
  Lock,
  Shield,
  HardHat,
  Wrench,
  History,
  RefreshCw,
  MoreHorizontal,
  MoreVertical,
  Search,
  Zap,
  X
} from 'lucide-react';
import { umbcBuildings, getBuildingById, sheetMatchesBuildingAndFloor } from '../data/umbcBuildings';
import './Navbar.css';

export default function Navbar({
  projects = [],
  activeProject,
  onSelectProject,
  sheets = [],
  activeSheet,
  onSelectSheet,
  onOpenSheetBrowser,
  onOpenNewProject,
  onOpenUpload,
  onOpenUploadBlueprint,
  onOpenVersionHistory,
  onOpenUploadVersion,
  viewMode,
  onChangeViewMode,
  isOnline,
  pendingSyncCount,
  onTriggerSync,
  currentUser,
  onLogout,
  onOpenProjectTeam,
  // UMBC Building & Floor Selection State & Callbacks
  selectedBuildingId = null,
  selectedFloorId = null,
  onSelectBuilding,
  onSelectFloor,
  onClearBuildingFloor
}) {
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showSheetDropdown, setShowSheetDropdown] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  // Building & Floor dropdown state
  const [hoveredBuildingId, setHoveredBuildingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState('buildings'); // 'buildings' | 'floors'

  const ROLE_DISPLAY = {
    admin: { label: 'Facility Admin', icon: Shield, color: '#DC2626', bg: '#FEE2E2' },
    general_contractor: { label: 'General Contractor', icon: HardHat, color: '#D97706', bg: '#FEF3C7' },
    sub_contractor: { label: 'Subcontractor', icon: Wrench, color: '#4B5563', bg: '#F3F4F6' },
    architect: { label: 'Architect', icon: Layers, color: '#2563EB', bg: '#DBEAFE' },
    owner: { label: 'Owner Rep', icon: Building2, color: '#059669', bg: '#D1FAE5' },
    field_inspector: { label: 'Field Inspector', icon: CheckCircle2, color: '#EA580C', bg: '#FFEDD5' }
  };
  const roleInfo = ROLE_DISPLAY[currentUser?.role] || { label: currentUser?.role || 'User', icon: Shield, color: '#4B5563', bg: '#F3F4F6' };

  // Close dropdowns on outside click
  const navRef = useRef(null);
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setShowBuildingDropdown(false);
        setShowProjectDropdown(false);
        setShowSheetDropdown(false);
        setShowOverflowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'general_contractor';

  // Selected building object
  const selectedBuildingObj = getBuildingById(selectedBuildingId);

  // Filtered buildings based on search input
  const filteredBuildings = umbcBuildings.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
  });

  // Active building in the dropdown flyout (hovered or selected or first match)
  const activeBuildingObj = getBuildingById(
    hoveredBuildingId || selectedBuildingId || (filteredBuildings[0]?.id)
  );

  return (
    <div ref={navRef} style={{ width: '100%', flexShrink: 0, zIndex: 100 }}>
      {/* ── Main Top Bar ── */}
      <header className="navbar-header">

        {/* Left Section: Brand & Desktop Selectors */}
        <div className="navbar-left">
          {/* Brand */}
          <div className="navbar-brand">
            <div className="navbar-brand-icon">
              <Layers size={16} color="#FEF3C7" />
            </div>
            <div className="navbar-brand-title">
              <span>PUNCHLIST</span>
              <span className="navbar-brand-badge">PRO</span>
            </div>
          </div>

          <div className="navbar-divider" />

          {/* Desktop Selectors Workflow: Building → Floor → Floor Blueprint → Current Projects */}
          <div className="navbar-desktop-selectors">

            {/* 1. UMBC Building & Floor Selector */}
            <div className="navbar-building-group" style={{ position: 'relative' }}>
              <div className="navbar-label-pair">
                <span className="navbar-item-label">Building:</span>
                <button
                  onClick={() => {
                    setShowBuildingDropdown(!showBuildingDropdown);
                    setShowProjectDropdown(false);
                    setShowSheetDropdown(false);
                    setShowOverflowMenu(false);
                    if (!showBuildingDropdown && selectedBuildingId) {
                      setHoveredBuildingId(selectedBuildingId);
                      setMobileTab('buildings');
                    }
                  }}
                  className={`navbar-selector-btn ${selectedBuildingObj ? 'navbar-selector-btn--highlight' : ''}`}
                  title={selectedBuildingObj ? selectedBuildingObj.name : 'Select UMBC Building'}
                >
                  <Building2 size={13} color="#D97706" style={{ flexShrink: 0 }} />
                  <span className="navbar-selector-text" style={{ maxWidth: 130 }}>
                    {selectedBuildingObj ? selectedBuildingObj.name : 'Select Building'}
                  </span>
                  <ChevronDown size={11} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                </button>
              </div>

              {/* Floor Selector Trigger (appears once building is selected or prompts selection) */}
              {selectedBuildingObj && (
                <div className="navbar-label-pair">
                  <span className="navbar-item-label">Floor:</span>
                  <button
                    onClick={() => {
                      setShowBuildingDropdown(true);
                      setHoveredBuildingId(selectedBuildingId);
                      setMobileTab('floors');
                      setShowProjectDropdown(false);
                      setShowSheetDropdown(false);
                    }}
                    className={`navbar-selector-btn ${selectedFloorId ? 'navbar-selector-btn--highlight' : 'navbar-selector-btn--pulse'}`}
                    title={selectedFloorId ? `Selected Floor: ${selectedFloorId}` : 'Select Floor for this Building'}
                  >
                    <Layers size={13} color="#D97706" style={{ flexShrink: 0 }} />
                    <span className="navbar-selector-text" style={{ maxWidth: 100 }}>
                      {selectedFloorId || 'Select Floor'}
                    </span>
                    <ChevronDown size={11} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                  </button>
                </div>
              )}

              {/* Building → Floor Dual-Pane Cascading Dropdown */}
              {showBuildingDropdown && (
                <div className="navbar-dropdown-card navbar-building-dropdown">
                  {/* Dropdown Header with Search and Clear action */}
                  <div className="navbar-building-dropdown-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        UMBC Campus Buildings ({umbcBuildings.length})
                      </span>
                      {(selectedBuildingId || selectedFloorId) && (
                        <button
                          onClick={() => {
                            onClearBuildingFloor?.();
                            setHoveredBuildingId(null);
                          }}
                          className="navbar-clear-btn"
                          title="Clear current building and floor selection"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    <div className="navbar-search-bar">
                      <Search size={13} color="#78716C" />
                      <input
                        type="text"
                        placeholder="Search 39 UMBC buildings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="navbar-search-input"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716C', padding: 0 }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Mobile Tab Switcher (Touch devices) */}
                    <div className="navbar-mobile-tab-switch">
                      <button
                        onClick={() => setMobileTab('buildings')}
                        className={`navbar-tab-btn ${mobileTab === 'buildings' ? 'active' : ''}`}
                      >
                        1. Select Building
                      </button>
                      <button
                        onClick={() => setMobileTab('floors')}
                        className={`navbar-tab-btn ${mobileTab === 'floors' ? 'active' : ''}`}
                        disabled={!activeBuildingObj}
                      >
                        2. Select Floor ({activeBuildingObj?.floors?.length || 0})
                      </button>
                    </div>
                  </div>

                  {/* Dual Column Content: Buildings (Left) & Floors (Right) */}
                  <div className="navbar-dual-pane-body">
                    {/* Left Column: Buildings List */}
                    <div className={`navbar-pane-left ${mobileTab === 'buildings' ? 'mobile-visible' : 'mobile-hidden'}`}>
                      {filteredBuildings.length === 0 ? (
                        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                          No buildings found matching "{searchQuery}"
                        </div>
                      ) : (
                        filteredBuildings.map(b => {
                          const isSelected = b.id === selectedBuildingId;
                          const isHovered = b.id === (hoveredBuildingId || selectedBuildingId);
                          return (
                            <div
                              key={b.id}
                              onMouseEnter={() => setHoveredBuildingId(b.id)}
                              onClick={() => {
                                setHoveredBuildingId(b.id);
                                setMobileTab('floors');
                                if (b.id !== selectedBuildingId) {
                                  onSelectBuilding?.(b.id);
                                }
                              }}
                              className={`navbar-building-row ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: isSelected ? 800 : 600, fontSize: 12, color: isSelected ? '#D97706' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {b.name}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  {b.floors.length === 0 ? 'No floors listed' : `${b.floors.length} floor${b.floors.length > 1 ? 's' : ''}`}
                                </div>
                              </div>
                              <ChevronRight size={13} color={isHovered ? '#D97706' : '#A8A29E'} style={{ flexShrink: 0 }} />
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Right Column: Floors for the active building */}
                    <div className={`navbar-pane-right ${mobileTab === 'floors' ? 'mobile-visible' : 'mobile-hidden'}`}>
                      {activeBuildingObj ? (
                        <div>
                          <div className="navbar-floor-pane-header">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#5C3A21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {activeBuildingObj.name}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectBuilding?.(activeBuildingObj.id);
                                  setShowBuildingDropdown(false);
                                }}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: 10,
                                  fontWeight: 800,
                                  backgroundColor: '#D97706',
                                  border: '1px solid #B45309',
                                  color: '#FFFFFF',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                                title={`Select ${activeBuildingObj.name}`}
                              >
                                Select Building
                              </button>
                            </div>
                            <div style={{ fontSize: 10, color: '#D97706', fontWeight: 700, marginTop: 4 }}>
                              Available Floors:
                            </div>
                          </div>

                          {activeBuildingObj.floors.length === 0 ? (
                            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11.5 }}>
                              <div style={{ marginBottom: 10 }}>No floor plans registered for this building yet.</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectBuilding?.(activeBuildingObj.id);
                                    setShowBuildingDropdown(false);
                                  }}
                                  style={{
                                    padding: '5px 12px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    backgroundColor: '#D97706',
                                    border: '1px solid #B45309',
                                    color: '#FFFFFF',
                                    borderRadius: 6,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Select {activeBuildingObj.name}
                                </button>
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowBuildingDropdown(false);
                                      onSelectBuilding?.(activeBuildingObj.id);
                                      onOpenUploadBlueprint?.({
                                        buildingName: activeBuildingObj.name,
                                        floorLevel: ''
                                      });
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      padding: '5px 10px',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      backgroundColor: '#FEF3C7',
                                      border: '1px solid #FCD34D',
                                      color: '#92400E',
                                      borderRadius: 6,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Upload size={11} color="#D97706" />
                                    <span>Upload First Blueprint</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {activeBuildingObj.floors.map((fl, idx) => {
                                const isFloorActive = selectedBuildingId === activeBuildingObj.id && selectedFloorId === fl;
                                const isLast = idx === activeBuildingObj.floors.length - 1;

                                // Check if blueprint already exists in database for this floor
                                const hasBlueprint = sheets.some(s => sheetMatchesBuildingAndFloor(s, activeBuildingObj.id, fl));

                                return (
                                  <div
                                    key={fl}
                                    onClick={() => {
                                      if (selectedBuildingId !== activeBuildingObj.id) {
                                        onSelectBuilding?.(activeBuildingObj.id);
                                      }
                                      onSelectFloor?.(fl);
                                      setShowBuildingDropdown(false);
                                    }}
                                    className={`navbar-floor-row ${isFloorActive ? 'active' : ''}`}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9CA3AF', marginRight: 6 }}>
                                        {isLast ? '└──' : '├──'}
                                      </span>
                                      <span style={{ flex: 1, textAlign: 'left', fontWeight: isFloorActive ? 800 : 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {fl}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 6 }}>
                                      {hasBlueprint ? (
                                        <span style={{
                                          fontSize: 9.5,
                                          backgroundColor: '#ECFDF5',
                                          color: '#047857',
                                          border: '1px solid #A7F3D0',
                                          padding: '1px 5px',
                                          borderRadius: 4,
                                          fontWeight: 700
                                        }}>
                                          Blueprint
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowBuildingDropdown(false);
                                            if (selectedBuildingId !== activeBuildingObj.id) {
                                              onSelectBuilding?.(activeBuildingObj.id);
                                            }
                                            onSelectFloor?.(fl);
                                            onOpenUploadBlueprint?.({
                                              buildingName: activeBuildingObj.name,
                                              floorLevel: fl
                                            });
                                          }}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            backgroundColor: '#FEF3C7',
                                            border: '1px solid #FCD34D',
                                            color: '#92400E',
                                            fontSize: 9.5,
                                            fontWeight: 800,
                                            cursor: 'pointer'
                                          }}
                                          title={`Upload a blueprint drawing for ${fl}`}
                                        >
                                          <Upload size={10} color="#D97706" />
                                          <span>Upload</span>
                                        </button>
                                      )}

                                      {isFloorActive && <CheckCircle2 size={13} color="#D97706" />}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Quick Upload action at bottom of floor list */}
                              {canManage && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-default, #DCD5C8)' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowBuildingDropdown(false);
                                      if (selectedBuildingId !== activeBuildingObj.id) {
                                        onSelectBuilding?.(activeBuildingObj.id);
                                      }
                                      onOpenUploadBlueprint?.({
                                        buildingName: activeBuildingObj.name,
                                        floorLevel: selectedFloorId || activeBuildingObj.floors[0] || ''
                                      });
                                    }}
                                    className="btn-ghost"
                                    style={{
                                      width: '100%',
                                      justifyContent: 'flex-start',
                                      color: '#B45309',
                                      fontWeight: 800,
                                      fontSize: 11,
                                      gap: 6,
                                      padding: '6px 8px',
                                      borderRadius: 6,
                                      backgroundColor: '#FEF3C7',
                                      border: '1px dashed #FCD34D'
                                    }}
                                  >
                                    <Upload size={12} color="#D97706" />
                                    <span>+ Upload Blueprint for {activeBuildingObj.name}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11.5 }}>
                          Hover or tap a building to view floors
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Floor Blueprint (Sheet Selector Dropdown & Version Badge) */}
            {activeProject && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setShowSheetDropdown(!showSheetDropdown);
                    setShowProjectDropdown(false);
                    setShowBuildingDropdown(false);
                    setShowOverflowMenu(false);
                  }}
                  className="navbar-selector-btn"
                  style={{ backgroundColor: '#FAFAF9' }}
                  title={activeSheet ? `${activeSheet.sheet_number} — ${activeSheet.name}` : 'Select Sheet'}
                >
                  <FileText size={13} color="#D97706" style={{ flexShrink: 0 }} />
                  <span className="navbar-selector-text">
                    {activeSheet ? `${activeSheet.sheet_number} — ${activeSheet.name}` : 'Select Sheet'}
                  </span>
                  <ChevronDown size={12} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                </button>

                {showSheetDropdown && (
                  <div className="navbar-dropdown-card" style={{ width: 340 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-brown)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Plan Sheets ({sheets.length})
                      </span>
                      <button
                        onClick={() => { onOpenSheetBrowser(); setShowSheetDropdown(false); }}
                        className="btn-ghost"
                        style={{ padding: '2px 6px', fontSize: 11, color: '#D97706', fontWeight: 700 }}
                      >
                        Browse All
                      </button>
                    </div>
                    <div style={{ maxHeight: 'min(380px, calc(100vh - 120px))', overflowY: 'auto' }}>
                      {sheets.map(s => (
                        <div
                          key={s.id}
                          onClick={() => {
                            onSelectSheet(s);
                            setShowSheetDropdown(false);
                            if (onChangeViewMode) onChangeViewMode('field');
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: s.id === activeSheet?.id ? 'var(--bg-surface-2)' : 'transparent',
                            color: s.id === activeSheet?.id ? '#D97706' : 'var(--text-main)',
                            marginBottom: 2
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = s.id === activeSheet?.id ? 'var(--bg-surface-2)' : 'transparent'}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>{s.sheet_number}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                          </div>
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 9, background: '#F4F4F5', color: '#52525B', border: '1px solid #E4E4E7', padding: '1px 5px', borderRadius: 4, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                              {s.version || 'Rev 1'}
                            </span>
                            <span style={{ fontSize: 9.5, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>
                              {s.open_pin_count || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-default)', marginTop: 6, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {activeSheet && canManage && (
                        <button
                          onClick={() => {
                            if (onOpenUploadVersion) onOpenUploadVersion(activeSheet);
                            setShowSheetDropdown(false);
                          }}
                          className="btn-ghost"
                          style={{ width: '100%', justifyContent: 'flex-start', color: '#B45309', fontWeight: 800, fontSize: 11.5, gap: 6 }}
                        >
                          <RefreshCw size={13} color="#D97706" /> Upload Latest Revision for {activeSheet.sheet_number}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (onOpenUploadBlueprint) onOpenUploadBlueprint();
                          setShowSheetDropdown(false);
                        }}
                        className="btn-ghost"
                        style={{ width: '100%', justifyContent: 'flex-start', color: '#92400E', fontWeight: 800, fontSize: 11.5, gap: 6 }}
                      >
                        <Building2 size={13} color="#D97706" /> Upload Building Blueprint
                      </button>
                      <button
                        onClick={() => { onOpenUpload(); setShowSheetDropdown(false); }}
                        className="btn-ghost"
                        style={{ width: '100%', justifyContent: 'flex-start', color: '#5C3A21', fontWeight: 700, fontSize: 11.5, gap: 6 }}
                      >
                        <Upload size={13} /> Upload Drawing PDF Set
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Active Sheet Version Badge & Quick History Trigger */}
            {activeSheet && (
              <div className="navbar-version-group">
                <button
                  onClick={() => onOpenVersionHistory?.(activeSheet)}
                  className="navbar-version-badge"
                  title={`Active Revision: ${activeSheet.version || 'Rev 1'} — Click to view timeline`}
                >
                  <History size={12} color="#4F46E5" />
                  <span>{activeSheet.version || 'Rev 1'}</span>
                </button>

                {canManage && (
                  <button
                    onClick={() => onOpenUploadVersion?.(activeSheet)}
                    className="navbar-rev-btn"
                    title={`Upload latest revision for ${activeSheet.sheet_number}`}
                  >
                    <RefreshCw size={11} color="#D97706" />
                    <span className="navbar-btn-text">+Rev</span>
                  </button>
                )}
              </div>
            )}


          </div>
        </div>

        {/* Center Section: View Mode Switch */}
        <div className="navbar-center">
          <div className="navbar-view-switch">
            <button
              onClick={() => onChangeViewMode('field')}
              className={`navbar-view-btn ${viewMode === 'field' ? 'navbar-view-btn--active' : 'navbar-view-btn--inactive'}`}
              title="Field Plan View"
            >
              <Layers size={14} color={viewMode === 'field' ? '#FEF3C7' : 'currentColor'} />
              <span className="navbar-view-btn-text">Plan</span>
            </button>

            <button
              onClick={() => onChangeViewMode('report')}
              className={`navbar-view-btn ${viewMode !== 'field' ? 'navbar-view-btn--active' : 'navbar-view-btn--inactive'}`}
              title="Dashboard & Project Overview"
            >
              <LayoutDashboard size={14} color={viewMode !== 'field' ? '#FEF3C7' : 'currentColor'} />
              <span className="navbar-view-btn-text">
                Dashboard
              </span>
            </button>
          </div>
        </div>

        {/* Right Section: Sync Status & User Profile */}
        <div className="navbar-right">
          {/* Quick Actions Control */}
          {canManage && (
            <div className="navbar-quick-actions-wrap" style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowOverflowMenu(!showOverflowMenu);
                  setShowProjectDropdown(false);
                  setShowSheetDropdown(false);
                  setShowBuildingDropdown(false);
                }}
                className={`navbar-quick-actions-btn ${showOverflowMenu ? 'navbar-quick-actions-btn--active' : ''}`}
                title="Quick Actions"
                aria-label="Quick Actions"
                aria-expanded={showOverflowMenu}
              >
                <Zap size={14} className="navbar-quick-actions-icon" />
                <span className="navbar-quick-actions-text">Quick Actions</span>
                <ChevronDown size={11} className="navbar-quick-actions-chevron" />
              </button>

              {showOverflowMenu && (
                <div className="navbar-dropdown-card navbar-quick-actions-menu">
                  <div className="navbar-quick-actions-menu-header">
                    <Zap size={12} color="#D97706" />
                    <span>Quick Actions</span>
                  </div>
                  <div style={{ padding: '4px' }}>
                    {onOpenNewProject && (
                      <button
                        onClick={() => { onOpenNewProject(); setShowOverflowMenu(false); }}
                        className="btn-ghost"
                        style={{ width: '100%', justifyContent: 'flex-start', color: '#18181B', fontWeight: 700, fontSize: 12, gap: 8, padding: '7px 10px', borderRadius: 6 }}
                      >
                        <Plus size={13} color="#D97706" /> New Project
                      </button>
                    )}
                    {activeSheet && (
                      <button
                        onClick={() => { onOpenUploadVersion(activeSheet); setShowOverflowMenu(false); }}
                        className="btn-ghost"
                        style={{ width: '100%', justifyContent: 'flex-start', color: '#92400E', fontWeight: 700, fontSize: 12, gap: 8, padding: '7px 10px', borderRadius: 6 }}
                      >
                        <RefreshCw size={13} color="#D97706" /> Upload New Revision
                      </button>
                    )}
                    <button
                      onClick={() => { onOpenUploadBlueprint(); setShowOverflowMenu(false); }}
                      className="btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', color: '#92400E', fontWeight: 700, fontSize: 12, gap: 8, padding: '7px 10px', borderRadius: 6 }}
                    >
                      <Building2 size={13} color="#D97706" /> Upload Blueprint
                    </button>
                    <button
                      onClick={() => { onOpenProjectTeam(); setShowOverflowMenu(false); }}
                      className="btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', color: '#5C3A21', fontWeight: 700, fontSize: 12, gap: 8, padding: '7px 10px', borderRadius: 6 }}
                    >
                      <Users size={13} color="#5C3A21" /> Team & Subcontractors
                    </button>
                    <button
                      onClick={() => { onOpenSheetBrowser(); setShowOverflowMenu(false); }}
                      className="btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', color: '#5C3A21', fontWeight: 700, fontSize: 12, gap: 8, padding: '7px 10px', borderRadius: 6 }}
                    >
                      <FileText size={13} color="#5C3A21" /> Browse Plan Sheets
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Offline / Online Sync Indicator */}
          <div
            onClick={onTriggerSync}
            className="navbar-sync-badge"
            title={isOnline ? 'Online — Live Cloud Sync Connected' : 'Offline Mode — Changes Stored Locally'}
          >
            <div className={`navbar-status-dot ${isOnline ? 'status-dot-active' : 'status-dot-warning'}`} />
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="navbar-sync-text">{isOnline ? 'LIVE SYNC' : 'OFFLINE'}</span>
            {pendingSyncCount > 0 && (
              <span className="navbar-sync-counter">
                {pendingSyncCount}
              </span>
            )}
          </div>

          {/* User Profile Avatar & Info */}
          <div className="navbar-user-chip">
            <img
              src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt="User avatar"
              className="navbar-avatar"
            />
            <div className="navbar-user-info">
              <div className="navbar-user-name">
                {currentUser?.name || 'User'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: roleInfo.color,
                  backgroundColor: roleInfo.bg,
                  padding: '1px 5px',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="navbar-signout-btn"
            >
              <LogOut size={13} className="navbar-signout-icon" />
              <span className="navbar-signout-text">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Sub-Bar for Mobile Devices (< 768px) ── */}
      <div className="navbar-mobile-subbar">
        {/* Mobile Building Selector */}
        <button
          onClick={() => {
            setShowBuildingDropdown(true);
            setMobileTab('buildings');
            setShowProjectDropdown(false);
            setShowSheetDropdown(false);
          }}
          className={`navbar-selector-btn ${selectedBuildingObj ? 'navbar-selector-btn--highlight' : ''}`}
          style={{ flexShrink: 0 }}
        >
          <Building2 size={12} color="#D97706" />
          <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5 }}>
            {selectedBuildingObj ? selectedBuildingObj.name : 'Select Building'}
          </span>
          <ChevronDown size={11} color="#78716C" />
        </button>

        {/* Mobile Floor Selector (if building selected) */}
        {selectedBuildingObj && (
          <button
            onClick={() => {
              setShowBuildingDropdown(true);
              setHoveredBuildingId(selectedBuildingId);
              setMobileTab('floors');
              setShowProjectDropdown(false);
              setShowSheetDropdown(false);
            }}
            className={`navbar-selector-btn ${selectedFloorId ? 'navbar-selector-btn--highlight' : ''}`}
            style={{ flexShrink: 0 }}
          >
            <Layers size={12} color="#D97706" />
            <span style={{ maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5 }}>
              {selectedFloorId || 'Select Floor'}
            </span>
            <ChevronDown size={11} color="#78716C" />
          </button>
        )}

        {/* Sheet Selector (Mobile) */}
        {activeProject && (
          <button
            onClick={() => {
              setShowSheetDropdown(!showSheetDropdown);
              setShowProjectDropdown(false);
              setShowBuildingDropdown(false);
            }}
            className="navbar-selector-btn"
            style={{ flexShrink: 0 }}
          >
            <FileText size={12} color="#D97706" />
            <span style={{ maxWidth: 95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5 }}>
              {activeSheet ? `${activeSheet.sheet_number} — ${activeSheet.name}` : 'Select Sheet'}
            </span>
            <ChevronDown size={11} color="#78716C" />
          </button>
        )}

        {/* Version Badge (Mobile) */}
        {activeSheet && (
          <button
            onClick={() => onOpenVersionHistory?.(activeSheet)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '3px 7px',
              borderRadius: 6,
              backgroundColor: '#EEF2FF',
              border: '1px solid #C7D2FE',
              color: '#4338CA',
              fontSize: 10.5,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <History size={11} />
            <span>{activeSheet.version || 'Rev 1'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

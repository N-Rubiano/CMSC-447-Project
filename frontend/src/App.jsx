import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';

// ── Critical path: load these synchronously (needed for first paint) ────────
import LoginPage from './components/LoginPage';
import { api, getSocket } from './services/api';
import { supabase } from './services/supabase';

// ── Lazy-loaded pages: each becomes its own JS chunk ───────────────────────
// Chunks only download when the user first visits that section.
const AppShell              = lazy(() => import('./components/AppShell'));
const Dashboard             = lazy(() => import('./components/Dashboard'));
const BlueprintViewer       = lazy(() => import('./components/BlueprintViewer'));
const DocumentsPage         = lazy(() => import('./components/DocumentsPage'));
const PhotosPage            = lazy(() => import('./components/PhotosPage'));
const TeamPage              = lazy(() => import('./components/TeamPage'));
const SettingsPage          = lazy(() => import('./components/SettingsPage'));
const PrivacyPolicy         = lazy(() => import('./components/PrivacyPolicy'));
const TermsAndConditions    = lazy(() => import('./components/TermsAndConditions'));

// ── Lazy-loaded modals: framer-motion + MailSlotUpload only load when modal opens ──
const QuickSearchModal      = lazy(() => import('./components/QuickSearchModal'));
const NewPunchModal         = lazy(() => import('./components/NewPunchModal'));
const BlueprintUploadModal  = lazy(() => import('./components/BlueprintUploadModal'));

// ── Lightweight full-screen loader shown while any chunk is downloading ─────
function PageLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', backgroundColor: 'var(--bg, #F8F7F4)',
      zIndex: 9999, gap: 12, fontFamily: 'var(--font-sans, Inter, sans-serif)',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2.5px solid #D97706', borderTopColor: 'transparent',
        animation: 'spin 0.7s linear infinite', display: 'inline-block',
      }} />
      <span style={{ fontSize: 14, color: '#78716C', fontWeight: 500 }}>Loading…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import {
  PROJECTS,
  SHEETS,
  INITIAL_PUNCH_ITEMS,
  TEAM_MEMBERS,
  TRADE_PARTNERS,
  DOCUMENTS,
  FIELD_PHOTOS,
  CURRENT_USER
} from './data/mockData';
import { umbcBuildings, getBuildingById, sheetMatchesBuildingAndFloor } from './data/umbcBuildings';

import './styles/theme.css';


export default function App() {
  // -------------------------------------------------------------
  // AUTH STATE & INITIALIZATION
  // -------------------------------------------------------------
  const [authInitializing, setAuthInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('punchlist_user');
      return saved ? JSON.parse(saved) : CURRENT_USER;
    } catch {
      return CURRENT_USER;
    }
  });

  // Internal helper: map any user object (Supabase or local) to app state & persist
  const _handleLoginUser = useCallback((userInfo) => {
    if (!userInfo) return;
    let finalUser = CURRENT_USER;
    const role = userInfo.role || userInfo.email;
    if (role === 'executive' || userInfo.email?.includes('sarah.chen')) {
      finalUser = TEAM_MEMBERS[1];
    } else if (role === 'foreman' || userInfo.email?.includes('elena')) {
      finalUser = {
        id: userInfo.id || 'tp-2',
        name: userInfo.name || userInfo.email?.split('@')[0] || 'Elena Rostova',
        email: userInfo.email || 'elena@primedrywall.com',
        role: userInfo.role || 'Drywall Foreman',
        company: userInfo.company || 'Prime Drywall & Doors',
        avatar: userInfo.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
      };
    } else {
      finalUser = {
        ...CURRENT_USER,
        ...userInfo,
        name: userInfo.name || userInfo.email?.split('@')[0] || CURRENT_USER.name,
      };
    }
    setCurrentUser(finalUser);
    try {
      localStorage.setItem('punchlist_user', JSON.stringify(finalUser));
    } catch (_) {}
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    setIsAuthenticated(false);
    setSelectedPinId(null);
    setCurrentUser(CURRENT_USER);
    try {
      localStorage.removeItem('punchlist_user');
      localStorage.removeItem('punchlist_auth_token');
    } catch (_) {}
    try {
      await api.logout();
    } catch (_) {}
  }, []);

  // -------------------------------------------------------------
  // PROJECT, BUILDING, FLOOR & SHEET CASCADING STATE
  // -------------------------------------------------------------
  const [projects, setProjects] = useState(PROJECTS);
  const [activeProject, setActiveProject] = useState(PROJECTS[0]);
  const [activeBuilding, setActiveBuilding] = useState(PROJECTS[0].buildings[0]);
  const [activeFloor, setActiveFloor] = useState(PROJECTS[0].buildings[0].floors[3]); // Level 03
  const [sheets, setSheets] = useState(SHEETS);
  const [activeSheet, setActiveSheet] = useState(SHEETS[0]); // A-301

  // -------------------------------------------------------------
  // UMBC CAMPUS BUILDING & FLOOR SELECTION STATE
  // -------------------------------------------------------------
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedFloorId, setSelectedFloorId] = useState(null);

  // -------------------------------------------------------------
  // PUNCH LIST & APP DATA STATE
  // -------------------------------------------------------------
  const [punchItems, setPunchItems] = useState(INITIAL_PUNCH_ITEMS);
  const [selectedPinId, setSelectedPinId] = useState(null);

  // -------------------------------------------------------------
  // VIEW NAVIGATION & SYNC STATE
  // -------------------------------------------------------------
  const [activeModule, setActiveModule] = useState('dashboard'); // 'dashboard' | 'blueprints' | 'documents' | 'photos' | 'team' | 'settings'
  const [syncState, setSyncState] = useState('synced'); // 'synced' | 'syncing' | 'offline'
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [isNewPunchModalOpen, setIsNewPunchModalOpen] = useState(false);
  const [newPunchCoords, setNewPunchCoords] = useState(null);

  // Blueprint Upload Modal State
  const [isBlueprintUploadOpen, setIsBlueprintUploadOpen] = useState(false);
  const [blueprintModalMode, setBlueprintModalMode] = useState('new'); // 'new' | 'version'
  const [blueprintTargetSheet, setBlueprintTargetSheet] = useState(null);

  const handleOpenUploadBlueprint = (mode = 'new', target = null) => {
    setBlueprintModalMode(mode);
    setBlueprintTargetSheet(target || activeSheet);
    setIsBlueprintUploadOpen(true);
  };

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // REAL-TIME AUDIT LOGS STATE (100% Dynamic, PostgreSQL Persisted)
  // -------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('punchlist_realtime_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch persisted logs from Supabase database on mount
  useEffect(() => {
    async function loadAuditLogs() {
      try {
        const dbLogs = await api.getAuditLogs();
        if (Array.isArray(dbLogs)) {
          setAuditLogs(dbLogs);
        }
      } catch (err) {
        console.warn('Could not load audit logs from database:', err);
      }
    }
    loadAuditLogs();
  }, []);

  // Fetch persisted sheets / blueprints from Supabase database on mount & project change
  useEffect(() => {
    async function loadSheets() {
      try {
        const pId = activeProject?.id || 'proj-1';
        const dbSheets = await api.getSheets(pId);
        if (Array.isArray(dbSheets) && dbSheets.length > 0) {
          setSheets(prev => {
            const dbIds = new Set(dbSheets.map(s => s.id));
            const remaining = prev.filter(s => !dbIds.has(s.id));
            return [...dbSheets, ...remaining];
          });
        }
      } catch (err) {
        console.warn('Could not load sheets from database:', err);
      }
    }
    loadSheets();
  }, [activeProject?.id]);

  useEffect(() => {
    try {
      localStorage.setItem('punchlist_realtime_audit_logs', JSON.stringify(auditLogs));
    } catch (e) {
      // ignore
    }
  }, [auditLogs]);

  const addAuditLog = useCallback(({ category, action, details, target, actor, role, company, projectId, pinId }) => {
    const cat = category || 'Status';
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      category: cat,
      action: action || 'Action Recorded',
      details: details || '',
      target: target || '—',
      actor: actor || currentUser?.name || 'Field Inspector',
      actorRole: role || currentUser?.role || 'Field Operations',
      actorCompany: company || currentUser?.company || 'Apex Construction GC',
      time: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: cat === 'Projects' ? '#2563EB' : cat === 'Blueprints' ? '#7C3AED' : cat === 'Assignments' ? '#D97706' : cat === 'Team' ? '#16A34A' : '#059669',
      bg: cat === 'Projects' ? '#DBEAFE' : cat === 'Blueprints' ? '#EDE9FE' : cat === 'Assignments' ? '#FEF3C7' : cat === 'Team' ? '#DCFCE7' : '#D1FAE5'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Persist to PostgreSQL audit_logs table
    api.createAuditLog({
      category: cat,
      action: action || 'Action Recorded',
      details: details || '',
      target: target || '—',
      project_id: projectId || activeProject?.id,
      pin_id: pinId,
      actor: actor || currentUser?.name || 'Field Inspector',
      role: role || currentUser?.role || 'Inspector',
      company: company || currentUser?.company || 'Apex Construction GC'
    }).catch(err => console.warn('Could not save audit log to DB:', err));
  }, [currentUser, activeProject?.id]);

  const handleClearLogs = async () => {
    try {
      await api.clearAuditLogs();
    } catch (e) {
      console.warn('Could not clear logs on server:', e);
    }
    setAuditLogs([]);
    localStorage.removeItem('punchlist_realtime_audit_logs');
  };

  // Real-time WebSocket event listener for audit logs & live updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleAuditLogSocket = (newLog) => {
      setAuditLogs(prev => {
        if (prev.some(l => l.id === newLog.id)) return prev;
        return [newLog, ...prev];
      });
    };

    const handleProjectCreated = (data) => {
      addAuditLog({
        category: 'Projects',
        action: 'New Project Added',
        details: `Project "${data?.name || 'New Project'}" was registered`,
        target: data?.code || data?.id || 'Project',
        actor: data?.created_by || 'Admin'
      });
    };

    const handleSheetsSocket = (data) => {
      const sName = data?.sheets?.[0]?.name || data?.sheet?.name || 'New Drawing Sheet';
      addAuditLog({
        category: 'Blueprints',
        action: 'Blueprint Uploaded',
        details: `Drawing set "${sName}" uploaded to server`,
        target: sName,
        actor: 'CAD Engineer'
      });
    };

    const handlePinCreated = (data) => {
      addAuditLog({
        category: 'Assignments',
        action: 'Punch Assigned',
        details: `Punch item "${data?.title || data?.id}" assigned to ${data?.assignee || data?.trade || 'contractor'}`,
        target: data?.item_number || data?.id || 'Punch',
        actor: data?.created_by_name || 'Inspector'
      });
    };

    const handlePinUpdated = (data) => {
      addAuditLog({
        category: 'Status',
        action: 'Status Transition',
        details: `Punch item ${data?.id || ''} status moved to "${data?.status || 'Updated'}"`,
        target: data?.item_number || data?.id || 'Punch',
        actor: 'Field User'
      });
    };

    socket.on('audit:log', handleAuditLogSocket);
    socket.on('project:created', handleProjectCreated);
    socket.on('sheets:uploaded', handleSheetsSocket);
    socket.on('sheet:version_uploaded', handleSheetsSocket);
    socket.on('pin:created', handlePinCreated);
    socket.on('task:created', handlePinCreated);
    socket.on('pin:updated', handlePinUpdated);
    socket.on('task:status', handlePinUpdated);

    return () => {
      socket.off('audit:log', handleAuditLogSocket);
      socket.off('project:created', handleProjectCreated);
      socket.off('sheets:uploaded', handleSheetsSocket);
      socket.off('sheet:version_uploaded', handleSheetsSocket);
      socket.off('pin:created', handlePinCreated);
      socket.off('task:created', handlePinCreated);
      socket.off('pin:updated', handlePinUpdated);
      socket.off('task:status', handlePinUpdated);
    };
  }, [addAuditLog]);

  const handleSheetsUploaded = (uploadedList) => {
    if (!uploadedList || uploadedList.length === 0) return;
    const firstSheet = uploadedList[0];
    const sheetName = firstSheet?.name || firstSheet?.sheet_number || firstSheet?.number || 'Blueprint Set';
    addAuditLog({
      category: 'Blueprints',
      action: blueprintModalMode === 'version' ? 'Blueprint Revision Uploaded' : 'Blueprint Uploaded',
      details: `Drawing set "${sheetName}" was uploaded and CAD aligned`,
      target: sheetName
    });
    if (blueprintModalMode === 'version') {
      const updated = uploadedList[0];
      setSheets(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      setActiveSheet(prev => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
    } else {
      setSheets(prev => [...uploadedList, ...prev]);
      setActiveSheet(firstSheet);
      if (firstSheet?.building_id) {
        setSelectedBuildingId(firstSheet.building_id);
      }
      if (firstSheet?.floor_level) {
        setSelectedFloorId(firstSheet.floor_level);
      }
    }
    setActiveModule('blueprints');
  };

  // Global ⌘K keyboard shortcut for Quick Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // -------------------------------------------------------------------
  // INITIAL AUTH RESTORATION (Session & Local Cache)
  // Restores active session on page refresh so user isn't forced back to login
  // -------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        // 1. Check Supabase session first
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          try {
            const res = await fetch('/api/auth/supabase-callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.session.access_token}`,
              },
            });
            const userProfile = res.ok ? await res.json() : null;
            const merged = { ...data.session.user, ...(userProfile || {}) };
            if (isMounted) _handleLoginUser(merged);
          } catch (_) {
            if (isMounted) _handleLoginUser(data.session.user);
          }
          if (isMounted) setAuthInitializing(false);
          return;
        }

        // 2. Fallback: check stored local token & cached user profile (demo or legacy token)
        const localUserStr = localStorage.getItem('punchlist_user');
        const token = localStorage.getItem('punchlist_auth_token');
        if (token && localUserStr) {
          try {
            const me = await api.getMe();
            if (isMounted) _handleLoginUser(me);
          } catch {
            try {
              const cached = JSON.parse(localUserStr);
              if (cached && isMounted) _handleLoginUser(cached);
            } catch (_) {}
          }
        } else if (localUserStr) {
          try {
            const cached = JSON.parse(localUserStr);
            if (cached && cached.email && isMounted) {
              _handleLoginUser(cached);
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Auth restoration encountered error:', err);
      } finally {
        if (isMounted) setAuthInitializing(false);
      }
    }

    restoreSession();
    return () => { isMounted = false; };
  }, [_handleLoginUser]);

  // -------------------------------------------------------------------
  // SUPABASE AUTH STATE LISTENER
  // Handles OAuth redirects (Google, Apple) & session token refresh events
  // -------------------------------------------------------------------
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          try {
            const res = await fetch('/api/auth/supabase-callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
            });
            const userProfile = res.ok ? await res.json() : null;
            const merged = { ...session.user, ...(userProfile || {}) };
            _handleLoginUser(merged);
          } catch (_) {
            _handleLoginUser(session.user);
          }
        }
        if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCurrentUser(CURRENT_USER);
          try {
            localStorage.removeItem('punchlist_user');
            localStorage.removeItem('punchlist_auth_token');
          } catch (_) {}
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [_handleLoginUser]);

  // Cycle sync state on click: synced -> syncing -> offline -> synced
  const handleToggleSyncState = () => {
    setSyncState(prev => {
      if (prev === 'synced') return 'syncing';
      if (prev === 'syncing') return 'offline';
      return 'synced';
    });
  };

  // Cascading switcher handlers
  const handleSelectProject = (project) => {
    setActiveProject(project);
    if (project.buildings && project.buildings.length > 0) {
      const bld = project.buildings[0];
      setActiveBuilding(bld);
      if (bld.floors && bld.floors.length > 0) {
        setActiveFloor(bld.floors[0]);
      }
    }
  };

  const handleSelectBuilding = (building) => {
    setActiveBuilding(building);
    if (building.floors && building.floors.length > 0) {
      setActiveFloor(building.floors[0]);
    }
  };

  const handleSelectFloor = (floor) => {
    setActiveFloor(floor);
    // Find matching sheet for this floor if specified
    if (floor.defaultSheet) {
      const matching = sheets.find(s => s.number === floor.defaultSheet);
      if (matching) setActiveSheet(matching);
    }
  };

  // -------------------------------------------------------------
  // UMBC BUILDING → FLOOR SELECTION WORKFLOW
  // -------------------------------------------------------------
  // When building changes: selectedBuildingId = new building, selectedFloorId = null. Do not retain the previous building's floor.
  const handleSelectUmbcBuilding = (buildingId) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorId(null);
    const bObj = getBuildingById(buildingId);
    if (bObj) {
      setActiveBuilding({
        id: bObj.id,
        name: bObj.name,
        floors: bObj.floors.map((f, i) => ({ id: `flr-${i}`, name: f }))
      });
    }
  };

  // When floor changes: selectedFloorId = selected floor
  // Workflow: Building → Floor → Floor Blueprint → Current Projects
  // "The user must first select a building, then select a floor. Only after a floor is selected should the application open the blueprint for that specific floor."
  const handleSelectUmbcFloor = (floorName, buildingId = null) => {
    const targetBuildingId = buildingId || selectedBuildingId;
    if (buildingId && buildingId !== selectedBuildingId) {
      setSelectedBuildingId(buildingId);
      const bObj = getBuildingById(buildingId);
      if (bObj) {
        setActiveBuilding({
          id: bObj.id,
          name: bObj.name,
          floors: bObj.floors.map((f, i) => ({ id: `flr-${i}`, name: f }))
        });
      }
    }
    setSelectedFloorId(floorName);

    // Navigate to Blueprints
    setActiveModule('blueprints');

    // If blueprint already exists, use existing blueprint/viewer workflow
    // If no blueprint exists, display empty state ("No blueprint available for this floor yet.")
    const matchingSheet = sheets.find(s => sheetMatchesBuildingAndFloor(s, targetBuildingId, floorName));
    if (matchingSheet) {
      setActiveSheet(matchingSheet);
    } else {
      setActiveSheet(null);
    }
  };

  // Prepare selector so projects can eventually be filtered using:
  // project.buildingId === selectedBuildingId && project.floorId === selectedFloorId
  const filteredProjects = projects.filter(project => {
    if (selectedBuildingId && project.buildingId && project.buildingId !== selectedBuildingId) return false;
    if (selectedFloorId && project.floorId && project.floorId !== selectedFloorId) return false;
    return true;
  });

  // Punch actions
  const handleUpdatePunchStatus = (punchId, newStatus) => {
    let affectedPunch = null;
    setPunchItems(prev => prev.map(p => {
      if (p.id !== punchId) return p;
      affectedPunch = p;
      return {
        ...p,
        status: newStatus,
        history: [
          ...(p.history || []),
          { action: `Status changed to ${newStatus}`, by: currentUser?.name || 'Field Inspector', time: 'Just now' }
        ]
      };
    }));

    api.updatePinStatus(punchId, newStatus).catch(err => {
      console.warn('Could not update punch status in DB:', err);
    });

    addAuditLog({
      category: 'Status',
      action: 'Status Transition',
      details: `Punch item "${affectedPunch?.title || punchId}" status moved to "${newStatus}"`,
      target: affectedPunch?.item_number || punchId,
      actor: currentUser?.name || 'Field Inspector',
      role: currentUser?.role || 'Inspector',
      company: currentUser?.company || 'Apex Construction GC',
      projectId: activeProject?.id,
      pinId: punchId
    });
  };

  const handleApprovePunch = (punchId) => {
    handleUpdatePunchStatus(punchId, 'Resolved');
  };

  const handleAddComment = (punchId, commentText) => {
    setPunchItems(prev => prev.map(p => {
      if (p.id !== punchId) return p;
      const newComment = {
        id: `c-${Date.now()}`,
        author: currentUser.name,
        role: currentUser.role,
        text: commentText,
        time: 'Just now'
      };
      return {
        ...p,
        comments: [...(p.comments || []), newComment]
      };
    }));

    api.addComment(punchId, { body: commentText }).catch(err => {
      console.warn('Could not save comment to DB:', err);
    });

    addAuditLog({
      category: 'Assignments',
      action: 'Observation Note',
      details: `Comment added to punch item "${punchId}"`,
      target: punchId,
      actor: currentUser?.name || 'Field Inspector',
      role: currentUser?.role || 'Operations',
      projectId: activeProject?.id,
      pinId: punchId
    });
  };

  const handleCreatePinAtCoords = (coords) => {
    setNewPunchCoords(coords);
    setIsNewPunchModalOpen(true);
  };

  const handleAddNewPunch = (newPunch) => {
    setPunchItems(prev => [newPunch, ...prev]);
    setSelectedPinId(newPunch.id);

    api.createPin({
      ...newPunch,
      project_id: activeProject?.id || 'proj-1',
      sheet_id: activeSheet?.id || newPunch.sheetId
    }).catch(err => {
      console.warn('Could not persist new punch to DB:', err);
    });

    addAuditLog({
      category: 'Assignments',
      action: 'Punch Assigned',
      details: `Punch item "${newPunch.title || newPunch.id}" assigned to ${newPunch.assignee || newPunch.trade || 'sub-contractor'}`,
      target: newPunch.item_number || newPunch.id,
      actor: currentUser?.name || 'Field Inspector',
      role: currentUser?.role || 'Inspector',
      company: currentUser?.company || 'Apex Construction GC',
      projectId: activeProject?.id,
      pinId: newPunch.id
    });
  };

  // Navigate directly to Blueprint sheet & pin
  const handleSelectPunchFromAnywhere = (punch) => {
    const targetSheet = sheets.find(s => s.id === punch.sheetId || s.number === punch.sheetNumber);
    if (targetSheet) {
      setActiveSheet(targetSheet);
    }
    setSelectedPinId(punch.id);
    setActiveModule('blueprints');
  };

  const handleSelectPunchById = (punchId) => {
    const punch = punchItems.find(p => p.id === punchId);
    if (punch) {
      handleSelectPunchFromAnywhere(punch);
    }
  };

  const handleNavigateBlueprintWithSheet = (sheetRef) => {
    const target = sheets.find(s => s.number === sheetRef);
    if (target) {
      setActiveSheet(target);
    }
    setActiveModule('blueprints');
  };

  // Open punch count for badges
  const openPunchCount = punchItems.filter(p => p.status !== 'Resolved').length;

  // -------------------------------------------------------------
  // RENDER LOGIN SCREEN IF NOT AUTHENTICATED
  // -------------------------------------------------------------

  const [legalPage, setLegalPage] = React.useState(null); // null | 'privacy' | 'terms'

  // Show full-screen loader while restoring auth session on mount/refresh
  if (authInitializing) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    if (legalPage === 'privacy') return <Suspense fallback={<PageLoader />}><PrivacyPolicy onBack={() => setLegalPage(null)} /></Suspense>;
    if (legalPage === 'terms')   return <Suspense fallback={<PageLoader />}><TermsAndConditions onBack={() => setLegalPage(null)} /></Suspense>;
    return (
      <LoginPage
        onLogin={(userInfo) => { _handleLoginUser(userInfo); }}
        onLegalPage={(page) => setLegalPage(page)}
      />
    );
  }

  // -------------------------------------------------------------
  // SIGNED-IN APPLICATION SHELL
  // -------------------------------------------------------------
  return (
    <Suspense fallback={<PageLoader />}>
      <AppShell
        activeModule={activeModule}
        onNavigate={(mod) => {
          setActiveModule(mod);
          if (mod !== 'blueprints') {
            setSelectedPinId(null);
          }
        }}
        projects={filteredProjects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        activeBuilding={activeBuilding}
        onSelectBuilding={handleSelectBuilding}
        activeFloor={activeFloor}
        onSelectFloor={handleSelectFloor}
        selectedBuildingId={selectedBuildingId}
        selectedFloorId={selectedFloorId}
        onSelectUmbcBuilding={handleSelectUmbcBuilding}
        onSelectUmbcFloor={handleSelectUmbcFloor}
        currentUser={currentUser}
        openPunchCount={openPunchCount}
        syncState={syncState}
        onToggleSyncState={handleToggleSyncState}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        onLogout={handleLogout}
      >
        {/* 4.2 Dashboard View */}
        {activeModule === 'dashboard' && (
          <Suspense fallback={<PageLoader />}>
            <Dashboard
              project={activeProject}
              building={activeBuilding}
              floor={activeFloor}
              selectedBuilding={getBuildingById(selectedBuildingId)}
              selectedFloor={selectedFloorId}
              punchItems={punchItems}
              auditLogs={auditLogs}
              onClearLogs={handleClearLogs}
              onOpenBlueprint={() => setActiveModule('blueprints')}
              onNewPunch={() => {
                setNewPunchCoords({ x_pct: 50.0, y_pct: 50.0, gridLocation: 'D-3' });
                setIsNewPunchModalOpen(true);
              }}
              onUploadBlueprint={() => handleOpenUploadBlueprint('new')}
              onSelectPunch={handleSelectPunchFromAnywhere}
              onApprovePunch={handleApprovePunch}
              currentUser={currentUser}
            />
          </Suspense>
        )}

        {/* 4.3 Blueprint Viewer (Full-Bleed Centerpiece) */}
        {activeModule === 'blueprints' && (
          <Suspense fallback={<PageLoader />}>
            <BlueprintViewer
              sheets={sheets}
              activeSheet={activeSheet}
              onSelectSheet={setActiveSheet}
              selectedBuilding={getBuildingById(selectedBuildingId)}
              selectedFloor={selectedFloorId}
              punchItems={punchItems}
              selectedPinId={selectedPinId}
              onSelectPin={(pin) => setSelectedPinId(pin.id)}
              onCloseDrawer={() => setSelectedPinId(null)}
              onUpdatePunchStatus={handleUpdatePunchStatus}
              onAddComment={handleAddComment}
              onOpenPhotoLightbox={(photoMeta) => {
                setActiveModule('photos');
              }}
              onCreatePinAtCoords={handleCreatePinAtCoords}
              onOpenUploadModal={(mode, target) => handleOpenUploadBlueprint(mode, target)}
              currentUser={currentUser}
            />
          </Suspense>
        )}

        {/* 4.4 Documents View */}
        {activeModule === 'documents' && (
          <Suspense fallback={<PageLoader />}>
            <DocumentsPage
              onNavigateBlueprintWithSheet={handleNavigateBlueprintWithSheet}
              onUploadBlueprint={() => handleOpenUploadBlueprint('new')}
            />
          </Suspense>
        )}

        {/* 4.5 Photos View */}
        {activeModule === 'photos' && (
          <Suspense fallback={<PageLoader />}>
            <PhotosPage
              onSelectPunchById={handleSelectPunchById}
            />
          </Suspense>
        )}

        {/* 4.6 Team View */}
        {activeModule === 'team' && (
          <Suspense fallback={<PageLoader />}>
            <TeamPage />
          </Suspense>
        )}

        {/* 4.7 Settings View */}
        {activeModule === 'settings' && (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage
              project={activeProject}
              onSaveProject={(updated) => {
                setActiveProject({ ...activeProject, ...updated });
                addAuditLog({
                  category: 'Projects',
                  action: 'Project Updated',
                  details: `Project "${updated.name || activeProject?.name}" settings updated`,
                  target: activeProject?.code || 'Project',
                  actor: currentUser?.name || 'Admin',
                  role: currentUser?.role || 'Admin',
                  company: currentUser?.company || 'Apex Construction GC'
                });
              }}
            />
          </Suspense>
        )}

        {/* Global Quick Search Modal (⌘K) */}
        {isQuickSearchOpen && (
          <Suspense fallback={null}>
            <QuickSearchModal
              isOpen={isQuickSearchOpen}
              onClose={() => setIsQuickSearchOpen(false)}
              punchItems={punchItems}
              sheets={sheets}
              documents={DOCUMENTS}
              teamMembers={TEAM_MEMBERS}
              onSelectPunch={handleSelectPunchFromAnywhere}
              onSelectSheet={(sheet) => {
                setActiveSheet(sheet);
                setActiveModule('blueprints');
              }}
              onNavigateModule={(mod) => setActiveModule(mod)}
            />
          </Suspense>
        )}

        {/* New Punch Creation Modal */}
        {isNewPunchModalOpen && (
          <Suspense fallback={null}>
            <NewPunchModal
              isOpen={isNewPunchModalOpen}
              onClose={() => {
                setIsNewPunchModalOpen(false);
                setNewPunchCoords(null);
              }}
              onSubmit={handleAddNewPunch}
              activeSheet={activeSheet}
              initialCoords={newPunchCoords}
            />
          </Suspense>
        )}

        {/* Blueprint Upload Modal — framer-motion only loads here */}
        {isBlueprintUploadOpen && (
          <Suspense fallback={null}>
            <BlueprintUploadModal
              projectId={activeProject?.id}
              projectName={activeProject?.name}
              existingSheets={sheets}
              initialSheetId={blueprintTargetSheet?.id}
              initialMode={blueprintModalMode}
              initialBuildingId={selectedBuildingId || ''}
              initialBuildingName={
                selectedBuildingId
                  ? (getBuildingById(selectedBuildingId)?.name || activeBuilding?.name || '')
                  : (activeBuilding?.name || '')
              }
              initialFloorLevel={selectedFloorId || activeFloor?.name || ''}
              onClose={() => setIsBlueprintUploadOpen(false)}
              onUploaded={handleSheetsUploaded}
            />
          </Suspense>
        )}
      </AppShell>
    </Suspense>
  );
}

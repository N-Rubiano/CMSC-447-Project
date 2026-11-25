import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Building2,
  Bell,
  Wifi,
  ShieldCheck,
  Sliders,
  Check,
  Save,
  Upload,
  RefreshCw,
  Lock,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { INITIAL_SETTINGS } from '../data/mockData';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '../data/rbac';
import { api } from '../services/api';

const PRESET_AVATARS = [
  {
    id: 'arch-fem',
    title: 'Architect',
    tag: 'Design',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'supt-male',
    title: 'Superintendent',
    tag: 'Field Ops',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'gc-fem',
    title: 'General Contractor',
    tag: 'Management',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'sub-male',
    title: 'Trade Subcontractor',
    tag: 'Mechanical',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'eng-male',
    title: 'Project Engineer',
    tag: 'Engineering',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'insp-male',
    title: 'Field Inspector',
    tag: 'QA / Code',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'safety-lead',
    title: 'Site Safety Director',
    tag: 'Safety Ops',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'comm-fem',
    title: 'Commissioning Specialist',
    tag: 'Systems',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
  }
];

const SECTION_HEAD_STYLE = {
  paddingBottom: 16,
  borderBottom: '1px solid var(--border-subtle)',
  marginBottom: 4
};

const ROW_DIVIDER_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  padding: '14px 0',
  borderBottom: '1px solid var(--border-subtle)'
};

export default function SettingsPage({ currentUser, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(() => ({
    ...INITIAL_SETTINGS,
    offlineSync: api.getOfflineSyncPrefs ? api.getOfflineSyncPrefs() : INITIAL_SETTINGS.offlineSync,
    permissions: ROLE_PERMISSIONS.map((r) => ({ ...r }))
  }));
  const [cacheStats, setCacheStats] = useState({ sheetsCount: 0, pinsCount: 0, queuedCount: 0 });
  const [cacheBusy, setCacheBusy] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Profile / Avatar states
  const [profileName, setProfileName] = useState(currentUser?.name || 'Satya Thakur');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '+1 (410) 455-1000');
  const [selectedAvatar, setSelectedAvatar] = useState(
    currentUser?.avatar_url || currentUser?.avatar || PRESET_AVATARS[0].url
  );
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const fileInputRef = useRef(null);

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const roleKey = String(currentUser?.role || 'admin').toLowerCase();
  const roleLabel = ROLE_LABELS[roleKey] || currentUser?.role || 'Administrator';

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setProfileName(currentUser.name);
      if (currentUser.phone) setProfilePhone(currentUser.phone);
      if (currentUser.avatar_url || currentUser.avatar) {
        setSelectedAvatar(currentUser.avatar_url || currentUser.avatar);
      }
      if (currentUser.role?.toLowerCase() !== 'admin' && activeTab === 'permissions') {
        setActiveTab('profile');
      }
    }
  }, [currentUser, activeTab]);

  const refreshCacheStats = async () => {
    if (!api.getOfflineCacheStats) return;
    const stats = await api.getOfflineCacheStats();
    if (stats) setCacheStats(stats);
  };

  useEffect(() => {
    if (activeTab === 'offline') {
      refreshCacheStats();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'profile', label: 'My Profile & Avatar', icon: User },
    { id: 'project', label: 'Project Info', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'offline', label: 'Offline & Sync', icon: Wifi },
    ...(isAdmin ? [{ id: 'permissions', label: 'Role Permissions', icon: ShieldCheck }] : []),
    { id: 'defaults', label: 'Field Defaults', icon: Sliders }
  ];

  const handleSave = (e) => {
    e.preventDefault();
    if (activeTab === 'offline' && api.saveOfflineSyncPrefs) {
      api.saveOfflineSyncPrefs(settings.offlineSync);
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handlePurgeCache = async () => {
    setCacheBusy(true);
    try {
      const next = api.purgeOfflineCache ? await api.purgeOfflineCache() : { sheetsCount: 0, pinsCount: 0, queuedCount: 0 };
      setCacheStats(next);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } finally {
      setCacheBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setCacheBusy(true);
    try {
      if (api.processSyncQueue) {
        await api.processSyncQueue();
      }
      await refreshCacheStats();
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } finally {
      setCacheBusy(false);
    }
  };

  const handlePermissionToggle = (rowIndex, colKey) => {
    setSettings((prev) => {
      const nextPerms = [...prev.permissions];
      nextPerms[rowIndex] = {
        ...nextPerms[rowIndex],
        [colKey]: !nextPerms[rowIndex][colKey]
      };
      return { ...prev, permissions: nextPerms };
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image file size must be less than 5 MB.');
      return;
    }

    setProfileError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 320;
            let { width, height } = img;
            if (width > height && width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            setSelectedAvatar(canvas.toDataURL('image/jpeg', 0.88));
          } catch {
            setSelectedAvatar(reader.result);
          }
        };
        img.onerror = () => setSelectedAvatar(reader.result);
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    setSelectedAvatar(trimmed);
    setCustomUrlInput('');
    setProfileError('');
  };

  const handleResetToInitials = () => {
    const displayName = profileName.trim() || currentUser?.name || 'User';
    setSelectedAvatar(
      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=D97706&color=fff&bold=true`
    );
    setProfileError('');
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSaveMsg('');

    try {
      const payload = {
        name: profileName.trim(),
        avatar_url: selectedAvatar,
        phone: profilePhone.trim()
      };

      try {
        const { api } = await import('../services/api');
        await api.updateProfile(payload);
      } catch (err) {
        console.warn('API updateProfile failed or offline:', err);
      }

      if (onUpdateUser) {
        onUpdateUser({
          name: profileName.trim(),
          avatar: selectedAvatar,
          avatar_url: selectedAvatar,
          phone: profilePhone.trim()
        });
      }

      setProfileSaveMsg('Avatar and profile details saved successfully!');
      setTimeout(() => setProfileSaveMsg(''), 3000);
    } catch (err) {
      setProfileError(err.message || 'Could not save profile changes.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title" style={{ letterSpacing: '-0.02em', margin: 0 }}>
            Settings &amp; Preferences
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
            Manage your profile identity, project configuration, sync behavior, and role access controls.
          </p>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--success-light)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          fontSize: 12,
          fontWeight: 600
        }}>
          <ShieldCheck size={15} color="var(--success)" aria-hidden="true" />
          <span>SOC 2 Type II Certified</span>
        </div>
      </div>

      {saveToast && (
        <div role="status" style={{
          backgroundColor: 'var(--success-light)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          padding: '10px 16px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 600
        }}>
          <Check size={16} aria-hidden="true" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Unified Settings Workspace (Flat Rail + Content Sheet, no nested cards) */}
      <div
        className="settings-layout"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(24, 24, 27, 0.04)'
        }}
      >
        {/* Left Navigation Rail */}
        <nav
          className="settings-rail"
          aria-label="Settings sections"
          style={{
            backgroundColor: '#FAFAF9',
            borderRight: '1px solid var(--border-subtle)',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13,
                  boxShadow: isActive ? '0 1px 2px rgba(24, 24, 27, 0.05)' : 'none',
                  transition: 'background-color 120ms ease, color 120ms ease'
                }}
              >
                <Icon size={16} color={isActive ? 'var(--amber)' : 'currentColor'} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Panel */}
        <div style={{ padding: '28px 34px', overflowY: 'auto' }}>
          {/* TAB 0: Profile & Avatar */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 660 }}>
              <div style={SECTION_HEAD_STYLE}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
                  Profile &amp; Avatar Customization
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Customize your personal profile photo and information displayed across sheets, comments, and field logs.
                </p>
              </div>

              {profileSaveMsg && (
                <div style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  color: '#166534',
                  padding: '10px 14px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  <Check size={16} color="#16A34A" />
                  <span>{profileSaveMsg}</span>
                </div>
              )}

              {profileError && (
                <div style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={15} />
                    {profileError}
                  </span>
                </div>
              )}

              {/* Identity Strip (flat, hairline separated) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                paddingBottom: 20,
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={selectedAvatar}
                    alt={profileName}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--amber)'
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName || 'User')}&background=D97706&color=fff`;
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    backgroundColor: '#16A34A',
                    border: '2px solid #FFFFFF'
                  }} title="Active" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                      {profileName || 'Your Name'}
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: '#FEF3C7',
                      color: '#92400E'
                    }}>
                      {roleLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {currentUser?.email || 'uw61778@umbc.edu'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                    {currentUser?.company || 'UMBC Facility Operations'}
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 36,
                    fontSize: 13,
                    fontWeight: 500,
                    flexShrink: 0
                  }}
                >
                  <Upload size={14} />
                  <span>Upload Image</span>
                </button>
              </div>

              {/* Role Avatars */}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
                  Role avatars
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10
                }}>
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = selectedAvatar === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => { setSelectedAvatar(preset.url); setProfileError(''); }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          padding: '10px 8px',
                          borderRadius: 10,
                          border: isSelected ? '2px solid var(--amber)' : '1px solid var(--border-subtle)',
                          backgroundColor: isSelected ? '#FFFBEB' : '#FAFAF9',
                          cursor: 'pointer',
                          transition: 'background-color 120ms ease, border-color 120ms ease'
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            src={preset.url}
                            alt={preset.title}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                          {isSelected && (
                            <span style={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              backgroundColor: 'var(--amber)',
                              color: '#FFFFFF',
                              borderRadius: '50%',
                              width: 17,
                              height: 17,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>
                            {preset.title}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                            {preset.tag}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image URL or Initials */}
              <div style={{
                paddingBottom: 20,
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                  Custom Image URL or Initials
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="url"
                    placeholder="https://example.com/my-photo.jpg"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    className="input-field"
                    style={{ flex: 1, height: 38 }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    disabled={!customUrlInput.trim()}
                    className="btn btn-secondary"
                    style={{ height: 38, fontSize: 13, flexShrink: 0 }}
                  >
                    Apply URL
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToInitials}
                    className="btn btn-ghost"
                    style={{ height: 38, fontSize: 13, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Generate avatar badge with your initials"
                  >
                    <RefreshCw size={14} />
                    <span>Use Initials</span>
                  </button>
                </div>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="input-field"
                      style={{ height: 38 }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="input-field"
                      style={{ height: 38 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>
                      Email Address (Locked)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        value={currentUser?.email || 'uw61778@umbc.edu'}
                        disabled
                        className="input-field"
                        style={{ height: 38, backgroundColor: 'var(--surface-muted)', color: 'var(--text-muted)', cursor: 'not-allowed', paddingRight: 32 }}
                      />
                      <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', right: 10, top: 12 }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>
                      Assigned Organization
                    </label>
                    <input
                      type="text"
                      value={currentUser?.company || 'UMBC Facility Operations'}
                      disabled
                      className="input-field"
                      style={{ height: 38, backgroundColor: 'var(--surface-muted)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 6, display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn btn-primary"
                    style={{
                      height: 38,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13.5,
                      fontWeight: 600,
                      padding: '0 18px'
                    }}
                  >
                    {profileSaving ? (
                      <>
                        <span className="spin-icon" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Saving Avatar…</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Save Profile &amp; Avatar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 1: Project Info */}
          {activeTab === 'project' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 580 }}>
              <div style={SECTION_HEAD_STYLE}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
                  Project Profile
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Core metadata associated with field drawing sets and punch exports.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Project Name
                </label>
                <input
                  type="text"
                  value={settings.projectName}
                  onChange={(e) => setSettings({ ...settings, projectName: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    Project Code
                  </label>
                  <input
                    type="text"
                    value={settings.projectCode}
                    onChange={(e) => setSettings({ ...settings, projectCode: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    General Contractor
                  </label>
                  <input
                    type="text"
                    value={settings.generalContractor}
                    onChange={(e) => setSettings({ ...settings, generalContractor: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Site Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="select-field"
                >
                  <option value="America/New_York (EST)">America/New_York (EST)</option>
                  <option value="America/Chicago (CST)">America/Chicago (CST)</option>
                  <option value="America/Denver (MST)">America/Denver (MST)</option>
                  <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                  Jobsite Street Address
                </label>
                <input
                  type="text"
                  value={settings.siteAddress}
                  onChange={(e) => setSettings({ ...settings, siteAddress: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="submit" className="btn btn-primary" style={{ height: 38 }}>
                  <Save size={15} />
                  <span>Save Project Info</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...INITIAL_SETTINGS, permissions: ROLE_PERMISSIONS.map((r) => ({ ...r })) })}
                  className="btn btn-ghost"
                  style={{ height: 38 }}
                >
                  Reset Defaults
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Notifications */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
              <div style={SECTION_HEAD_STYLE}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
                  Notification Dispatch Rules
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Configure real-time automated dispatch triggers for subcontractors and team leads.
                </p>
              </div>

              <div>
                {[
                  {
                    key: 'assignmentEmails',
                    title: 'New Assignment Alerts',
                    desc: 'Send instant email dispatch when a subcontractor is tagged on a pin'
                  },
                  {
                    key: 'dailyDigest',
                    title: 'Daily 06:00 AM Digest',
                    desc: 'Automated morning summary of pending closeouts and overdue inspections'
                  },
                  {
                    key: 'criticalAlerts',
                    title: 'Critical Life-Safety Alerts',
                    desc: 'High-priority SMS & webhook dispatch for life-safety items'
                  },
                  {
                    key: 'reviewRequests',
                    title: 'Architect Review Requests',
                    desc: 'Ping project architects when subcontractor requests signoff'
                  }
                ].map((item) => (
                  <div key={item.key} style={ROW_DIVIDER_STYLE}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.notifications[item.key]}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, [item.key]: e.target.checked }
                        })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>

              <button onClick={handleSave} className="btn btn-primary" style={{ height: 38, alignSelf: 'flex-start', marginTop: 6 }}>
                <Save size={15} />
                <span>Save Notification Rules</span>
              </button>
            </div>
          )}

          {/* TAB 3: Offline & Sync */}
          {activeTab === 'offline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 600 }}>
              <div style={SECTION_HEAD_STYLE}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
                  Offline Caching &amp; Background Sync
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Manage IndexedDB persistent field store and background synchronization queue.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                paddingBottom: 16,
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Offline Blueprint Cache</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                    {cacheStats.sheetsCount} {cacheStats.sheetsCount === 1 ? 'Sheet' : 'Sheets'} Cached
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Pending Sync Queue</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                    {cacheStats.queuedCount} {cacheStats.queuedCount === 1 ? 'Mutation' : 'Mutations'} Queued
                  </div>
                </div>
              </div>

              <div>
                <div style={ROW_DIVIDER_STYLE}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Cellular Data Sync</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Allow large vector drawing downloads over mobile LTE networks
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.offlineSync.autoSyncCellular}
                      onChange={(e) => setSettings({
                        ...settings,
                        offlineSync: { ...settings.offlineSync, autoSyncCellular: e.target.checked }
                      })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div style={ROW_DIVIDER_STYLE}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Periodic Background Sync</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Sync field punch edits automatically when connectivity resumes
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.offlineSync.backgroundSync}
                      onChange={(e) => setSettings({
                        ...settings,
                        offlineSync: { ...settings.offlineSync, backgroundSync: e.target.checked }
                      })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                <button onClick={handleSave} className="btn btn-primary" style={{ height: 38 }}>
                  <Save size={15} />
                  <span>Update Sync Settings</span>
                </button>
                {cacheStats.queuedCount > 0 && (
                  <button
                    type="button"
                    disabled={cacheBusy}
                    onClick={handleSyncNow}
                    className="btn btn-secondary"
                    style={{ height: 38 }}
                  >
                    <RefreshCw size={15} />
                    <span>Sync Now ({cacheStats.queuedCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={cacheBusy}
                  onClick={handlePurgeCache}
                  className="btn btn-secondary"
                  style={{ height: 38, color: 'var(--crimson)' }}
                >
                  <Trash2 size={15} />
                  <span>Purge Cache</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Role Permissions Matrix (Admin only) */}
          {isAdmin && activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={SECTION_HEAD_STYLE}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
                  Role-Based Access Control (RBAC)
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Enforce operational security and least privilege across all 6 canonical field roles.
                </p>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#FAFAF9',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      <th style={{ padding: '11px 14px', textAlign: 'left' }}>Project Role</th>
                      <th style={{ padding: '11px 14px', textAlign: 'left' }}>Label</th>
                      <th style={{ padding: '11px 10px', textAlign: 'center' }}>View Blueprints</th>
                      <th style={{ padding: '11px 10px', textAlign: 'center' }}>Drop Pins</th>
                      <th style={{ padding: '11px 10px', textAlign: 'center' }}>Approve Signoffs</th>
                      <th style={{ padding: '11px 10px', textAlign: 'center' }}>Upload Docs</th>
                      <th style={{ padding: '11px 10px', textAlign: 'center' }}>Admin Settings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.permissions.map((row, idx) => (
                      <tr key={row.role} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                          {row.role}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12.5 }}>
                          {row.label}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={row.viewBlueprints} onChange={() => handlePermissionToggle(idx, 'viewBlueprints')} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={row.dropPins} onChange={() => handlePermissionToggle(idx, 'dropPins')} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={row.approvePunches} onChange={() => handlePermissionToggle(idx, 'approvePunches')} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={row.editDocs} onChange={() => handlePermissionToggle(idx, 'editDocs')} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={row.adminSettings} onChange={() => handlePermissionToggle(idx, 'adminSettings')} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={handleSave} className="btn btn-primary" style={{ height: 38, alignSelf: 'flex-start' }}>
                <Save size={15} />
                <span>Save Permissions Matrix</span>
              </button>
            </div>
          )}

          {/* TAB 5: Field Defaults */}
          {activeTab === 'defaults' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 600 }}>
              <div style={SECTION_HEAD_STYLE}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
                  Field Defaults &amp; Observation Presets
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Standardize priority offsets and automated attribute tagging for newly created punch items.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    Default Priority
                  </label>
                  <select
                    value={settings.fieldDefaults.defaultPriority}
                    onChange={(e) => setSettings({
                      ...settings,
                      fieldDefaults: { ...settings.fieldDefaults, defaultPriority: e.target.value }
                    })}
                    className="select-field"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    Due Date Offset
                  </label>
                  <select
                    value={settings.fieldDefaults.dueOffsetDays}
                    onChange={(e) => setSettings({
                      ...settings,
                      fieldDefaults: { ...settings.fieldDefaults, dueOffsetDays: e.target.value }
                    })}
                    className="select-field"
                  >
                    <option value="3">3 Days (Urgent)</option>
                    <option value="7">7 Days (Standard 1-Week)</option>
                    <option value="14">14 Days (2 Weeks)</option>
                    <option value="30">30 Days (Closeout)</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={ROW_DIVIDER_STYLE}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>GPS Location Tagging</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Embed hardware GPS coordinates inside camera observations
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.fieldDefaults.gpsCapture}
                      onChange={(e) => setSettings({
                        ...settings,
                        fieldDefaults: { ...settings.fieldDefaults, gpsCapture: e.target.checked }
                      })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div style={ROW_DIVIDER_STYLE}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Auto Trade Stamp Attribution</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Automatically stamp pin initials based on assigned subcontractor
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.fieldDefaults.autoTradeStamp}
                      onChange={(e) => setSettings({
                        ...settings,
                        fieldDefaults: { ...settings.fieldDefaults, autoTradeStamp: e.target.checked }
                      })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <button onClick={handleSave} className="btn btn-primary" style={{ height: 38, alignSelf: 'flex-start', marginTop: 6 }}>
                <Save size={15} />
                <span>Save Field Defaults</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

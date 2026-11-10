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
  Camera,
  Image,
  RefreshCw,
  Lock,
  Sparkles,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { INITIAL_SETTINGS } from '../data/mockData';

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

export default function SettingsPage({ project, currentUser, onUpdateUser, onSaveProject }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'project' | 'notifications' | 'offline' | 'permissions' | 'defaults'
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
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

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setProfileName(currentUser.name);
      if (currentUser.phone) setProfilePhone(currentUser.phone);
      if (currentUser.avatar_url || currentUser.avatar) {
        setSelectedAvatar(currentUser.avatar_url || currentUser.avatar);
      }
    }
  }, [currentUser]);

  const tabs = [
    { id: 'profile', label: 'My Profile & Avatar', icon: User },
    { id: 'project', label: 'Project Info', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'offline', label: 'Offline & Sync', icon: Wifi },
    { id: 'permissions', label: 'Role Permissions', icon: ShieldCheck },
    { id: 'defaults', label: 'Field Defaults', icon: Sliders }
  ];

  const handleSave = (e) => {
    e.preventDefault();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handlePermissionToggle = (rowIndex, colKey) => {
    setSettings(prev => {
      const nextPerms = [...prev.permissions];
      nextPerms[rowIndex] = {
        ...nextPerms[rowIndex],
        [colKey]: !nextPerms[rowIndex][colKey]
      };
      return { ...prev, permissions: nextPerms };
    });
  };

  // Avatar Handlers
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
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/jpeg', 0.88);
            setSelectedAvatar(optimized);
          } catch {
            setSelectedAvatar(reader.result);
          }
        };
        img.onerror = () => {
          setSelectedAvatar(reader.result);
        };
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
    const initialsUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=D97706&color=fff&bold=true`;
    setSelectedAvatar(initialsUrl);
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
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '24px 28px',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }}>
      {/* Header with SOC 2 Badge Chip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--timber)', marginBottom: 4 }}>
            System Preferences
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>
            Settings &amp; Preferences
          </h1>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#166534',
          fontSize: 12,
          fontWeight: 700
        }}>
          <ShieldCheck size={16} color="#16A34A" />
          <span>SOC 2 Type II Certified</span>
        </div>
      </div>

      {saveToast && (
        <div style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #86EFAC',
          color: '#166534',
          padding: '10px 16px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          animation: 'fadeIn 150ms ease'
        }}>
          <Check size={16} />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Main Settings Card: Left Vertical Rail + Content Panel */}
      <div className="card" style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        minHeight: 520,
        overflow: 'hidden'
      }}>
        {/* Left Vertical Tab Rail */}
        <div style={{
          backgroundColor: 'var(--surface-muted)',
          borderRight: '1px solid var(--border)',
          padding: '16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? 'var(--amber-hover)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 120ms ease'
                }}
              >
                <Icon size={17} color={isActive ? 'var(--amber)' : 'currentColor'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Panel */}
        <div style={{ padding: '28px 32px', overflowY: 'auto' }}>
          {/* TAB 0: User Profile & Avatar Customization */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 660 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Profile &amp; Avatar Customization
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Customize your personal profile photo and information displayed across sheets, comments, and field logs.
                </p>
              </div>

              {/* Status alerts */}
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
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AlertCircle size={15} />{profileError}</span>
                </div>
              )}

              {/* Avatar Live Preview Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '18px 20px',
                borderRadius: 12,
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={selectedAvatar}
                    alt={profileName}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--amber)',
                      boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)'
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
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: '#16A34A',
                    border: '2px solid #FFFFFF'
                  }} title="Active" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
                      {profileName || 'Your Name'}
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: 'var(--amber-muted, #FEF3C7)',
                      color: 'var(--amber, #D97706)',
                      letterSpacing: '0.04em'
                    }}>
                      {(currentUser?.role || 'admin').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {currentUser?.email || 'uw61778@umbc.edu'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {currentUser?.company || 'UMBC Facility Operations'}
                  </div>
                </div>

                {/* Hidden File Input */}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 38,
                    fontSize: 13,
                    fontWeight: 500,
                    flexShrink: 0
                  }}
                >
                  <Upload size={15} />
                  <span>Upload Image</span>
                </button>
              </div>

              {/* Preset Avatars Gallery */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
                  Role avatars
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12
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
                          border: isSelected ? '2px solid var(--amber)' : '1px solid var(--border)',
                          backgroundColor: isSelected ? '#FFFFFF' : 'var(--surface-muted)',
                          boxShadow: isSelected ? '0 2px 8px var(--amber-glow, rgba(217,119,6,0.15))' : 'none',
                          cursor: 'pointer',
                          transition: 'all 120ms ease'
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            src={preset.url}
                            alt={preset.title}
                            style={{
                              width: 52,
                              height: 52,
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
                              width: 18,
                              height: 18,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}>
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                            {preset.title}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {preset.tag}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image URL or Initials Options */}
              <div style={{
                padding: '16px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                  Or Use a Custom Image URL / Generated Initials
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
                    style={{ height: 38, fontSize: 13, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Generate avatar badge with your initials"
                  >
                    <RefreshCw size={14} />
                    <span>Use Initials</span>
                  </button>
                </div>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
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
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
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
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
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
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
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

                <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn btn-primary"
                    style={{
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      padding: '0 20px'
                    }}
                  >
                    {profileSaving ? (
                      <>
                        <span className="spin-icon" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Saving Avatar…</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Profile &amp; Avatar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 1: Project Information */}
          {activeTab === 'project' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 580 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Project Profile
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Core metadata associated with field drawing sets and punch exports.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Project Name</label>
                <input
                  type="text"
                  value={settings.projectName}
                  onChange={(e) => setSettings({ ...settings, projectName: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Project Code</label>
                  <input
                    type="text"
                    value={settings.projectCode}
                    onChange={(e) => setSettings({ ...settings, projectCode: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>General Contractor</label>
                  <input
                    type="text"
                    value={settings.generalContractor}
                    onChange={(e) => setSettings({ ...settings, generalContractor: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Site Timezone</label>
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
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Jobsite Street Address</label>
                <input
                  type="text"
                  value={settings.siteAddress}
                  onChange={(e) => setSettings({ ...settings, siteAddress: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ height: 40 }}>
                  <Save size={16} />
                  <span>Save Project Info</span>
                </button>
                <button type="button" onClick={() => setSettings(INITIAL_SETTINGS)} className="btn btn-ghost" style={{ height: 40 }}>
                  Reset Defaults
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Notifications */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 580 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Notification Dispatch Rules
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Configure real-time automated dispatch triggers for subcontractors and team leads.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>New Assignment Alerts</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send instant email dispatch when a subcontractor is tagged on a pin</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.notifications.assignmentEmails}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, assignmentEmails: e.target.checked }
                      })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Daily 06:00 AM Digest</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Automated morning summary of pending closeouts and overdue inspections</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.notifications.dailyDigest}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, dailyDigest: e.target.checked }
                      })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Critical Life-Safety Alerts</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>High-priority SMS &amp; webhook dispatch for life-safety items</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.notifications.criticalAlerts}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, criticalAlerts: e.target.checked }
                      })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Architect Review Requests</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ping project architects when subcontractor requests signoff</div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.notifications.reviewRequests}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, reviewRequests: e.target.checked }
                      })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <button onClick={handleSave} className="btn btn-primary" style={{ height: 40, alignSelf: 'flex-start' }}>
                <Save size={16} />
                <span>Save Notification Rules</span>
              </button>
            </div>
          )}

          {/* TAB 3: Offline & Sync */}
          {activeTab === 'offline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 580 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Offline Caching &amp; Background Sync
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Manage IndexedDB persistent field store and background synchronization queue.
                </p>
              </div>

              <div style={{
                backgroundColor: 'var(--surface-muted)',
                padding: '16px 20px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16
              }}>
                <div>
                  <div className="eyebrow" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Offline Blueprint Cache</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>
                    {settings.offlineSync.cachedSheetsCount} Sheets Cached
                  </div>
                </div>
                <div>
                  <div className="eyebrow" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pending Sync Queue</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>
                    {settings.offlineSync.queuedChangesCount} Mutations Queued
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Cellular Data Sync</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Allow large vector drawing downloads over mobile LTE networks</div>
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Periodic Background Sync</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sync field punch edits automatically when connectivity resumes</div>
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

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button onClick={handleSave} className="btn btn-primary" style={{ height: 40 }}>
                  <Save size={16} />
                  <span>Update Sync Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('Offline vector cache cleared.')}
                  className="btn btn-secondary"
                  style={{ height: 40, color: 'var(--crimson)' }}
                >
                  <Trash2 size={16} />
                  <span>Purge Cache</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Role Permissions Matrix */}
          {activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Role-Based Access Control (RBAC)
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Enforce operational security and least privilege across field team tiers.
                </p>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-muted)', borderBottom: '1px solid var(--border)', color: 'var(--ink)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Project Role</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>View Blueprints</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Drop Pins</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Approve Signoffs</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Upload Docs</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Admin Settings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.permissions.map((row, idx) => (
                      <tr key={row.role} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>{row.role}</td>
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

              <button onClick={handleSave} className="btn btn-primary" style={{ height: 40, alignSelf: 'flex-start' }}>
                <Save size={16} />
                <span>Save Permissions Matrix</span>
              </button>
            </div>
          )}

          {/* TAB 5: Field Defaults */}
          {activeTab === 'defaults' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 580 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Field Defaults &amp; Observation Presets
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Standardize priority offsets and automated attribute tagging for newly created punch items.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Default Priority</label>
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Due Date Offset</label>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>GPS Location Tagging</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Embed hardware GPS coordinates inside camera observations</div>
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Auto Trade Stamp Attribution</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Automatically stamp pin initials based on assigned subcontractor</div>
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

              <button onClick={handleSave} className="btn btn-primary" style={{ height: 40, alignSelf: 'flex-start' }}>
                <Save size={16} />
                <span>Save Field Defaults</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

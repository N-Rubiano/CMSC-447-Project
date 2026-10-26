import React, { useState } from 'react';
import {
  Settings,
  User,
  Bell,
  FolderKanban,
  ShieldCheck,
  Sliders,
  FileText,
  Camera,
  Save,
  CheckCircle2,
  HardHat,
  Smartphone,
  Laptop
} from 'lucide-react';
import './SettingsView.css';

export default function SettingsView({
  project,
  currentUser,
  onUpdateProject
}) {
  const [activeSection, setActiveSection] = useState('account');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State initialized from current context
  const [settings, setSettings] = useState({
    // Account
    name: currentUser?.name || 'Field Inspector',
    email: currentUser?.email || 'admin@punchlistpro.com',
    phone: currentUser?.phone || '(555) 234-5678',
    company: currentUser?.company || 'Apex Construction GC',

    // Notifications
    notifyOnNewIssue: true,
    notifyOnStatusChange: true,
    notifyOnCritical: true,
    dailyDigestEmail: true,

    // Project
    projectName: project?.name || 'Commercial High-Rise Walkthrough',
    projectCode: project?.code || 'PRJ-2026',
    defaultResolutionDays: 14,
    requireRootCause: true,

    // Application
    highDpiRendering: true,
    measurementUnit: 'imperial', // 'imperial' | 'metric'
    touchSensitivity: 'standard', // 'standard' | 'high'

    // Documents
    defaultScale: '1/4" = 1\'-0"',
    pdfRenderDpi: '300',
    autoArchiveVersions: true,

    // Photos
    photoCompression: 'high',
    maxUploadSizeMb: 25,
    autoTimestampWatermark: true
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const navItems = [
    { id: 'account', label: 'Account & Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'project', label: 'Project Preferences', icon: FolderKanban },
    { id: 'permissions', label: 'User Permissions', icon: ShieldCheck },
    { id: 'application', label: 'App & Field Options', icon: Sliders },
    { id: 'documents', label: 'Document Settings', icon: FileText },
    { id: 'photos', label: 'Photo & Uploads', icon: Camera }
  ];

  return (
    <div className="settings-view-container">
      {/* Left Navigation Rail for Settings */}
      <div className="settings-sidebar">
        <div style={{ padding: '0 8px 12px 8px', fontSize: 11, fontWeight: 800, color: '#5C3A21', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Configuration Sections
        </div>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`settings-nav-item ${activeSection === id ? 'settings-nav-item--active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Main Settings Content Area */}
      <div className="settings-content-area">
        <form onSubmit={handleSave}>
          {/* SECTION 1: ACCOUNT & PROFILE */}
          {activeSection === 'account' && (
            <div className="settings-section-card">
              <div className="settings-section-header">
                <h2><User size={20} color="#D97706" /> Account & Profile Settings</h2>
                <div className="settings-section-desc">Manage your identity, role attributes, and contact information.</div>
              </div>

              <div className="settings-field-group">
                <div className="settings-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  />
                </div>

                <div className="settings-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="settings-field">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    />
                  </div>

                  <div className="settings-field">
                    <label>Assigned Organization</label>
                    <input
                      type="text"
                      disabled
                      value={settings.company}
                      style={{ backgroundColor: '#FAF8F5' }}
                    />
                  </div>
                </div>

                <div className="settings-field">
                  <label>System Role & Permissions</label>
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#FAF8F5',
                    border: '1.5px solid #E7E5E4',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#5C3A21',
                    textTransform: 'uppercase'
                  }}>
                    {currentUser?.role || 'Administrator'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="settings-section-card">
              <div className="settings-section-header">
                <h2><Bell size={20} color="#D97706" /> Notification Preferences</h2>
                <div className="settings-section-desc">Configure automated alerts and event notifications for field updates.</div>
              </div>

              <div className="settings-field-group">
                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">Assigned Punch Item Alerts</div>
                    <div className="settings-toggle-sub">Receive instant email when a new punch item or circle stamp is assigned to your trade.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnNewIssue}
                    onChange={(e) => setSettings({ ...settings, notifyOnNewIssue: e.target.checked })}
                  />
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">Review & Status Transitions</div>
                    <div className="settings-toggle-sub">Notify when work is submitted for General Contractor or Admin inspection.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnStatusChange}
                    onChange={(e) => setSettings({ ...settings, notifyOnStatusChange: e.target.checked })}
                  />
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">Critical Defects Priority SMS</div>
                    <div className="settings-toggle-sub">Send high-priority mobile text alert when a critical safety defect is logged.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnCritical}
                    onChange={(e) => setSettings({ ...settings, notifyOnCritical: e.target.checked })}
                  />
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">Daily Field Activity Digest</div>
                    <div className="settings-toggle-sub">Send end-of-day summary of all open comments, resolved items, and photos at 5:00 PM.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dailyDigestEmail}
                    onChange={(e) => setSettings({ ...settings, dailyDigestEmail: e.target.checked })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PROJECT PREFERENCES */}
          {activeSection === 'project' && (
            <div className="settings-section-card">
              <div className="settings-section-header">
                <h2><FolderKanban size={20} color="#D97706" /> Project Preferences</h2>
                <div className="settings-section-desc">Manage project metadata and inspection defaults.</div>
              </div>

              <div className="settings-field-group">
                <div className="settings-field">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={settings.projectName}
                    onChange={(e) => setSettings({ ...settings, projectName: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="settings-field">
                    <label>Project Code</label>
                    <input
                      type="text"
                      value={settings.projectCode}
                      onChange={(e) => setSettings({ ...settings, projectCode: e.target.value })}
                    />
                  </div>

                  <div className="settings-field">
                    <label>Default Resolution Duration (Days)</label>
                    <input
                      type="number"
                      value={settings.defaultResolutionDays}
                      onChange={(e) => setSettings({ ...settings, defaultResolutionDays: parseInt(e.target.value) || 14 })}
                    />
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">Mandatory Root Cause Classification</div>
                    <div className="settings-toggle-sub">Require field inspectors to identify defect root cause before submitting punch items.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.requireRootCause}
                    onChange={(e) => setSettings({ ...settings, requireRootCause: e.target.checked })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: USER PERMISSIONS */}
          {activeSection === 'permissions' && (
            <div className="settings-section-card">
              <div className="settings-section-header">
                <h2><ShieldCheck size={20} color="#D97706" /> User Permissions & Role Matrix</h2>
                <div className="settings-section-desc">Inspect role capabilities enforced by the construction governance layer.</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 14, backgroundColor: '#FAF8F5', borderRadius: 8, border: '1px solid #E7E5E4' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#DC2626', marginBottom: 4 }}>Facility Administrator</div>
                  <div style={{ fontSize: 12, color: '#78716C' }}>Full project authority: create projects, upload blueprint drawing sets, manage team & contractors, close or delete punch items.</div>
                </div>

                <div style={{ padding: 14, backgroundColor: '#FAF8F5', borderRadius: 8, border: '1px solid #E7E5E4' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#D97706', marginBottom: 4 }}>General Contractor (GC)</div>
                  <div style={{ fontSize: 12, color: '#78716C' }}>Supervisory management: assign work to subcontractors, approve work submissions, inspect stamped circles, review field reports.</div>
                </div>

                <div style={{ padding: 14, backgroundColor: '#FAF8F5', borderRadius: 8, border: '1px solid #E7E5E4' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#2563EB', marginBottom: 4 }}>Trade Subcontractor</div>
                  <div style={{ fontSize: 12, color: '#78716C' }}>Task execution: view assigned items, post completion photos, update item status to "In Progress" or submit for GC review.</div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: APPLICATION PREFERENCES */}
          {activeSection === 'application' && (
            <div className="settings-section-card">
              <div className="settings-section-header">
                <h2><Sliders size={20} color="#D97706" /> Application & Field Options</h2>
                <div className="settings-section-desc">Optimize layout, measurement units, and touch gestures for on-site tablet usage.</div>
              </div>

              <div className="settings-field-group">
                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">Ultra-High DPI Blueprint Rendering</div>
                    <div className="settings-toggle-sub">Enable 4K crisp architectural vector and canvas rendering during extreme zoom.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.highDpiRendering}
                    onChange={(e) => setSettings({ ...settings, highDpiRendering: e.target.checked })}
                  />
                </div>

                <div className="settings-field">
                  <label>Measurement Units</label>
                  <select
                    value={settings.measurementUnit}
                    onChange={(e) => setSettings({ ...settings, measurementUnit: e.target.value })}
                  >
                    <option value="imperial">Imperial (Feet & Inches: 1'-6")</option>
                    <option value="metric">Metric (Millimeters & Meters: 450mm)</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Tablet Touch Drag Sensitivity</label>
                  <select
                    value={settings.touchSensitivity}
                    onChange={(e) => setSettings({ ...settings, touchSensitivity: e.target.value })}
                  >
                    <option value="standard">Standard Tablet Sensitivity</option>
                    <option value="high">High Precision (Gloved Field Inspection)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: DOCUMENT SETTINGS */}
          {activeSection === 'documents' && (
            <div className="settings-section-card">
              <div className="settings-section-header">
                <h2><FileText size={20} color="#D97706" /> Document Settings</h2>
                <div className="settings-section-desc">Configure architectural and engineering document defaults.</div>
              </div>

              <div className="settings-field-group">
                <div className="settings-field">
                  <label>Default Blueprint Scale Ratio</label>
                  <input
                    type="text"
                    value={settings.defaultScale}
                    onChange={(e) => setSettings({ ...settings, defaultScale: e.target.value })}
                  />
                </div>

                <div className="settings-field">
                  <label>PDF Vector Rasterization Resolution (DPI)</label>
                  <select
                    value={settings.pdfRenderDpi}
                    onChange={(e) => setSettings({ ...settings, pdfRenderDpi: e.target.value })}
                  >
                    <option value="150">150 DPI (Fastest load)</option>
                    <option value="300">300 DPI (High-definition architectural)</option>
                    <option value="600">600 DPI (Ultra-sharp large format sheets)</option>
                  </select>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">Automatic Version Archiving</div>
                    <div className="settings-toggle-sub">Maintain complete revision history when new building blueprint revisions are uploaded.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoArchiveVersions}
                    onChange={(e) => setSettings({ ...settings, autoArchiveVersions: e.target.checked })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: PHOTO & UPLOADS */}
          {activeSection === 'photos' && (
            <div className="settings-section-card">
              <div className="settings-section-header">
                <h2><Camera size={20} color="#D97706" /> Photo & Upload Settings</h2>
                <div className="settings-section-desc">Manage field camera captures, upload limits, and image optimization.</div>
              </div>

              <div className="settings-field-group">
                <div className="settings-field">
                  <label>Photo Quality / Compression</label>
                  <select
                    value={settings.photoCompression}
                    onChange={(e) => setSettings({ ...settings, photoCompression: e.target.value })}
                  >
                    <option value="high">High Quality (Balanced 1920x1080)</option>
                    <option value="original">Original Full Resolution (Raw uncompressed)</option>
                    <option value="compact">Compact (Low bandwidth / 3G Field)</option>
                  </select>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-label">Automate Date & GPS Timestamp Watermark</div>
                    <div className="settings-toggle-sub">Embed tamper-proof capture timestamp and grid location directly onto proof photos.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoTimestampWatermark}
                    onChange={(e) => setSettings({ ...settings, autoTimestampWatermark: e.target.checked })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button Bar */}
          <div style={{ maxWidth: 760, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1.5px solid #E7E5E4' }}>
            {savedSuccess ? (
              <span style={{ color: '#15803D', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> Configuration saved successfully!
              </span>
            ) : <span />}

            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '10px 24px', fontSize: 13.5, fontWeight: 800, backgroundColor: '#5C3A21', gap: 6 }}
            >
              <Save size={15} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

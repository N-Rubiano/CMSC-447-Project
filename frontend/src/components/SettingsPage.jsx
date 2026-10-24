import React, { useState } from 'react';
import {
  Building2,
  Bell,
  Wifi,
  ShieldCheck,
  Sliders,
  AlertTriangle,
  Check,
  Save,
  Trash2,
  HardHat
} from 'lucide-react';
import { INITIAL_SETTINGS } from '../data/mockData';

export default function SettingsPage({ project, onSaveProject }) {
  const [activeTab, setActiveTab] = useState('project'); // 'project' | 'notifications' | 'offline' | 'permissions' | 'defaults'
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [saveToast, setSaveToast] = useState(false);

  const tabs = [
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
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>
            Project & Field Settings
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
                    style={{ fontFamily: 'var(--font-mono)' }}
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
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Time Zone</label>
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

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ height: 40 }}>
                  <Save size={16} />
                  <span>Save Changes</span>
                </button>
                <button type="button" onClick={() => setSettings(INITIAL_SETTINGS)} className="btn btn-ghost" style={{ height: 40 }}>
                  Cancel
                </button>
              </div>

              {/* Crimson Danger Zone: Archive Project */}
              <div style={{
                marginTop: 24,
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FFF5F5',
                border: '1.5px solid var(--crimson-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--crimson)', fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
                  <AlertTriangle size={18} />
                  <span>Danger Zone — Project Archival</span>
                </div>
                <p style={{ fontSize: 12, color: '#991B1B', marginBottom: 14 }}>
                  Archiving moves this project and its drawing sets into read-only cold storage.
                </p>
                <button
                  type="button"
                  onClick={() => alert('Archive project requires Executive confirmation.')}
                  className="btn btn-crimson"
                  style={{ height: 36, fontSize: 13 }}
                >
                  <Trash2 size={15} />
                  <span>Archive Project</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Notifications */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 580 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Notification Dispatch
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Control when email alerts and push alerts are sent to foremen and superintendents.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Punch Assignment Emails</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send email to trade foremen when a pin is assigned</div>
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
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Daily Field Digest</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Summary of opened, resolved, and pending review pins at 06:00 AM</div>
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
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Instant SMS/Push notification for critical safety violations</div>
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
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Review Request Pings</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Alert GC Superintendent as soon as a subcontractor submits resolution</div>
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
                <span>Save Notifications</span>
              </button>
            </div>
          )}

          {/* TAB 3: Offline & Sync */}
          {activeTab === 'offline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 580 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Offline Field Caching
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Local IndexedDB drawing tiles and offline mutation queues for basement field work.
                </p>
              </div>

              {/* Stats Box */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Cached Vector Sheets</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                    {settings.offlineSync.cachedSheetsCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Queued Offline Changes</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                    {settings.offlineSync.queuedChangesCount}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Auto-Sync on Cellular 5G</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Allow large drawing sheet packet sync over mobile cellular data</div>
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
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Background Sync Worker</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Continuously check for updated sheet revisions while tablet is idle</div>
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

              <button onClick={handleSave} className="btn btn-primary" style={{ height: 40, alignSelf: 'flex-start' }}>
                <Save size={16} />
                <span>Save Offline Config</span>
              </button>
            </div>
          )}

          {/* TAB 4: Role Permissions Matrix */}
          {activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Role Permission Matrix
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Configure role-based access control (RBAC) across field functions.
                </p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 8px' }}>Role</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>View Sheets</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Drop Pins</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Approve Sign-off</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Edit Documents</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Admin Settings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.permissions.map((row, idx) => (
                      <tr key={row.role} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--ink)' }}>{row.role}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={row.viewBlueprints} onChange={() => handlePermissionToggle(idx, 'viewBlueprints')} />
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={row.dropPins} onChange={() => handlePermissionToggle(idx, 'dropPins')} />
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={row.approvePunches} onChange={() => handlePermissionToggle(idx, 'approvePunches')} />
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={row.editDocs} onChange={() => handlePermissionToggle(idx, 'editDocs')} />
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={row.adminSettings} onChange={() => handlePermissionToggle(idx, 'adminSettings')} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={handleSave} className="btn btn-primary" style={{ height: 40, alignSelf: 'flex-start', marginTop: 10 }}>
                <Save size={16} />
                <span>Save Matrix</span>
              </button>
            </div>
          )}

          {/* TAB 5: Field Defaults */}
          {activeTab === 'defaults' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 580 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Field Observation Defaults
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Preset values when superintendents drop punch pins on tablet walks.
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

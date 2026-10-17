import { io } from 'socket.io-client';
import Dexie from 'dexie';
import { supabase, signInWithPassword, signOut as supabaseSignOut } from './supabase';

// -------------------------------------------------------------
// IndexedDB for Offline-First Field Work
// -------------------------------------------------------------
export const localDb = new Dexie('PunchListOfflineDB');
localDb.version(1).stores({
  projects: 'id, name, status',
  sheets: 'id, project_id, sheet_number',
  pins: 'id, sheet_id, project_id, status, item_number',
  markups: 'id, sheet_id',
  syncQueue: '++id, entity, type, data, timestamp'
});

// Socket.io singleton
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
  }
  return socket;
}

// Check network status
export function isOnline() {
  return navigator.onLine;
}

// -------------------------------------------------------------
// AUTH TOKEN MANAGEMENT
// Supabase is the primary source; localStorage is the legacy fallback
// for demo/offline tokens created before Supabase integration.
// -------------------------------------------------------------
const TOKEN_KEY = 'punchlist_auth_token';

/** Get the current auth token (Supabase session preferred, legacy fallback). */
export async function getToken() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return data.session.access_token;
  } catch (_) {}
  return localStorage.getItem(TOKEN_KEY);
}

/** Store a legacy local token (used only for demo/seed login). */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Remove the legacy local token. */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Authenticated fetch wrapper — attaches JWT to every request
async function authFetch(url, options = {}) {
  const token = await getToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

// -------------------------------------------------------------
// API CLIENT
// -------------------------------------------------------------
const BASE_URL = '/api';

export const api = {
  // AUTH
  /**
   * Sign in via Supabase Auth. On success, calls /api/auth/supabase-callback
   * to get our role/company profile from the local DB.
   * If Supabase credentials fail, gracefully falls back to local backend auth.
   */
  async login(email, password) {
    try {
      const { session, user: supaUser, error } = await signInWithPassword(email, password);

      if (session && !error) {
        // Exchange the Supabase token for our local user profile (role, company, etc.)
        const res = await fetch(`${BASE_URL}/auth/supabase-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          console.warn('Could not fetch local user profile from backend, using Supabase claims.');
          return { token: session.access_token, user: supaUser };
        }

        const userProfile = await res.json();
        return { token: session.access_token, user: userProfile };
      }
    } catch (supaErr) {
      console.warn('Supabase sign-in skipped or failed, trying backend login:', supaErr);
    }

    // Fallback: local backend authentication (e.g. seeded demo accounts)
    try {
      const backendRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        if (data.token) setToken(data.token);
        return data;
      }
    } catch (backendErr) {
      console.warn('Backend login unavailable:', backendErr);
    }

    throw new Error('Invalid email or password');
  },

  async getMe() {
    const res = await authFetch(`${BASE_URL}/auth/me`);
    if (!res.ok) throw new Error('Not authenticated');
    return await res.json();
  },

  async logout() {
    removeToken();
    try { await supabaseSignOut(); } catch (_) {}
  },

  // PROJECTS
  async getProjects() {
    try {
      if (!navigator.onLine) {
        return await localDb.projects.toArray();
      }
      const res = await authFetch(`${BASE_URL}/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      // Cache in IndexedDB
      await localDb.projects.bulkPut(data);
      return data;
    } catch (err) {
      console.warn('Falling back to local projects cache:', err);
      return await localDb.projects.toArray();
    }
  },

  async getProject(id) {
    const res = await authFetch(`${BASE_URL}/projects/${id}`);
    if (!res.ok) throw new Error('Project not found');
    return await res.json();
  },

  async createProject(payload) {
    const res = await authFetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create project');
    const created = await res.json();
    await localDb.projects.put(created);
    return created;
  },

  async updateProjectStatus(projectId, status) {
    const res = await authFetch(`${BASE_URL}/projects/${projectId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update project status');
    return await res.json();
  },

  async assignProjectGc(projectId, gcUserId) {
    const res = await authFetch(`${BASE_URL}/projects/${projectId}/assign-gc`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gc_user_id: gcUserId })
    });
    if (!res.ok) throw new Error('Failed to assign General Contractor');
    return await res.json();
  },

  async getProjectMembers(projectId) {
    const res = await authFetch(`${BASE_URL}/projects/${projectId}/members`);
    if (!res.ok) throw new Error('Failed to fetch project members');
    return await res.json();
  },

  async addProjectMember(projectId, userId, role = 'sub_contractor') {
    const res = await authFetch(`${BASE_URL}/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role })
    });
    if (!res.ok) throw new Error('Failed to add team member');
    return await res.json();
  },

  async removeProjectMember(projectId, userId) {
    const res = await authFetch(`${BASE_URL}/projects/${projectId}/members/${userId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove team member');
    return await res.json();
  },

  // SHEETS
  async getSheets(projectId) {
    try {
      if (!navigator.onLine) {
        return await localDb.sheets.where('project_id').equals(projectId).toArray();
      }
      const res = await authFetch(`${BASE_URL}/projects/${projectId}/sheets`);
      if (!res.ok) throw new Error('Failed to fetch sheets');
      const data = await res.json();
      await localDb.sheets.bulkPut(data);
      return data;
    } catch (err) {
      console.warn('Falling back to local sheets cache:', err);
      return await localDb.sheets.where('project_id').equals(projectId).toArray();
    }
  },

  async getSheet(id) {
    const res = await authFetch(`${BASE_URL}/sheets/${id}`);
    if (!res.ok) throw new Error('Sheet not found');
    return await res.json();
  },

  async uploadDrawingSet(projectId, formData) {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/projects/${projectId}/sheets/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload drawing set PDF');
    return await res.json();
  },

  /**
   * uploadRaw(endpoint, formData)
   * Generic authenticated multipart upload — used by BlueprintUploadModal
   * for both PDF sheets (/api/projects/:id/sheets/upload) and image blueprints
   * (/api/projects/:id/blueprints/upload).
   */
  async uploadRaw(endpoint, formData) {
    const token = await getToken();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || `Upload failed (${res.status})`);
    }
    return await res.json();
  },

  /**
   * uploadBlueprint(projectId, formData)
   * Upload a single image blueprint (PNG / JPEG / TIFF) to the project.
   */
  async uploadBlueprint(projectId, formData) {
    return this.uploadRaw(`${BASE_URL}/projects/${projectId}/blueprints/upload`, formData);
  },

  /**
   * uploadSheetVersion(sheetId, formData)
   * Upload the latest version / revision file for a given building sheet.
   * Preserves all existing pins and markups.
   */
  async uploadSheetVersion(sheetId, formData) {
    return this.uploadRaw(`${BASE_URL}/sheets/${sheetId}/versions`, formData);
  },

  /**
   * getSheetVersions(sheetId)
   * Retrieve the version history timeline for a sheet.
   */
  async getSheetVersions(sheetId) {
    const res = await authFetch(`${BASE_URL}/sheets/${sheetId}/versions`);
    if (!res.ok) throw new Error('Failed to fetch sheet versions');
    return await res.json();
  },

  // PINS
  async getPins(sheetId) {
    try {
      if (!navigator.onLine) {
        return await localDb.pins.where('sheet_id').equals(sheetId).toArray();
      }
      const res = await authFetch(`${BASE_URL}/sheets/${sheetId}/pins`);
      if (!res.ok) throw new Error('Failed to fetch pins');
      const data = await res.json();
      await localDb.pins.bulkPut(data);
      return data;
    } catch (err) {
      console.warn('Falling back to local pins cache:', err);
      return await localDb.pins.where('sheet_id').equals(sheetId).toArray();
    }
  },

  async getAllProjectPins(projectId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await authFetch(`${BASE_URL}/projects/${projectId}/pins${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error('Failed to fetch project pins');
    return await res.json();
  },

  async getPin(id) {
    const res = await authFetch(`${BASE_URL}/pins/${id}`);
    if (!res.ok) throw new Error('Pin not found');
    return await res.json();
  },

  async createPin(payload) {
    const { photoFile, ...pinData } = payload;

    if (!navigator.onLine) {
      const offlinePin = {
        ...pinData,
        id: `offline-pin-${Date.now()}`,
        item_number: 900 + Math.floor(Math.random() * 99),
        created_at: new Date().toISOString(),
        is_offline_pending: true
      };
      await localDb.pins.put(offlinePin);
      await localDb.syncQueue.add({
        entity: 'pin',
        type: 'create',
        data: offlinePin,
        timestamp: Date.now()
      });
      return offlinePin;
    }

    const res = await authFetch(`${BASE_URL}/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pinData)
    });
    if (!res.ok) throw new Error('Failed to create pin');
    const created = await res.json();

    if (photoFile) {
      try {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('caption', pinData.title || 'Inspection Photo');
        formData.append('type', 'issue');
        const photo = await this.uploadPhoto(created.id, formData);
        created.photos = [photo];
      } catch (err) {
        console.warn('Failed to upload initial photo attachment:', err);
      }
    }

    await localDb.pins.put(created);
    return created;
  },

  async updatePinCoords(id, x_pct, y_pct) {
    return this.updatePin(id, { x_pct, y_pct });
  },

  async updatePin(id, payload) {
    if (!navigator.onLine) {
      const existing = await localDb.pins.get(id);
      const updated = { ...existing, ...payload, is_offline_pending: true };
      await localDb.pins.put(updated);
      await localDb.syncQueue.add({
        entity: 'pin',
        type: 'update',
        data: { id, ...payload },
        timestamp: Date.now()
      });
      return updated;
    }

    const res = await authFetch(`${BASE_URL}/pins/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update pin');
    const updated = await res.json();
    await localDb.pins.put(updated);
    return updated;
  },

  async updatePinStatus(id, status, comment = '') {
    const res = await authFetch(`${BASE_URL}/pins/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, comment })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update status' }));
      throw new Error(err.error || 'Failed to update status');
    }
    const updated = await res.json();
    await localDb.pins.put(updated);
    return updated;
  },

  async assignPin(id, payload) {
    const res = await authFetch(`${BASE_URL}/pins/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to assign pin' }));
      throw new Error(err.error || 'Failed to assign pin');
    }
    const updated = await res.json();
    await localDb.pins.put(updated);
    return updated;
  },

  async deletePin(id) {
    const res = await authFetch(`${BASE_URL}/pins/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete pin');
    await localDb.pins.delete(id);
    return await res.json();
  },

  // COMPANIES & AUDIT LOGS
  async getCompanies() {
    const res = await authFetch(`${BASE_URL}/companies`);
    if (!res.ok) throw new Error('Failed to fetch companies');
    return await res.json();
  },

  async createCompany(payload) {
    const res = await authFetch(`${BASE_URL}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create company' }));
      throw new Error(err.error || 'Failed to create company');
    }
    return await res.json();
  },

  async updateCompany(id, payload) {
    const res = await authFetch(`${BASE_URL}/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update company' }));
      throw new Error(err.error || 'Failed to update company');
    }
    return await res.json();
  },

  async deleteCompany(id) {
    const res = await authFetch(`${BASE_URL}/companies/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete company' }));
      throw new Error(err.error || 'Failed to delete company');
    }
    return await res.json();
  },

  async getContractorSubcontractors(contractorId) {
    const res = await authFetch(`${BASE_URL}/companies/${contractorId}/subcontractors`);
    if (!res.ok) throw new Error('Failed to fetch contractor subcontractors');
    return await res.json();
  },

  async getProjectAuditLogs(projectId) {
    const res = await authFetch(`${BASE_URL}/projects/${projectId}/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch project audit logs');
    return await res.json();
  },

  async getPinAuditLogs(pinId) {
    const res = await authFetch(`${BASE_URL}/pins/${pinId}/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch pin audit logs');
    return await res.json();
  },

  // PHOTOS
  async uploadPhoto(pinId, formData) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/pins/${pinId}/photos`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload photo');
    return await res.json();
  },

  async getProjectPhotos(projectId) {
    const res = await authFetch(`${BASE_URL}/projects/${projectId}/photos`);
    if (!res.ok) throw new Error('Failed to fetch project photos');
    return await res.json();
  },

  // COMMENTS & FIELD REPORTS
  async addComment(pinId, payload) {
    const res = await authFetch(`${BASE_URL}/pins/${pinId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to post comment');
    return await res.json();
  },

  async getProjectComments(projectId) {
    const res = await authFetch(`${BASE_URL}/projects/${projectId}/comments`);
    if (!res.ok) throw new Error('Failed to fetch project comments');
    return await res.json();
  },

  // MARKUPS
  async getMarkups(sheetId) {
    try {
      if (!navigator.onLine) {
        return await localDb.markups.where('sheet_id').equals(sheetId).toArray();
      }
      const res = await authFetch(`${BASE_URL}/sheets/${sheetId}/markups`);
      if (!res.ok) throw new Error('Failed to fetch markups');
      const data = await res.json();
      await localDb.markups.bulkPut(data);
      return data;
    } catch (err) {
      console.warn('Falling back to local markups cache:', err);
      return await localDb.markups.where('sheet_id').equals(sheetId).toArray();
    }
  },

  async saveMarkup(sheetId, payload) {
    const res = await authFetch(`${BASE_URL}/sheets/${sheetId}/markups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save markup');
    const created = await res.json();
    await localDb.markups.put(created);
    return created;
  },

  async deleteMarkup(id) {
    const res = await authFetch(`${BASE_URL}/markups/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete markup');
    await localDb.markups.delete(id);
    return await res.json();
  },

  // USERS
  async getUsers() {
    const res = await authFetch(`${BASE_URL}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return await res.json();
  },

  // DOCUMENTS
  async getDocuments(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await authFetch(`${BASE_URL}/documents${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return await res.json();
  },

  async uploadDocument(formData) {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to upload document' }));
      throw new Error(err.error || err.detail || 'Upload failed');
    }
    return await res.json();
  },

  async deleteDocument(id) {
    const res = await authFetch(`${BASE_URL}/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    return await res.json();
  },

  // AUDIT LOGS
  async getAuditLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await authFetch(`${BASE_URL}/audit-logs${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return await res.json();
  },

  async createAuditLog(payload) {
    const res = await authFetch(`${BASE_URL}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to record audit log');
    return await res.json();
  },

  async clearAuditLogs(projectId) {
    const qs = projectId ? `?project_id=${projectId}` : '';
    const res = await authFetch(`${BASE_URL}/audit-logs${qs}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear audit logs');
    return await res.json();
  },

  // TEAM
  async getTeam() {
    const res = await authFetch(`${BASE_URL}/team`);
    if (!res.ok) throw new Error('Failed to fetch team members');
    return await res.json();
  },

  async addTeamMember(payload) {
    const res = await authFetch(`${BASE_URL}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add team member' }));
      throw new Error(err.detail || err.error || 'Failed to add team member');
    }
    return await res.json();
  },

  async deleteTeamMember(id) {
    const res = await authFetch(`${BASE_URL}/team/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove team member');
    return await res.json();
  },

  // SYNC QUEUE PROCESSOR
  async processSyncQueue() {
    if (!navigator.onLine) return { synced: 0 };
    const queue = await localDb.syncQueue.toArray();
    if (queue.length === 0) return { synced: 0 };

    try {
      const res = await authFetch(`${BASE_URL}/sync/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutations: queue })
      });
      if (res.ok) {
        const result = await res.json();
        await localDb.syncQueue.clear();
        return { synced: result.syncedCount };
      }
    } catch (err) {
      console.error('Failed to sync offline queue:', err);
    }
    return { synced: 0 };
  }
};

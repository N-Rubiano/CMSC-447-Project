/**
 * PunchList Pro — RBAC Single Source of Truth
 * All role definitions, labels, permissions, and category mappings live here.
 * Import from this file — do NOT define roles inline in components.
 */

/** Human-readable label for each canonical role key */
export const ROLE_LABELS = {
  admin:              'Facility Administrator',
  general_contractor: 'General Contractor',
  architect:          'Architect / Engineer',
  field_inspector:    'Field Inspector',
  sub_contractor:     'Trade Subcontractor',
  owner:              'Owner Representative',
};

/**
 * Permissions matrix — 6 canonical rows.
 * Used by SettingsPage "Role Permissions" tab and mockData INITIAL_SETTINGS.
 */
export const ROLE_PERMISSIONS = [
  { role: 'admin',              label: 'Facility Administrator', viewBlueprints: true,  dropPins: true,  approvePunches: true,  editDocs: true,  adminSettings: true  },
  { role: 'general_contractor', label: 'General Contractor',     viewBlueprints: true,  dropPins: true,  approvePunches: true,  editDocs: true,  adminSettings: false },
  { role: 'architect',          label: 'Architect / Engineer',   viewBlueprints: true,  dropPins: true,  approvePunches: false, editDocs: true,  adminSettings: false },
  { role: 'field_inspector',    label: 'Field Inspector',        viewBlueprints: true,  dropPins: true,  approvePunches: false, editDocs: true,  adminSettings: false },
  { role: 'sub_contractor',     label: 'Trade Subcontractor',    viewBlueprints: true,  dropPins: false, approvePunches: false, editDocs: false, adminSettings: false },
  { role: 'owner',              label: 'Owner Representative',   viewBlueprints: true,  dropPins: false, approvePunches: false, editDocs: false, adminSettings: false },
];

/**
 * Maps each canonical role key → TeamPage UI bucket.
 * - 'admin'       → admin tab
 * - 'owner'       → admin tab  (read-only executive, still shows in admin roster)
 * - 'general_contractor' | 'architect' | 'field_inspector' → contractor tab
 * - 'sub_contractor'  → subcontractor tab
 */
export const ROLE_TO_CATEGORY = {
  admin:              'admin',
  owner:              'admin',
  general_contractor: 'contractor',
  architect:          'contractor',
  field_inspector:    'contractor',
  sub_contractor:     'subcontractor',
};

/** Full canonical role definitions with UI metadata (colours, descriptions).
 *  Kept here so TeamPage can import a single authoritative array. */
export const CANONICAL_ROLES = [
  {
    key: 'admin',
    label: 'Facility Administrator',
    title: 'Project Director, Facility Owner',
    description: 'Full System Authority: Provisions user accounts, manages sheet uploads, modifies system settings, and is the only role authorized to close or delete punch items.',
    teamCategory: 'admin',
    color: '#DC2626',
    bg: '#FEE2E2',
    border: '#FCA5A5',
  },
  {
    key: 'general_contractor',
    label: 'General Contractor',
    title: 'Project Superintendent, GC Project Manager',
    description: 'Field Coordination: Allocates items to trade subcontractors, approves or rejects subcontractor remediation submissions, and sponsors subcontractor accounts.',
    teamCategory: 'contractor',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FCD34D',
  },
  {
    key: 'architect',
    label: 'Architect / Engineer',
    title: 'Design Team AIA, Structural Consultant',
    description: 'Specification Compliance: Drops specification discrepancy pins, reviews drawing sets, and audits punch progress.',
    teamCategory: 'contractor',
    color: '#7C3AED',
    bg: '#EDE9FE',
    border: '#C4B5FD',
  },
  {
    key: 'field_inspector',
    label: 'Field Inspector',
    title: 'Municipal Building Inspector, QA/QC Lead',
    description: 'Inspection Capture: Walks jobsite floors, anchors punch pins with photos and priority tags.',
    teamCategory: 'contractor',
    color: '#EA580C',
    bg: '#FFEDD5',
    border: '#FDBA74',
  },
  {
    key: 'sub_contractor',
    label: 'Trade Subcontractor',
    title: 'Mechanical, Electrical, Plumbing, Drywall Foremen',
    description: 'Strictly Scoped: Can only view pins assigned to their trade/company. Can transition items (Open → In Progress → Contractor Review) and upload proof photos.',
    teamCategory: 'subcontractor',
    color: '#2563EB',
    bg: '#DBEAFE',
    border: '#93C5FD',
  },
  {
    key: 'owner',
    label: 'Owner Representative',
    title: 'Client Executive, Capital Asset Manager',
    description: 'Executive Visibility: Read-only oversight across project milestones, punch progress gauges, and formal PDF export generation.',
    teamCategory: 'admin',
    color: '#059669',
    bg: '#D1FAE5',
    border: '#6EE7B7',
  },
];

/**
 * PunchList Pro — Mock Data Store
 * All dates set in September 2026.
 * Typed entities for Enterprise Construction Field Operations.
 */

export const TRADES = {
  MP: { code: 'MP', name: 'Mechanical / Plumbing', color: '#0284C7', bg: '#E0F2FE', text: '#0369A1' },
  AC: { code: 'AC', name: 'Architectural / Finishes', color: '#4F46E5', bg: '#EEF2FF', text: '#3730A3' },
  EL: { code: 'EL', name: 'Electrical Systems', color: '#D97706', bg: '#FEF3C7', text: '#B45309' },
  FP: { code: 'FP', name: 'Fire Protection & Suppression', color: '#DC2626', bg: '#FEE2E2', text: '#991B1B' },
  ST: { code: 'ST', name: 'Structural Framing', color: '#7C3AED', bg: '#EDE9FE', text: '#5B21B6' },
  GL: { code: 'GL', name: 'Glazing & Curtainwall', color: '#0D9488', bg: '#CCFBF1', text: '#115E59' },
  DW: { code: 'DW', name: 'Drywall & Partitions', color: '#EA580C', bg: '#FFEDD5', text: '#9A3412' },
  FL: { code: 'FL', name: 'Flooring & Screed', color: '#16A34A', bg: '#DCFCE7', text: '#166534' }
};

export const PROJECTS = [
  {
    id: 'proj-1',
    code: 'UMBC-2026',
    name: 'UMBC Campus & Harbor Point',
    contractor: 'UMBC Facility Operations',
    timezone: 'America/New_York (EST)',
    address: '1000 Hilltop Circle, Baltimore, MD 21250',
    status: 'active',
    totalPunches: 0,
    closedPunches: 0,
    buildings: [
      {
        id: 'administration',
        name: 'Administration Building',
        code: 'ADM',
        floors: [
          { id: '1st-floor', name: '1st Floor', code: '01', defaultSheet: 'A-101' },
          { id: '2nd-floor', name: '2nd Floor', code: '02', defaultSheet: 'A-102' }
        ]
      }
    ]
  }
];

// Sheets start empty — populated when a user uploads a blueprint for a building/floor
export const SHEETS = [];

// Punch items start empty — created by users via the New Punch modal on uploaded blueprints
export const INITIAL_PUNCH_ITEMS = [];

export const TEAM_MEMBERS = [
  {
    id: 'usr-admin-1',
    name: 'Satya Thakur',
    email: 'uw61778@umbc.edu',
    phone: '+1 (410) 455-1000',
    role: 'admin',
    organization: 'UMBC Facility Operations',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    presence: 'on_site',
    presenceText: 'Active'
  }
];

export const TRADE_PARTNERS = [];

// Field photos start empty — captured photos are linked to punch items created by field users
export const FIELD_PHOTOS = [];



// Documents start empty — populated from user uploads or drawing sheets
export const DOCUMENTS = [];

export const CURRENT_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Satya Thakur',
  email: 'uw61778@umbc.edu',
  role: 'admin',
  company: 'UMBC Facility Operations',
  avatar: 'https://ui-avatars.com/api/?name=Satya+Thakur&background=D97706&color=fff&bold=true',
  avatar_url: 'https://ui-avatars.com/api/?name=Satya+Thakur&background=D97706&color=fff&bold=true'
};

export const PRODUCT_STATS = {
  resolutionRate: '98.4%',
  punchesClosed: '14,820',
  activeSheets: '340+'
};

export const INITIAL_SETTINGS = {
  projectName: 'UMBC Campus & Harbor Point',
  projectCode: 'UMBC-2026',
  generalContractor: 'UMBC Facility Operations',
  timezone: 'America/New_York (EST)',
  siteAddress: '1000 Hilltop Circle, Baltimore, MD 21250',
  notifications: {
    assignmentEmails: true,
    dailyDigest: true,
    criticalAlerts: true,
    reviewRequests: false
  },
  offlineSync: {
    autoSyncCellular: false,
    backgroundSync: true,
    cachedSheetsCount: 14,
    queuedChangesCount: 0
  },
  fieldDefaults: {
    defaultPriority: 'Medium',
    dueOffsetDays: '7',
    gpsCapture: true,
    autoTradeStamp: true
  },
  permissions: [
    { role: 'Project Executive', viewBlueprints: true, dropPins: true, approvePunches: true, editDocs: true, adminSettings: true },
    { role: 'Superintendent', viewBlueprints: true, dropPins: true, approvePunches: true, editDocs: true, adminSettings: false },
    { role: 'Project Engineer', viewBlueprints: true, dropPins: true, approvePunches: false, editDocs: true, adminSettings: false },
    { role: 'Trade Subcontractor', viewBlueprints: true, dropPins: false, approvePunches: false, editDocs: false, adminSettings: false }
  ]
};

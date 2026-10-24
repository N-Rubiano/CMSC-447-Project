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
    code: 'HPT-2026',
    name: 'Harbor Point Tower 2',
    contractor: 'Apex Construction GC',
    timezone: 'America/New_York (EST)',
    address: '400 Waterfront Way, Suite 1200, Boston, MA 02210',
    totalPunches: 14,
    closedPunches: 9,
    buildings: [
      {
        id: 'bld-1',
        name: 'Tower A (High-Rise)',
        code: 'TWR-A',
        floors: [
          { id: 'flr-b1', name: 'Level B1 — Mech / Central Plant', code: 'B1', defaultSheet: 'M-301' },
          { id: 'flr-01', name: 'Level 01 — Main Lobby & Retail', code: '01', defaultSheet: 'A-301' },
          { id: 'flr-02', name: 'Level 02 — Commercial Suites', code: '02', defaultSheet: 'A-301' },
          { id: 'flr-03', name: 'Level 03 — Office Floorplate', code: '03', defaultSheet: 'A-301' },
          { id: 'flr-04', name: 'Level 04 — Executive Penthouse', code: '04', defaultSheet: 'A-302' }
        ]
      },
      {
        id: 'bld-2',
        name: 'Podium & Parking Garage',
        code: 'POD-G',
        floors: [
          { id: 'flr-p1', name: 'Parking P1 — Grade Entry', code: 'P1', defaultSheet: 'S-201' },
          { id: 'flr-p2', name: 'Parking P2 — Lower Deck', code: 'P2', defaultSheet: 'S-201' }
        ]
      }
    ]
  },
  {
    id: 'proj-2',
    code: 'AIC-2026',
    name: 'Apex Innovation Center',
    contractor: 'Apex Construction GC',
    timezone: 'America/New_York (EST)',
    address: '100 Technology Square, Cambridge, MA 02139',
    totalPunches: 8,
    closedPunches: 6,
    buildings: [
      {
        id: 'bld-3',
        name: 'Research Wing',
        code: 'RS-W',
        floors: [
          { id: 'flr-r1', name: 'Level 01 — Clean Rooms', code: '01', defaultSheet: 'A-301' },
          { id: 'flr-r2', name: 'Level 02 — Wet Labs', code: '02', defaultSheet: 'M-301' }
        ]
      },
      {
        id: 'bld-4',
        name: 'Bio-Lab Core',
        code: 'BIO-C',
        floors: [
          { id: 'flr-b01', name: 'Level 01 — Vivarium & Support', code: '01', defaultSheet: 'S-201' }
        ]
      },
      {
        id: 'bld-5',
        name: 'Administration Hub',
        code: 'ADM-H',
        floors: [
          { id: 'flr-a01', name: 'Level 01 — Atrium', code: '01', defaultSheet: 'A-301' }
        ]
      }
    ]
  },
  {
    id: 'proj-3',
    code: 'BHP-2026',
    name: 'Beacon Health Pavilion',
    contractor: 'Vance & Associates Builders',
    timezone: 'America/New_York (EST)',
    address: '880 Commonwealth Ave, Brookline, MA 02446',
    totalPunches: 11,
    closedPunches: 8,
    buildings: [
      {
        id: 'bld-6',
        name: 'Main Hospital Tower',
        code: 'HOSP-T',
        floors: [
          { id: 'flr-h1', name: 'Level 01 — Emergency & Imaging', code: '01', defaultSheet: 'A-301' },
          { id: 'flr-h2', name: 'Level 02 — Surgical Suites', code: '02', defaultSheet: 'M-301' }
        ]
      },
      {
        id: 'bld-7',
        name: 'Ambulatory Care Facility',
        code: 'AMB-C',
        floors: [
          { id: 'flr-ac1', name: 'Level 01 — Outpatient Clinic', code: '01', defaultSheet: 'A-301' }
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
    id: 'user-1',
    name: 'Marcus Vance',
    email: 'marcus.vance@apexconstruct.com',
    phone: '+1 (617) 555-0142',
    role: 'Superintendent',
    organization: 'Apex Construction GC',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    presence: 'on_site',
    presenceText: 'On site — Level 03'
  },
  {
    id: 'user-2',
    name: 'Sarah Chen, PE',
    email: 'sarah.chen@apexconstruct.com',
    phone: '+1 (617) 555-0199',
    role: 'Project Executive',
    organization: 'Apex Construction GC',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    presence: 'on_site',
    presenceText: 'On site — Trailer'
  },
  {
    id: 'user-3',
    name: 'Liam Harrington',
    email: 'liam.h@apexconstruct.com',
    phone: '+1 (617) 555-0183',
    role: 'Project Engineer',
    organization: 'Apex Construction GC',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    presence: 'away',
    presenceText: 'Away — City Hall Permit'
  },
  {
    id: 'user-4',
    name: 'Clara Oswald, AIA',
    email: 'c.oswald@studiovanguard.com',
    phone: '+1 (617) 555-0211',
    role: 'Architect of Record',
    organization: 'Studio Vanguard Architects',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    presence: 'offline',
    presenceText: 'Offline'
  },
  {
    id: 'user-5',
    name: 'Gregory Hughes',
    email: 'g.hughes@beaconcapital.com',
    phone: '+1 (617) 555-0377',
    role: "Owner's Representative",
    organization: 'Beacon Point Capital RE',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    presence: 'on_site',
    presenceText: 'On site — QA Walk'
  }
];

export const TRADE_PARTNERS = [
  {
    id: 'tp-1',
    name: "Dave O'Connor",
    email: 'dave@beaconfire.com',
    phone: '+1 (617) 555-7101',
    trade: 'FP',
    company: 'Beacon Fire Protection & MEP',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    openCount: 2,
    presence: 'on_site',
    presenceText: 'On site'
  },
  {
    id: 'tp-2',
    name: 'Elena Rostova',
    email: 'elena@primedrywall.com',
    phone: '+1 (617) 555-7102',
    trade: 'DW',
    company: 'Prime Drywall & Doors',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    openCount: 4,
    presence: 'on_site',
    presenceText: 'On site'
  },
  {
    id: 'tp-3',
    name: 'Devon Patel',
    email: 'devon@voltline.com',
    phone: '+1 (617) 555-7103',
    trade: 'EL',
    company: 'VoltLine Electric Inc.',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=200&q=80',
    openCount: 2,
    presence: 'away',
    presenceText: 'Away'
  },
  {
    id: 'tp-4',
    name: 'Tom Gallagher',
    email: 'tom@commonwealthmep.com',
    phone: '+1 (617) 555-7104',
    trade: 'MP',
    company: 'Commonwealth Mechanical',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    openCount: 2,
    presence: 'on_site',
    presenceText: 'On site'
  },
  {
    id: 'tp-5',
    name: 'Carlos Mendez',
    email: 'carlos@horizonglazing.com',
    phone: '+1 (617) 555-7105',
    trade: 'GL',
    company: 'Horizon Glazing & Facades',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
    openCount: 1,
    presence: 'away',
    presenceText: 'Away'
  },
  {
    id: 'tp-6',
    name: 'Frank Kowalski',
    email: 'frank@titansteel.com',
    phone: '+1 (617) 555-7106',
    trade: 'ST',
    company: 'Titan Steel Erectors',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
    openCount: 2,
    presence: 'offline',
    presenceText: 'Offline'
  },
  {
    id: 'tp-7',
    name: 'Samira Khan',
    email: 'samira@urbansurface.com',
    phone: '+1 (617) 555-7107',
    trade: 'FL',
    company: 'Urban Surface & Polish',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80',
    openCount: 1,
    presence: 'on_site',
    presenceText: 'On site'
  }
];

// Field photos start empty — captured photos are linked to punch items created by field users
export const FIELD_PHOTOS = [];



// Documents start empty — populated from user uploads or drawing sheets
export const DOCUMENTS = [];

export const CURRENT_USER = {
  id: 'user-1',
  name: 'Marcus Vance',
  email: 'marcus.vance@apexconstruct.com',
  role: 'Superintendent',
  company: 'Apex Construction GC',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
};

export const PRODUCT_STATS = {
  resolutionRate: '98.4%',
  punchesClosed: '14,820',
  activeSheets: '340+'
};

export const INITIAL_SETTINGS = {
  projectName: 'Harbor Point Tower 2',
  projectCode: 'HPT-2026',
  generalContractor: 'Apex Construction GC',
  timezone: 'America/New_York (EST)',
  siteAddress: '400 Waterfront Way, Suite 1200, Boston, MA 02210',
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

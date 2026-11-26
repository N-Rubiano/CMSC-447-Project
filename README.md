# 📋 PunchList Pro

> **Tablet-First, Industrial-Grade Construction Defect Tracking & Architectural Blueprint Inspection Platform**  
> Built for General Contractors, Specialty Subcontractors, Architects, Field Inspectors, and Facility Owners.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2F%20Python%203.14-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2F%20Vite-61DAFB.svg?style=flat-square&logo=react)](https://react.dev)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20(Supabase)%20%7C%20SQLite%20Fallback-336791.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Real-Time](https://img.shields.io/badge/Sync-Socket.IO-010101.svg?style=flat-square&logo=socketdotio)](https://socket.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

---

## 📑 Table of Contents

- [🏗️ Overview](#️-overview)
- [📸 UI Showcase](#-ui-showcase)
- [🧩 Architecture & System Design (UML)](#-architecture--system-design-uml)
  - [1. System Component Architecture](#1-system-component-architecture)
  - [2. End-to-End Field Inspection Sequence](#2-end-to-end-field-inspection-sequence)
  - [3. Defect Item Lifecycle State Machine](#3-defect-item-lifecycle-state-machine)
  - [4. User Onboarding & Account Provisioning Sequence](#4-user-onboarding--account-provisioning-sequence)
- [🗄️ Database Schema & Entity-Relationship Diagram (ERD)](#️-database-schema--entity-relationship-diagram-erd)
- [📁 Project Structure](#-project-structure)
- [👥 Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [✨ Key Features](#-key-features)
- [⚡ Quick Start & Installation](#-quick-start--installation)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Environment Variables](#4-environment-variables)
  - [5. Run Development Servers](#5-run-development-servers)
- [🧪 Testing & Verification](#-testing--verification)
- [🐳 Deployment & Production](#-deployment--production)
- [📚 Documentation Index](#-documentation-index)
- [📄 License](#-license)

---

## 🏗️ Overview

**PunchList Pro** is a modern web and tablet-native construction punch-list management platform. Designed specifically for active job sites, it replaces fragmented email threads, paper plans, and spreadsheets with coordinate-anchored blueprint annotations, instant real-time synchronization, and rigorous role-based closeout governance.

### Core Problems Solved
- **No Coordinate Drift**: Defect pins are anchored directly to vector/raster drawing coordinate space rather than screen pixels.
- **Strict Role Separation**: Subcontractors cannot self-approve or close items; only Facility Administrators hold closeout authority.
- **Zero-Latency Field Sync**: WebSocket broadcasting ensures engineers in field trailers and superintendents on catwalks see identical pin states instantaneously.
- **Offline Reliability**: IndexedDB local storage queues edits and caches drawing sets when cellular coverage drops underground or inside concrete cores.

---

## 📸 UI Showcase

| Landing Page | Field Dashboard |
| :---: | :---: |
| ![PunchList Pro Landing Page](assets/screenshots/landing.png) | ![Field Dashboard](assets/screenshots/dashboard.png) |

| Interactive Blueprint Viewer | Geotagged Progress & Field Photos |
| :---: | :---: |
| ![Interactive Blueprint Viewer](assets/screenshots/blueprints.png) | ![Progress and Field Photos](assets/screenshots/photos.png) |

---

## 🧩 Architecture & System Design (UML)

### 1. System Component Architecture

```mermaid
flowchart TD
    subgraph ClientTier["Client Tier (Field Tablets & Desktops)"]
        UI["React 18 SPA (Vite)"]
        Canvas["HTML5 Canvas / PDF.js Vector Engine"]
        IDB["IndexedDB / Dexie.js (Offline Cache)"]
        SIOClient["Socket.IO Client"]
    end

    subgraph GatewayTier["API & Gateway Tier"]
        Proxy["Vite Proxy / Reverse Proxy"]
        FastAPI["FastAPI ASGI Server (Python 3.14)"]
        AuthMid["Auth Middleware (JWT / Supabase)"]
        RBACMid["RBAC & Account Status Enforcer"]
        SIOServer["Async Socket.IO Gateway"]
    end

    subgraph ServiceTier["Application Services"]
        PinRouter["Pins & Markups Router"]
        SheetRouter["Drawing Sheets Router"]
        TeamRouter["Team & Onboarding Router"]
        AuthRouter["Authentication & Profile Router"]
        PDFService["ReportLab PDF Exporter"]
    end

    subgraph PersistenceTier["Persistence Tier"]
        Supabase["Cloud PostgreSQL (Supabase)"]
        SQLite["Local SQLite (Offline Fallback Engine)"]
    end

    UI --> Canvas
    UI --> IDB
    UI --> SIOClient

    UI -- "REST (JSON / Multipart)" --> Proxy
    SIOClient -- "WebSocket (WSS / WS)" --> SIOServer
    Proxy --> FastAPI

    FastAPI --> AuthMid
    AuthMid --> RBACMid
    RBACMid --> PinRouter & SheetRouter & TeamRouter & AuthRouter

    PinRouter & TeamRouter --> SIOServer
    PinRouter --> PDFService

    PinRouter & SheetRouter & TeamRouter & AuthRouter --> Supabase
    PinRouter & SheetRouter & TeamRouter & AuthRouter -. "Local Fallback" .-> SQLite
```

---

### 2. End-to-End Field Inspection Sequence

The following sequence illustrates a complete defect resolution lifecycle: from pin drop by an inspector to subcontractor remediation, contractor review, and final administrator closeout.

```mermaid
sequenceDiagram
    autonumber
    actor Inspector as Field Inspector
    actor Sub as Subcontractor
    actor GC as General Contractor
    actor Admin as Facility Administrator
    participant FE as Frontend (React App)
    participant API as FastAPI Backend
    participant WS as Socket.IO Hub
    participant DB as PostgreSQL / DB

    Note over Inspector,Admin: Phase 1: Defect Observation & Pin Drop
    Inspector->>FE: Tap blueprint sheet at (X, Y) coordinates
    Inspector->>FE: Fill defect details (Discipline, Priority, Photo)
    FE->>API: POST /api/pins
    API->>DB: INSERT INTO pins (status='open', x_pct, y_pct)
    API->>DB: INSERT INTO audit_logs (action='CREATED')
    API->>WS: emit('pin:created', pinData)
    WS-->>FE: Real-time update to all active project viewers
    FE-->>Sub: Tablet receives live notification & visual pin on sheet

    Note over Sub,API: Phase 2: Remediating Defect in Field
    Sub->>FE: Opens pin, changes status to 'in_progress'
    FE->>API: PATCH /api/pins/{id}/status (status='in_progress')
    API->>DB: UPDATE pins SET status='in_progress'
    API->>WS: emit('pin:updated', pinData)

    Sub->>FE: Uploads photo evidence (POST /api/pins/{id}/photos)
    Sub->>FE: Submits item for review ('submitted_for_contractor_review')
    FE->>API: PATCH /api/pins/{id}/status (status='submitted_for_contractor_review')
    API->>DB: UPDATE pins SET status='submitted_for_contractor_review'
    API->>WS: emit('pin:updated', pinData)

    Note over GC,Admin: Phase 3: Verification & Approval Gate
    GC->>FE: Inspects work against architectural drawing
    alt Remediation Incomplete
        GC->>FE: Rejects remediation with comment
        FE->>API: PATCH /api/pins/{id}/status (status='in_progress')
    else Remediation Verified
        GC->>FE: Approves fix, forwards to Admin
        FE->>API: PATCH /api/pins/{id}/status (status='submitted_for_admin_review')
    end
    API->>DB: UPDATE pins SET status=...
    API->>WS: emit('pin:updated', pinData)

    Note over Admin,DB: Phase 4: Final Signoff & Closeout
    Admin->>FE: Performs final compliance audit
    Admin->>FE: Clicks "Approve & Close Defect"
    FE->>API: PATCH /api/pins/{id}/status (status='closed')
    API->>DB: UPDATE pins SET status='closed', closed_at=NOW()
    API->>DB: INSERT INTO audit_logs (action='STATUS_CHANGED')
    API->>WS: emit('pin:updated', {id: pinId, status: 'closed'})
    WS-->>FE: Pin ring updates to Green (Closed) across all field tablets
```

---

### 3. Defect Item Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Open: Pin Dropped (Inspector / Architect / GC / Admin)

    Open --> InProgress: Subcontractor / Inspector begins remediation
    InProgress --> ContractorReview: Submitted for Contractor Review

    state ContractorReview {
        [*] --> PendingGC
        PendingGC --> RemediationRejected: GC finds defect still present
        PendingGC --> RemediationApproved: GC verifies compliance
    }

    RemediationRejected --> InProgress: Rework required with notes
    RemediationApproved --> AdminReview: Forwarded for executive signoff

    state AdminReview {
        [*] --> PendingAdmin
        PendingAdmin --> AdminAuditPassed: Facility Admin signs off
        PendingAdmin --> InProgress: Admin requires further rework
    }

    AdminAuditPassed --> Closed: Final Sign-off Recorded in Audit Trail
    Closed --> [*]
```

---

### 4. User Onboarding & Account Provisioning Sequence

Users are provisioned by authorized administrators rather than registering freely:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Facility Administrator
    actor User as New Subcontractor
    participant App as Team Administration UI
    participant Backend as FastAPI Auth Engine
    participant DB as Database

    Admin->>App: Submits Provisioning Form (Name, Email, Role, Trade, Projects)
    App->>Backend: POST /api/team
    Backend->>Backend: Validate Admin privileges & email uniqueness
    Backend->>Backend: Generate cryptographically secure token (URL-safe, 32 bytes)
    Backend->>DB: INSERT INTO users (status='pending_invitation', must_reset_password=TRUE)
    Backend->>DB: INSERT INTO project_members (project assignments)
    Backend-->>App: Returns invitation link: /#onboard?token={token}
    App-->>Admin: Displays handoff modal & copyable invite link

    Admin->>User: Securely conveys invitation link
    User->>App: Opens /#onboard?token={token}
    App->>Backend: GET /api/auth/invitation?token={token}
    Backend->>DB: Validate token validity & expiration timestamp
    Backend-->>App: Returns user metadata (Name, Email, Trade, Assigned Projects)

    User->>App: Sets new strong password (>= 8 chars, mixed case, symbol)
    App->>Backend: POST /api/auth/complete-onboarding
    Backend->>Backend: Hash password with bcrypt (12 rounds)
    Backend->>DB: UPDATE users SET status='active', must_reset_password=FALSE, token=NULL
    Backend-->>App: Returns JWT bearer session token
    App-->>User: Grants immediate entry into assigned project workspace
```

---

## 🗄️ Database Schema & Entity-Relationship Diagram (ERD)

The database schema is designed for multi-tenant construction project management, enforcing foreign keys, cascade rules, and audit logging.

```mermaid
erDiagram
    COMPANIES ||--o{ USERS : "employs"
    PROJECTS ||--o{ PROJECT_MEMBERS : "allocates"
    USERS ||--o{ PROJECT_MEMBERS : "participates"
    PROJECTS ||--o{ SHEETS : "contains"
    SHEETS ||--o{ SHEET_VERSIONS : "revisions"
    SHEETS ||--o{ PINS : "anchors"
    SHEETS ||--o{ MARKUPS : "annotates"
    USERS ||--o{ PINS : "creates"
    USERS ||--o{ PINS : "assigned_to"
    PINS ||--o{ PIN_PHOTOS : "evidences"
    PINS ||--o{ COMMENTS : "has"
    USERS ||--o{ COMMENTS : "authors"
    PROJECTS ||--o{ DOCUMENTS : "stores"
    PROJECTS ||--o{ AUDIT_LOGS : "records"

    COMPANIES {
        text id PK "e.g. cmp-gc-1"
        text name "Company legal name"
        text type "contractor | subcontractor | owner"
        text parent_contractor_id FK "Sponsoring GC company"
        text trade "Trade discipline"
        text phone "Phone number"
        text email "Official email"
        text license_number "State contractor license"
        text address "Office address"
        timestamptz created_at
    }

    USERS {
        text id PK "User UUID"
        text name "Full Name"
        text email UK "Official email address"
        text role "admin | general_contractor | architect | field_inspector | sub_contractor | owner"
        text password_hash "Bcrypt salted hash"
        text company "Company text label"
        text company_id FK "References COMPANIES(id)"
        text phone "Mobile contact"
        text avatar_url "Profile photo URL"
        text status "active | pending_invitation | pending_approval | suspended | rejected"
        text trade "Specialty trade code (MP, EL, etc.)"
        text invitation_token "Secure onboarding token"
        timestamptz invitation_expires_at "Token TTL"
        boolean must_reset_password "First login flag"
        text presence "active | on_site | away | offline"
        timestamptz created_at
        timestamptz updated_at
    }

    PROJECTS {
        text id PK "Project UUID or slug"
        text name "Project Title"
        text code "Project Short Code (e.g. UMBC-2026)"
        text address "Jobsite location"
        text gc_user_id "Assigned GC user ID"
        text contractor_company_id "Assigned GC company ID"
        text status "active | closeout | archived"
        timestamptz created_at
    }

    PROJECT_MEMBERS {
        text id PK "Membership UUID"
        text project_id FK "References PROJECTS(id)"
        text user_id FK "References USERS(id)"
        text role "Project-level role"
        text company_name "Member company name"
        timestamptz created_at
    }

    SHEETS {
        text id PK "Sheet UUID"
        text project_id FK "References PROJECTS(id)"
        text sheet_number "e.g. A-301, M-102"
        text name "Sheet title"
        text discipline "architectural | mechanical | electrical | structural"
        text floor_level "Floor / level label"
        int version_number "Sheet revision sequence"
        text version "e.g. Rev 1"
        text file_path "Stored PDF path"
        text image_url "Rasterized preview URL"
        int width_pts "Original drawing width"
        int height_pts "Original drawing height"
        timestamptz created_at
    }

    SHEET_VERSIONS {
        text id PK "Version UUID"
        text sheet_id "References SHEETS(id)"
        text project_id "References PROJECTS(id)"
        int version_number "Revision sequence"
        text version_tag "e.g. Rev 2"
        text file_name "Uploaded filename"
        text image_url "Preview image URL"
        text uploaded_by "Uploader user ID/name"
        timestamptz created_at
    }

    PINS {
        text id PK "Pin UUID"
        text project_id "References PROJECTS(id)"
        text sheet_id "References SHEETS(id)"
        int item_number "Sequential item #"
        float x_pct "X coordinate (0-100%)"
        float y_pct "Y coordinate (0-100%)"
        text title "Defect title"
        text description "Detailed observation notes"
        text status "open | in_progress | submitted_for_contractor_review | submitted_for_admin_review | closed"
        text priority "critical | high | medium | low"
        text discipline "Discipline / trade category"
        text stamp_initials "2-letter trade stamp"
        text assigned_to_user_id "Assigned subcontractor user"
        text assigned_subcontractor_id "Assigned subcontractor company"
        text created_by_user_id "Inspector / creator"
        text due_date "Closeout deadline"
        timestamptz created_at
        timestamptz updated_at
        timestamptz closed_at
    }

    PIN_PHOTOS {
        text id PK "Photo UUID"
        text pin_id FK "References PINS(id)"
        text url "Stored photo URL"
        text type "issue | progress | resolved"
        text caption "Photo caption"
        text uploaded_by "Uploader display name"
        timestamptz created_at
    }

    COMMENTS {
        text id PK "Comment UUID"
        text pin_id FK "References PINS(id)"
        text author_id "Author user ID"
        text author_name "Author display name"
        text body "Discussion or field note"
        text parent_id "Optional reply parent"
        timestamptz created_at
    }

    MARKUPS {
        text id PK "Markup UUID"
        text sheet_id FK "References SHEETS(id)"
        text author_id "Author user ID"
        text type "Vector annotation type"
        text points_json "Serialized geometry"
        text stroke_color "Hex color"
        timestamptz created_at
    }

    AUDIT_LOGS {
        text id PK "Log UUID"
        text project_id "Associated project"
        text pin_id "Associated pin"
        text user_id "Actor user ID"
        text user_name "Actor display name"
        text user_role "Role at time of action"
        text action "e.g. CREATED, STATUS_CHANGED, ACCOUNT_PROVISIONED"
        text old_value "Previous value"
        text new_value "New value"
        text details "Audit details"
        timestamptz created_at
    }

    DOCUMENTS {
        text id PK "Document UUID"
        text project_id "Associated project"
        text name "Document title"
        text file_name "Original filename"
        text file_url "Storage URL"
        int file_size_bytes "File size"
        text file_type "MIME type / extension"
        text category "Document category"
        text uploaded_by "Uploader name"
        timestamptz created_at
    }
```

---

## 📁 Project Structure

```text
PunchList/
├── api/                        # Vercel Python serverless entry point (index.py)
├── assets/screenshots/         # README UI showcase captures
├── documents/                  # SRS v2.0, SDD, UI Document, Sprint Reports, Working Agreement
├── backend/
│   └── app/
│       ├── database.py         # Dual PostgreSQL / SQLite WAL DDL & query helpers
│       ├── permissions.py      # Server-side 6-role RBAC & transition validator
│       └── routers/            # auth, projects, sheets, pins, team, exports, audit_logs
├── frontend/
│   ├── public/                 # Favicons, manifest.json, static assets
│   └── src/
│       ├── __tests__/          # Vitest + React Testing Library (11 suites, 57 tests)
│       ├── components/         # AppShell, Dashboard, BlueprintViewer, BlueprintUploadModal,
│       │                       # TeamPage, SettingsPage, DocumentsPage, PhotosPage, Modals
│       ├── data/
│       │   ├── rbac.js         # Single source of truth for 6 roles & live capabilities
│       │   ├── umbcBuildings.js
│       │   └── mockData.js
│       └── services/           # api.js (REST + Dexie IndexedDB), pdfRenderer.js, supabase.js
├── Report.md                   # Autocannon load-test & Gitleaks security audit report
├── docker-compose.yml
└── vercel.json
```

---

## 👥 Role-Based Access Control (RBAC)

PunchList Pro enforces operational security and least privilege across all **6 canonical roles** (`frontend/src/data/rbac.js` + `backend/app/permissions.py`):

| Role Key | Label | View Blueprints | Drop Pins | Approve Signoffs | Upload Docs | Admin Settings |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **`admin`** | Facility Administrator | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`general_contractor`** | General Contractor | ✅ | ✅ | ✅ | ✅ | ❌ |
| **`architect`** | Architect / Engineer | ✅ | ✅ | ❌ | ✅ | ❌ |
| **`field_inspector`** | Field Inspector | ✅ | ✅ | ❌ | ✅ | ❌ |
| **`sub_contractor`** | Trade Subcontractor | ✅ | ❌ | ❌ | ❌ | ❌ |
| **`owner`** | Owner Representative | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## ✨ Key Features

- **Pinch-to-Zoom 4K Vector Canvas**: Dynamic HTML5 Canvas + `PDF.js` rendering of CAD & architectural drawing sets without rasterization loss.
- **Normalized Coordinate Anchoring**: Pins store relative ratios $(x/W, y/H)$ so markers stay pinned to the exact architectural feature regardless of screen resolution, device orientation, or zoom level.
- **Subcontractor Trade Stamp Markers & Deadlines**: Color-coded 2-letter trade badges (`MP`, `AC`, `EL`, `FP`, `ST`, `GL`, `DW`, `FL`) with assignee routing and persisted closeout deadlines (`due_date`).
- **Progress Photo Uploads & Live Gallery Sync**: Attach `Progress`, `Issue`, or `Completion` photos directly inside any open punch item drawer; uploads sync immediately to the **Photos** gallery with project, building, floor, and grid metadata.
- **Floor-Scoped PDF & Excel Reports**: Generates formal punch lists with rendered blueprint snapshots (`pypdfium2` + ReportLab) and Excel workbooks scoped to the active floor or all floors.
- **Tablet-First, Laptop & Mobile Responsive UI**: Dual-pane building & level navigator with keyboard quick-select, collapsible rail, bottom mobile tab bar, and touch-safe `44px` interactive controls.
- **Real-Time WebSockets & Offline Queue**: Powered by `python-socketio` and Dexie/IndexedDB for instant multi-device sync and offline resilience.

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11 or higher (Python 3.14 recommended)
- **Git**

### 1. Clone Repository
```bash
git clone https://github.com/SdThakur/CMSC-447-Project.git
cd CMSC-447-Project
```

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Create and activate Python virtual environment
python -m venv venv
.\venv\Scripts\activate      # Windows (PowerShell)
# or: source venv/bin/activate  # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
# In another terminal, navigate to frontend
cd frontend

# Install npm packages
npm install
```

### 4. Environment Variables
Create your configuration files from the templates:

```bash
# Backend (.env)
cp backend/.env.example backend/.env

# Frontend (.env)
cp frontend/.env.example frontend/.env
```

**Key Backend Variables (`backend/.env`):**
```env
PORT=4000
JWT_SECRET=your-secure-jwt-secret-key
DATABASE_URL=postgresql+pg8000://user:password@host:5432/dbname # Omit for SQLite fallback
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

*Note: If `DATABASE_URL` is omitted, PunchList Pro automatically initializes a local SQLite database at `backend/data/punchlist.db` with sample data.*

### 5. Run Development Servers
From the project root:
```bash
# Start both Backend (Port 4000) and Frontend (Port 3000) concurrently
npm run dev
```

| Service | URL | Description |
|---|---|---|
| **Frontend App** | [http://localhost:3000](http://localhost:3000) | React SPA with Vite hot reload |
| **FastAPI Backend** | [http://localhost:4000](http://localhost:4000) | Python REST & WebSocket gateway |
| **Swagger Interactive Docs** | [http://localhost:4000/docs](http://localhost:4000/docs) | Interactive OpenAPI testing explorer |
| **ReDoc Specification** | [http://localhost:4000/redoc](http://localhost:4000/redoc) | Human-readable API documentation |

---

## 🧪 Testing & Verification

The codebase includes end-to-end unit and integration test suites:

### Run Backend Tests (Pytest)
```bash
cd backend
.\venv\Scripts\python.exe -m pytest -v
```
Tests cover:
- Authentication & bcrypt password verification
- Multi-step onboarding and invitation token validation
- RBAC capability matrices and status transition rules
- Team member provisioning and administrator approval flows

### Run Frontend Tests (Vitest)
```bash
cd frontend
npm test
```
11 test suites (57 tests) cover:
- RBAC 6-role capability enforcement (`rbac.test.js`)
- AppShell topbar, collapsible rail, Building & Level selector, and role-gated New Punch (`AppShell.test.jsx`)
- Team Administration & 6-role onboarding (`TeamPage.test.jsx`)
- Blueprint & revision upload modal (`BlueprintUploadModal.test.jsx`)
- Settings profile, RBAC matrix, and live IndexedDB cache stats (`SettingsPage.test.jsx`)
- Login, Onboarding, Landing, ExportModal, Sidebar, and StampRenderer math

### Production Build Verification
```bash
cd frontend
npm run build
```

---

## 🐳 Deployment & Production

### Vercel Deployment
PunchList Pro is configured for seamless deployment on Vercel:
- **Frontend**: Built via Vite to `frontend/dist`
- **Backend API**: Deployed as Python serverless functions via [`api/index.py`](file:///api/index.py)
- **Configuration**: Managed in [`vercel.json`](file:///vercel.json) with `"framework": "vite"`

### Docker Compose
```bash
# Spin up complete stack with Docker Compose
docker-compose up --build -d

# Inspect status
docker-compose ps
```

---

## 📄 License

Developed for **CMSC 447** at the University of Maryland, Baltimore County (UMBC).  
Licensed under the [MIT License](LICENSE).

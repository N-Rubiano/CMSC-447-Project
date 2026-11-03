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
- [🧩 Architecture & System Design (UML)](#-architecture--system-design-uml)
  - [1. System Component Architecture](#1-system-component-architecture)
  - [2. End-to-End Field Inspection Sequence](#2-end-to-end-field-inspection-sequence)
  - [3. Defect Item Lifecycle State Machine](#3-defect-item-lifecycle-state-machine)
  - [4. User Onboarding & Account Provisioning Sequence](#4-user-onboarding--account-provisioning-sequence)
- [🗄️ Database Schema & Entity-Relationship Diagram (ERD)](#️-database-schema--entity-relationship-diagram-erd)
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
    Inspector->>FE: Fill defect details (Trade: MP, Priority: High, Photo)
    FE->>API: POST /api/projects/{id}/sheets/{id}/pins
    API->>DB: INSERT INTO pins (status='open', trade='MP')
    API->>DB: INSERT INTO audit_logs (action='PIN_CREATED')
    API->>WS: broadcast('pin_created', pinData)
    WS-->>FE: Real-time update to all active project viewers
    FE-->>Sub: Tablet receives live notification & visual pin on sheet

    Note over Sub,API: Phase 2: Remediating Defect in Field
    Sub->>FE: Opens pin, changes status to 'in_progress'
    FE->>API: PATCH /api/pins/{id}/status (new_status='in_progress')
    API->>DB: UPDATE pins SET status='in_progress'
    API->>WS: broadcast('pin_status_changed', {status: 'in_progress'})

    Sub->>FE: Uploads photo evidence of completed work
    Sub->>FE: Submits item for review ('contractor_review')
    FE->>API: PATCH /api/pins/{id}/status (new_status='contractor_review')
    API->>DB: UPDATE pins SET status='contractor_review', resolution_photo_url=...
    API->>WS: broadcast('pin_status_changed')

    Note over GC,Admin: Phase 3: Verification & Approval Gate
    GC->>FE: Inspects work against architectural drawing
    alt Remediation Incomplete
        GC->>FE: Rejects remediation with comment
        FE->>API: PATCH /api/pins/{id}/status (new_status='in_progress')
    else Remediation Verified
        GC->>FE: Approves fix, forwards to Admin
        FE->>API: PATCH /api/pins/{id}/status (new_status='admin_review')
    end
    API->>DB: UPDATE pins SET status=...
    API->>WS: broadcast('pin_status_changed')

    Note over Admin,DB: Phase 4: Final Signoff & Closeout
    Admin->>FE: Performs final compliance audit
    Admin->>FE: Clicks "Approve & Close Defect"
    FE->>API: PATCH /api/pins/{id}/status (new_status='closed')
    API->>DB: UPDATE pins SET status='closed', updated_at=NOW()
    API->>DB: INSERT INTO audit_logs (action='PIN_CLOSED')
    API->>WS: broadcast('pin_closed', {id: pinId})
    WS-->>FE: Pin ring updates to Green (Closed) across all field tablets
```

---

### 3. Defect Item Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Open: Pin Dropped (Inspector / GC / Admin)

    Open --> InProgress: Subcontractor acknowledges & begins remediation
    InProgress --> ContractorReview: Subcontractor submits fix + photo evidence

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
    SHEETS ||--o{ PINS : "anchors"
    USERS ||--o{ PINS : "creates"
    USERS ||--o{ PINS : "assigned_to"
    PINS ||--o{ PIN_COMMENTS : "has"
    USERS ||--o{ PIN_COMMENTS : "authors"
    PINS ||--o{ PIN_STATUS_HISTORY : "tracks"
    PROJECTS ||--o{ DOCUMENTS : "stores"
    PROJECTS ||--o{ AUDIT_LOGS : "records"

    COMPANIES {
        string id PK "e.g. cmp-gc-1"
        string name "Company legal name"
        string type "contractor | subcontractor | owner"
        string trade "Trade discipline"
        string phone "Phone number"
        string email "Official email"
        string license_number "State contractor license"
        string address "Office address"
        timestamp created_at
    }

    USERS {
        uuid id PK "User UUID"
        string name "Full Name"
        string email UK "Official email address"
        string role "admin | general_contractor | sub_contractor | architect | owner | field_inspector"
        string password_hash "Bcrypt salted hash"
        string company "Company text label"
        string company_id FK "References COMPANIES(id)"
        string phone "Mobile contact"
        string avatar_url "Profile photo URL"
        string status "active | pending_invitation | pending_approval | suspended | rejected"
        string trade "Specialty trade code (MP, EL, etc.)"
        string invitation_token "Secure onboarding token"
        timestamp invitation_expires_at "Token TTL"
        boolean must_reset_password "First login flag"
        string presence "on_site | away | offline"
        timestamp created_at
        timestamp updated_at
    }

    PROJECTS {
        uuid id PK "Project UUID or slug"
        string name "Project Title"
        string code "Project Short Code (e.g. HPT-2026)"
        string address "Jobsite location"
        string status "active | closeout | archived"
        timestamp created_at
        timestamp updated_at
    }

    PROJECT_MEMBERS {
        uuid id PK "Membership UUID"
        uuid project_id FK "References PROJECTS(id)"
        uuid user_id FK "References USERS(id)"
        string role "Project-level role override"
        json permissions "Array of permitted scopes"
        timestamp created_at
    }

    SHEETS {
        uuid id PK "Sheet UUID"
        uuid project_id FK "References PROJECTS(id)"
        string sheet_number "e.g. A-301, M-102"
        string name "Level 01 Architectural Plan"
        string discipline "architectural | mechanical | electrical | structural"
        string floor_level "Level 01, B1, Penthouse"
        int version_number "Sheet revision sequence"
        string file_url "Storage location of drawing (PDF / Image)"
        int width "Original drawing pixel width"
        int height "Original drawing pixel height"
        timestamp created_at
    }

    PINS {
        uuid id PK "Pin UUID"
        uuid project_id FK "References PROJECTS(id)"
        uuid sheet_id FK "References SHEETS(id)"
        float x "X coordinate (0.0 to 1.0 normalized)"
        float y "Y coordinate (0.0 to 1.0 normalized)"
        string title "Defect title"
        text description "Detailed observation notes"
        string status "open | in_progress | contractor_review | admin_review | closed"
        string priority "Critical | High | Medium | Low"
        string trade "Trade stamp code (MP, EL, DW, etc.)"
        uuid assigned_user_id FK "Assigned subcontractor user"
        uuid created_by FK "Inspector / creator"
        string photo_url "Initial defect photo"
        string resolution_photo_url "Remediation evidence photo"
        timestamp due_date "Closeout deadline"
        timestamp created_at
        timestamp updated_at
    }

    PIN_COMMENTS {
        uuid id PK "Comment UUID"
        uuid pin_id FK "References PINS(id)"
        uuid user_id FK "References USERS(id)"
        text comment "Discussion or field note"
        string photo_url "Attached observation photo"
        timestamp created_at
    }

    PIN_STATUS_HISTORY {
        uuid id PK "History UUID"
        uuid pin_id FK "References PINS(id)"
        string changed_by "User name / ID who transitioned"
        string old_status "Previous lifecycle status"
        string new_status "Target lifecycle status"
        text comment "Transition justification note"
        timestamp created_at
    }

    AUDIT_LOGS {
        uuid id PK "Log UUID"
        uuid project_id "Associated project"
        uuid pin_id "Associated pin"
        uuid user_id "Actor user ID"
        string user_name "Actor display name"
        string user_role "Role at time of action"
        string action "e.g. PIN_CREATED, ACCOUNT_PROVISIONED"
        text old_value "Previous value"
        text new_value "New value"
        text details "Structured JSON or audit string"
        timestamp created_at
    }

    DOCUMENTS {
        uuid id PK "Document UUID"
        uuid project_id FK "References PROJECTS(id)"
        string name "Document title"
        string file_name "Original filename"
        string file_url "Storage URL"
        int file_size_bytes "File size"
        string mime_type "application/pdf, image/png"
        string uploaded_by "Uploader name / ID"
        timestamp created_at
    }
```

---

## 👥 Role-Based Access Control (RBAC)

PunchList Pro enforces an enterprise construction governance matrix to guarantee data integrity:

| Role | Label | Target Persona | Scope & Permissions |
|---|---|---|---|
| **`admin`** | Facility Administrator | Project Director, Facility Owner | **Full System Authority**: Provisions user accounts, manages sheet uploads, modifies system settings, and is the **only role authorized to close or delete punch items**. |
| **`general_contractor`** | General Contractor | Project Superintendent, GC Project Manager | **Field Coordination**: Allocates items to trade subcontractors, approves or rejects subcontractor remediation submissions, and sponsors subcontractor accounts. |
| **`sub_contractor`** | Trade Subcontractor | Mechanical, Electrical, Plumbing, Drywall Foremen | **Strictly Scoped**: Can only view pins assigned to their trade/company. Can transition items (`Open` &rarr; `In Progress` &rarr; `Contractor Review`) and upload proof photos. |
| **`architect`** | Architect / Engineer | Design Team AIA, Structural Consultant | **Specification Compliance**: Drops specification discrepancy pins, reviews drawing sets, and audits punch progress. |
| **`owner`** | Owner Representative | Client Executive, Capital Asset Manager | **Executive Visibility**: Read-only oversight across project milestones, punch progress gauges, and formal PDF export generation. |
| **`field_inspector`** | Field Inspector | Municipal Building Inspector, QA/QC Lead | **Inspection Capture**: Walks jobsite floors, anchors punch pins with photos and priority tags. |

---

## ✨ Key Features

- **Pinch-to-Zoom 4K Vector Canvas**: Dynamic HTML5 Canvas rendering of CAD & architectural drawing sets without rasterization loss.
- **Normalized Coordinate Anchoring**: Pins store relative ratios $(x/W, y/H)$ so markers stay pinned to the exact architectural feature regardless of screen resolution, device orientation, or zoom level.
- **Subcontractor Circle Stamp Markers**: Clean 2-letter trade badges (e.g., `MP` for Mechanical Plumbing, `EL` for Electrical, `DW` for Drywall) rendered with color-coded status rings.
- **Customizable User Profile & Avatars**: Users can select from curated professional avatars, upload custom photos (with client-side resizing), or generate initials badges in **Settings**.
- **Real-Time WebSockets**: Powered by `python-socketio`, instant broadcasts alert field tablets of newly dropped pins, status shifts, and markup annotations.
- **Industrial Glare-Resistant Design**: Clean high-contrast typography, large touch targets ($\ge 44\text{px}$), and Amber/Slate palette engineered for sunlight readability on job sites.
- **Executive PDF & CSV Reports**: Generates formal punch lists with embedded high-resolution defect photographs using ReportLab.

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
Tests cover:
- Login page authentication & validation
- Onboarding page credential setup & password strength
- Settings page profile & avatar customization
- Stamp renderer mathematical calculations
- Navigation & AppShell responsive rendering

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

## 📚 Documentation Index

Detailed engineering documentation is located under the [`docs/`](./docs) folder:
- [**Architecture.md**](./docs/Architecture.md) — Architectural blueprints, caching, and network flows
- [**database.md**](./docs/database.md) — Complete database schema, indexes, and migration log
- [**api.md**](./docs/api.md) — REST API endpoint catalog and request/response specifications
- [**testing.md**](./docs/testing.md) — Test matrix, fixtures, and QA verification procedures
- [**debugging.md**](./docs/debugging.md) — Troubleshooting guide, common errors, and diagnostic tools

---

## 📄 License

Developed for **CMSC 447** at the University of Maryland, Baltimore County (UMBC).  
Licensed under the [MIT License](LICENSE).

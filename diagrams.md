# PunchList Pro — Complete Diagrams Reference
> **Starting from scratch?** This document gives you every diagram you need to understand, design, and build PunchList Pro before writing a single line of code.

---

## Table of Contents
1. [System Overview](#1-system-overview--component-diagram)
2. [ER Diagram — Database](#2-er-diagram--database-schema)
3. [UML Class Diagram — Backend Models](#3-uml-class-diagram--backend-domain-models)
4. [UML Use Case Diagram — Roles & Permissions](#4-uml-use-case-diagram--roles--permissions)
5. [UML Sequence Diagram — Login Flow](#5-uml-sequence-diagram--login-flow)
6. [UML Sequence Diagram — Create a Pin (Punch Item)](#6-uml-sequence-diagram--create-a-pin-punch-item)
7. [UML Sequence Diagram — Status Workflow](#7-uml-sequence-diagram--pin-status-workflow)
8. [UML State Machine — Pin Lifecycle](#8-uml-state-machine--pin-lifecycle)
9. [Frontend Component Tree (UML Package Diagram)](#9-frontend-component-tree)
10. [Data Flow Diagram — Offline Sync](#10-data-flow-diagram--offline-sync)

---

## 1. System Overview — Component Diagram

```mermaid
graph TB
    subgraph Browser["🌐 Browser (React + Vite)"]
        UI["React UI\n(JSX Components)"]
        API_SVC["api.js\n(Auth Fetch Wrapper)"]
        LOCAL_DB["IndexedDB\n(Dexie — Offline Cache)"]
        SUPA_CLIENT["Supabase JS Client"]
    end

    subgraph Backend["🐍 Backend (FastAPI + Python)"]
        FASTAPI["FastAPI App\n/api/* routes"]
        SIO["Socket.IO Server\n(Real-time Events)"]
        AUTH_MOD["auth.py\n(JWT + Supabase verify)"]
        PERMS["permissions.py\n(RBAC)"]
        DB["database.py\n(SQLAlchemy Core)"]
        ROUTERS["Routers\nauth, projects, sheets,\npins, users, companies,\ndocuments, markups,\naudit_logs, team, sync"]
    end

    subgraph Storage["💾 Storage"]
        PG["PostgreSQL\n(Production)"]
        SQLITE["SQLite\n(Dev / Fallback)"]
        UPLOADS["/uploads/\n(File System)"]
    end

    subgraph External["☁️ External Services"]
        SUPABASE["Supabase\n(Auth + DB mirror)"]
    end

    UI --> API_SVC
    API_SVC -->|"REST /api/*"| FASTAPI
    API_SVC -->|"WebSocket"| SIO
    API_SVC --> LOCAL_DB
    SUPA_CLIENT <-->|"Auth"| SUPABASE
    API_SVC --> SUPA_CLIENT

    FASTAPI --> ROUTERS
    ROUTERS --> AUTH_MOD
    ROUTERS --> PERMS
    ROUTERS --> DB
    DB --> PG
    DB --> SQLITE
    ROUTERS --> UPLOADS
    AUTH_MOD <-->|"Verify token"| SUPABASE
```

---

## 2. ER Diagram — Database Schema

> **Legend:** PK = Primary Key, FK = Foreign Key, `||--o{` = one-to-many, `||--||` = one-to-one, `}o--o{` = many-to-many (via junction table)

```mermaid
erDiagram
    COMPANIES {
        TEXT id PK
        TEXT name
        TEXT type
        TEXT parent_contractor_id FK
        TEXT phone
        TEXT email
        TEXT license_number
        TEXT trade
        TEXT address
        TEXT contact_person
        TIMESTAMPTZ created_at
    }

    USERS {
        TEXT id PK
        TEXT name
        TEXT email
        TEXT role
        TEXT company
        TEXT company_id FK
        TEXT phone
        TEXT avatar_url
        TEXT password_hash
        TEXT supabase_uid
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    PROJECTS {
        TEXT id PK
        TEXT name
        TEXT code
        TEXT address
        TEXT description
        TEXT client_name
        TIMESTAMPTZ start_date
        TIMESTAMPTZ target_completion
        TEXT gc_user_id FK
        TEXT contractor_company_id FK
        TEXT building_id
        TEXT building_name
        TEXT status
        TIMESTAMPTZ created_at
    }

    PROJECT_MEMBERS {
        TEXT id PK
        TEXT project_id FK
        TEXT user_id FK
        TEXT role
        TEXT company_name
        TIMESTAMPTZ created_at
    }

    SHEETS {
        TEXT id PK
        TEXT project_id FK
        TEXT sheet_number
        TEXT name
        TEXT discipline
        TEXT floor_level
        INTEGER version_number
        INTEGER width_pts
        INTEGER height_pts
        TEXT file_path
        TEXT image_path
        TEXT image_url
        TEXT file_name
        INTEGER page_index
        INTEGER page_count
        TEXT version
        TEXT change_notes
        TEXT scale_ratio
        TEXT building_id
        TEXT building_name
        TEXT uploaded_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    SHEET_VERSIONS {
        TEXT id PK
        TEXT sheet_id FK
        TEXT project_id FK
        INTEGER version_number
        TEXT version_tag
        TEXT version
        TEXT file_name
        TEXT file_path
        TEXT image_path
        TEXT image_url
        INTEGER file_size_bytes
        TEXT uploaded_by FK
        TEXT change_summary
        TEXT change_notes
        INTEGER is_current
        TIMESTAMPTZ created_at
    }

    PINS {
        TEXT id PK
        TEXT sheet_id FK
        TEXT project_id FK
        INTEGER item_number
        TEXT task_id
        TEXT title
        TEXT description
        TEXT status
        TEXT priority
        TEXT discipline
        TEXT room_location
        TEXT root_cause
        TEXT stamp_initials
        TEXT subcontractor_stamp
        FLOAT x_pct
        FLOAT y_pct
        TEXT assigned_to_user_id FK
        TEXT assigned_to_name
        TEXT assigned_to_company
        TEXT assigned_contractor_id FK
        TEXT assigned_subcontractor_id FK
        TEXT created_by_user_id FK
        TEXT created_by_name
        TEXT due_date
        TEXT assignees
        TEXT watchers
        TEXT location
        TEXT start_date
        TEXT end_date
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ closed_at
    }

    PIN_PHOTOS {
        TEXT id PK
        TEXT pin_id FK
        TEXT url
        TEXT type
        TEXT caption
        TEXT uploaded_by
        TEXT uploaded_by_id FK
        TEXT thumbnail_url
        TIMESTAMPTZ created_at
    }

    COMMENTS {
        TEXT id PK
        TEXT pin_id FK
        TEXT author_id FK
        TEXT author_name
        TEXT body
        TEXT parent_id FK
        INTEGER char_count
        BOOLEAN edited
        TIMESTAMPTZ created_at
    }

    MARKUPS {
        TEXT id PK
        TEXT sheet_id FK
        TEXT author_id FK
        TEXT type
        TEXT data
        TEXT points_json
        TEXT stroke_color
        INTEGER stroke_width
        TEXT fill_color
        TEXT label
        TEXT created_by
        TIMESTAMPTZ created_at
    }

    PIN_HISTORY {
        TEXT id PK
        TEXT pin_id FK
        TEXT changed_by FK
        TEXT old_status
        TEXT new_status
        TEXT comment
        TIMESTAMPTZ created_at
    }

    AUDIT_LOGS {
        TEXT id PK
        TEXT project_id FK
        TEXT pin_id FK
        TEXT user_id FK
        TEXT user_name
        TEXT user_role
        TEXT user_company
        TEXT action
        TEXT old_value
        TEXT new_value
        TEXT details
        TIMESTAMPTZ created_at
    }

    SUBCONTRACTORS {
        TEXT id PK
        TEXT name
        TEXT trade
        TEXT contact_name
        TEXT contact_email
        TEXT contact_phone
        TEXT initials
        TEXT color
        TEXT license_number
        TEXT created_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    DOCUMENTS {
        TEXT id PK
        TEXT project_id FK
        TEXT name
        TEXT file_name
        TEXT file_path
        TEXT file_url
        INTEGER file_size_bytes
        TEXT file_type
        TEXT category
        TEXT uploaded_by
        TEXT uploaded_by_id FK
        TIMESTAMPTZ created_at
    }

    %% Relationships
    COMPANIES ||--o{ USERS : "employs"
    COMPANIES ||--o{ COMPANIES : "parent_contractor (self-ref)"
    USERS ||--o{ PROJECT_MEMBERS : "assigned to"
    PROJECTS ||--o{ PROJECT_MEMBERS : "has members"
    PROJECTS ||--o{ SHEETS : "contains"
    PROJECTS ||--o{ PINS : "tracks"
    PROJECTS ||--o{ DOCUMENTS : "stores"
    PROJECTS ||--o{ AUDIT_LOGS : "logs"
    SHEETS ||--o{ PINS : "placed on"
    SHEETS ||--o{ SHEET_VERSIONS : "versioned by"
    SHEETS ||--o{ MARKUPS : "annotated with"
    PINS ||--o{ PIN_PHOTOS : "has photos"
    PINS ||--o{ COMMENTS : "has comments"
    PINS ||--o{ PIN_HISTORY : "tracks changes"
    PINS ||--o{ AUDIT_LOGS : "audited in"
    USERS ||--o{ PINS : "creates / assigned"
    COMMENTS ||--o{ COMMENTS : "replies (parent_id)"
```

---

## 3. UML Class Diagram — Backend Domain Models

```mermaid
classDiagram
    class Company {
        +String id
        +String name
        +String type
        +String parent_contractor_id
        +String phone
        +String email
        +String trade
        +String address
        +DateTime created_at
    }

    class User {
        +String id
        +String name
        +String email
        +String role
        +String company
        +String company_id
        +String password_hash
        +String supabase_uid
        +DateTime created_at
        +DateTime updated_at
    }

    class Project {
        +String id
        +String name
        +String code
        +String address
        +String client_name
        +DateTime start_date
        +DateTime target_completion
        +String gc_user_id
        +String contractor_company_id
        +String status
        +DateTime created_at
    }

    class ProjectMember {
        +String id
        +String project_id
        +String user_id
        +String role
        +String company_name
        +DateTime created_at
    }

    class Sheet {
        +String id
        +String project_id
        +String sheet_number
        +String name
        +String discipline
        +String floor_level
        +Integer version_number
        +String file_path
        +String image_url
        +String scale_ratio
        +DateTime created_at
        +DateTime updated_at
    }

    class SheetVersion {
        +String id
        +String sheet_id
        +String project_id
        +Integer version_number
        +String version_tag
        +Boolean is_current
        +DateTime created_at
    }

    class Pin {
        +String id
        +String sheet_id
        +String project_id
        +Integer item_number
        +String title
        +String description
        +String status
        +String priority
        +String discipline
        +Float x_pct
        +Float y_pct
        +String assigned_to_user_id
        +String assigned_contractor_id
        +String assigned_subcontractor_id
        +String created_by_user_id
        +DateTime due_date
        +DateTime created_at
        +DateTime updated_at
        +DateTime closed_at
    }

    class PinPhoto {
        +String id
        +String pin_id
        +String url
        +String type
        +String caption
        +String uploaded_by_id
        +String thumbnail_url
        +DateTime created_at
    }

    class Comment {
        +String id
        +String pin_id
        +String author_id
        +String body
        +String parent_id
        +Boolean edited
        +DateTime created_at
    }

    class Markup {
        +String id
        +String sheet_id
        +String author_id
        +String type
        +String points_json
        +String stroke_color
        +Integer stroke_width
        +DateTime created_at
    }

    class PinHistory {
        +String id
        +String pin_id
        +String changed_by
        +String old_status
        +String new_status
        +String comment
        +DateTime created_at
    }

    class AuditLog {
        +String id
        +String project_id
        +String pin_id
        +String user_id
        +String action
        +String old_value
        +String new_value
        +DateTime created_at
    }

    class Document {
        +String id
        +String project_id
        +String name
        +String file_url
        +String file_type
        +String category
        +Integer file_size_bytes
        +DateTime created_at
    }

    class Subcontractor {
        +String id
        +String name
        +String trade
        +String initials
        +String color
        +String contact_email
        +DateTime created_at
    }

    %% Associations
    Company "1" --> "0..*" User : employs
    Company "1" --> "0..*" Company : parent of
    User "1" --> "0..*" ProjectMember : has membership
    Project "1" --> "0..*" ProjectMember : has members
    Project "1" --> "0..*" Sheet : contains
    Project "1" --> "0..*" Pin : tracks
    Project "1" --> "0..*" Document : stores
    Project "1" --> "0..*" AuditLog : logs
    Sheet "1" --> "0..*" Pin : hosts
    Sheet "1" --> "0..*" SheetVersion : has versions
    Sheet "1" --> "0..*" Markup : annotated by
    Pin "1" --> "0..*" PinPhoto : has photos
    Pin "1" --> "0..*" Comment : has comments
    Pin "1" --> "0..*" PinHistory : status history
    Comment "1" --> "0..*" Comment : replies
```

---

## 4. UML Use Case Diagram — Roles & Permissions

```mermaid
graph LR
    ADMIN(["👤 Admin\n(Facility Admin)"])
    GC(["👤 General\nContractor"])
    SUB(["👤 Sub\nContractor"])
    ARCH(["👤 Architect"])
    OWNER(["👤 Owner"])
    FI(["👤 Field\nInspector"])

    subgraph Auth["🔐 Authentication"]
        UC_LOGIN["Login"]
        UC_LOGOUT["Logout"]
    end

    subgraph Projects["📁 Projects"]
        UC_VIEW_PROJ["View Projects"]
        UC_CREATE_PROJ["Create Project"]
        UC_UPDATE_PROJ["Update Project"]
        UC_MANAGE_TEAM["Manage Team"]
        UC_MANAGE_COMPANY["Manage Companies"]
    end

    subgraph Sheets["📐 Sheets / Blueprints"]
        UC_VIEW_SHEET["View Sheets"]
        UC_MANAGE_SHEET["Upload / Manage Sheets"]
        UC_MARKUP["Add Markups"]
    end

    subgraph Pins["📌 Punch Items (Pins)"]
        UC_VIEW_PIN["View Pins"]
        UC_CREATE_PIN["Create Pin"]
        UC_UPDATE_PIN["Update Pin"]
        UC_ASSIGN_PIN["Assign Pin"]
        UC_CLOSE_PIN["Close / Delete Pin"]
        UC_UPDATE_OWN_PIN["Update Own Assigned Pin"]
        UC_COMMENT["Add Comment"]
        UC_PHOTO["Upload Photo"]
    end

    subgraph Reports["📊 Reports"]
        UC_EXPORT["Export Reports"]
    end

    ADMIN --> UC_LOGIN
    GC --> UC_LOGIN
    SUB --> UC_LOGIN
    ARCH --> UC_LOGIN
    OWNER --> UC_LOGIN
    FI --> UC_LOGIN

    ADMIN --> UC_VIEW_PROJ
    ADMIN --> UC_CREATE_PROJ
    ADMIN --> UC_UPDATE_PROJ
    ADMIN --> UC_MANAGE_TEAM
    ADMIN --> UC_MANAGE_COMPANY
    ADMIN --> UC_VIEW_SHEET
    ADMIN --> UC_MANAGE_SHEET
    ADMIN --> UC_MARKUP
    ADMIN --> UC_VIEW_PIN
    ADMIN --> UC_CREATE_PIN
    ADMIN --> UC_UPDATE_PIN
    ADMIN --> UC_ASSIGN_PIN
    ADMIN --> UC_CLOSE_PIN
    ADMIN --> UC_COMMENT
    ADMIN --> UC_PHOTO
    ADMIN --> UC_EXPORT

    GC --> UC_VIEW_PROJ
    GC --> UC_UPDATE_PROJ
    GC --> UC_MANAGE_TEAM
    GC --> UC_MANAGE_COMPANY
    GC --> UC_VIEW_SHEET
    GC --> UC_MANAGE_SHEET
    GC --> UC_MARKUP
    GC --> UC_VIEW_PIN
    GC --> UC_CREATE_PIN
    GC --> UC_UPDATE_PIN
    GC --> UC_ASSIGN_PIN
    GC --> UC_COMMENT
    GC --> UC_PHOTO
    GC --> UC_EXPORT

    SUB --> UC_VIEW_PROJ
    SUB --> UC_VIEW_SHEET
    SUB --> UC_VIEW_PIN
    SUB --> UC_UPDATE_OWN_PIN
    SUB --> UC_COMMENT
    SUB --> UC_PHOTO

    ARCH --> UC_VIEW_PROJ
    ARCH --> UC_VIEW_SHEET
    ARCH --> UC_MARKUP
    ARCH --> UC_VIEW_PIN
    ARCH --> UC_CREATE_PIN
    ARCH --> UC_UPDATE_PIN
    ARCH --> UC_COMMENT
    ARCH --> UC_PHOTO
    ARCH --> UC_EXPORT

    OWNER --> UC_VIEW_PROJ
    OWNER --> UC_VIEW_SHEET
    OWNER --> UC_VIEW_PIN
    OWNER --> UC_COMMENT
    OWNER --> UC_EXPORT

    FI --> UC_VIEW_PROJ
    FI --> UC_VIEW_SHEET
    FI --> UC_VIEW_PIN
    FI --> UC_CREATE_PIN
    FI --> UC_UPDATE_PIN
    FI --> UC_COMMENT
    FI --> UC_PHOTO
```

---

## 5. UML Sequence Diagram — Login Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser as React Browser
    participant SupabaseJS as Supabase JS Client
    participant SupabaseCloud as Supabase Cloud Auth
    participant FastAPI as FastAPI Backend
    participant DB as Database

    User->>Browser: Enter email + password → click Login
    Browser->>SupabaseJS: signInWithPassword(email, password)
    SupabaseJS->>SupabaseCloud: POST /auth/v1/token
    SupabaseCloud-->>SupabaseJS: { session: { access_token, ... }, user }
    SupabaseJS-->>Browser: session + user

    Browser->>FastAPI: POST /api/auth/supabase-callback\nAuthorization: Bearer <access_token>
    FastAPI->>SupabaseCloud: GET /auth/v1/user (verify token)
    SupabaseCloud-->>FastAPI: { id: supabase_uid, email }
    FastAPI->>DB: SELECT * FROM users WHERE supabase_uid = ?
    DB-->>FastAPI: user row (role, company_id, etc.)
    FastAPI-->>Browser: { id, name, role, company_id, ... }

    Browser->>Browser: Store user profile in React state
    Browser-->>User: Redirect to Dashboard
```

> **Fallback**: If Supabase is unavailable, the browser falls back to `POST /api/auth/login` using bcrypt password check against the local `users` table, and receives a local JWT token.

---

## 6. UML Sequence Diagram — Create a Pin (Punch Item)

```mermaid
sequenceDiagram
    actor Inspector as Field Inspector
    participant Canvas as SheetCanvas (React)
    participant Modal as NewPunchModal
    participant API as api.js
    participant IndexedDB as Dexie IndexedDB
    participant FastAPI as FastAPI Backend
    participant DB as Database
    participant SIO as Socket.IO Server
    participant OtherUsers as Other Connected Users

    Inspector->>Canvas: Click on blueprint location
    Canvas->>Modal: Open NewPunchModal (x_pct, y_pct)
    Inspector->>Modal: Fill in Title, Priority, Discipline, Assignee
    Inspector->>Modal: Click "Create Pin"

    alt Online
        Modal->>API: api.createPin({ sheet_id, x_pct, y_pct, ... })
        API->>FastAPI: POST /api/pins\nAuthorization: Bearer <token>
        FastAPI->>FastAPI: Validate role (need pin.create permission)
        FastAPI->>DB: INSERT INTO pins (...)
        DB-->>FastAPI: { id, item_number, ... }
        FastAPI->>SIO: Emit "pin_created" event
        SIO-->>OtherUsers: Real-time update: new pin
        FastAPI-->>API: 201 Created { pin }
        API->>IndexedDB: localDb.pins.put(pin)
        API-->>Modal: pin object
        Modal-->>Canvas: Pin rendered at (x_pct, y_pct)
    else Offline
        Modal->>API: api.createPin({ ... })
        API->>IndexedDB: Store offline pin + add to syncQueue
        API-->>Modal: offlinePin (id = "offline-pin-{timestamp}")
        Modal-->>Canvas: Pin rendered (greyed out / pending)
        Note over API,IndexedDB: Synced later via /api/sync/batch
    end
```

---

## 7. UML Sequence Diagram — Pin Status Workflow

```mermaid
sequenceDiagram
    actor Sub as Subcontractor
    actor GC as General Contractor
    actor Admin as Facility Admin
    participant API as FastAPI /api/pins/:id/status
    participant Perms as permissions.py
    participant DB as Database

    Note over Sub: Pin is "open"
    Sub->>API: PATCH /api/pins/:id/status { status: "in_progress" }
    API->>Perms: validate_status_transition(sub, pin, "in_progress")
    Perms-->>API: { valid: true }
    API->>DB: UPDATE pins SET status='in_progress'
    API-->>Sub: 200 OK { status: "in_progress" }

    Note over Sub: Work complete
    Sub->>API: PATCH /api/pins/:id/status { status: "submitted_for_contractor_review" }
    API->>Perms: validate_status_transition(sub, pin, "submitted_for_contractor_review")
    Perms-->>API: { valid: true }
    API->>DB: UPDATE pins SET status='submitted_for_contractor_review'
    API-->>Sub: 200 OK

    Note over GC: Reviewing
    GC->>API: PATCH /api/pins/:id/status { status: "submitted_for_admin_review" }
    API->>Perms: validate_status_transition(gc, pin, "submitted_for_admin_review")
    Perms-->>API: { valid: true }
    API->>DB: UPDATE pins SET status='submitted_for_admin_review'
    API-->>GC: 200 OK

    Note over Admin: Final review
    Admin->>API: PATCH /api/pins/:id/status { status: "closed" }
    API->>Perms: validate_status_transition(admin, pin, "closed")
    Perms-->>API: { valid: true } (admin can always close)
    API->>DB: UPDATE pins SET status='closed', closed_at=NOW()
    API-->>Admin: 200 OK { status: "closed" }
```

---

## 8. UML State Machine — Pin Lifecycle

```mermaid
stateDiagram-v2
    [*] --> open : Pin Created

    open --> in_progress : Sub/GC/Inspector\nstarts work

    in_progress --> submitted_for_contractor_review : Subcontractor\nsubmits work

    submitted_for_contractor_review --> in_progress : GC sends back\n(needs more work)

    submitted_for_contractor_review --> submitted_for_admin_review : GC approves,\nescalates

    submitted_for_admin_review --> in_progress : Admin rejects,\nsends back

    submitted_for_admin_review --> closed : Admin formally\ncloses

    open --> closed : Admin closes directly

    in_progress --> closed : Admin closes directly

    closed --> [*]

    note right of open
        Assignee can be set here
        Priority: low/medium/high/critical
    end note

    note right of closed
        closed_at timestamp recorded
        Appears in reports
    end note
```

---

## 9. Frontend Component Tree

```mermaid
graph TD
    APP["App.jsx\n(Root, Auth State, Router)"]

    APP --> LOGIN["LoginPage.jsx"]
    APP --> SHELL["AppShell.jsx\n(Authenticated Layout)"]

    SHELL --> NAVBAR["Navbar.jsx\n(Top navigation)"]
    SHELL --> SIDEBAR["Sidebar.jsx\n(Project list)"]
    SHELL --> MAIN["Main Content Area"]

    MAIN --> DASHBOARD["Dashboard.jsx\n(Project selector)"]
    MAIN --> DASHVIEW["DashboardView.jsx\n(Stats & KPIs)"]
    MAIN --> BLUEPRINT["BlueprintViewer.jsx\n(Sheet selector)"]
    MAIN --> SHEETCANVAS["SheetCanvas.jsx\n(Pin placement)"]
    MAIN --> PHOTOS["PhotosPage.jsx"]
    MAIN --> DOCUMENTS["DocumentsPage.jsx"]
    MAIN --> TEAM["TeamPage.jsx"]
    MAIN --> SETTINGS["SettingsPage.jsx"]

    SHEETCANVAS --> TOOLBAR["Toolbar.jsx\n(Draw tools)"]
    SHEETCANVAS --> PINDETAIL["PinDetailModal.jsx\n(View/Edit pin)"]
    SHEETCANVAS --> NEWPIN["NewPunchModal.jsx\n(Create pin)"]
    SHEETCANVAS --> MARKUPS["Markup overlays"]

    BLUEPRINT --> SHEETBROWSER["SheetBrowserModal.jsx"]
    BLUEPRINT --> UPLOAD["BlueprintUploadModal.jsx"]
    BLUEPRINT --> SHEETVERSION["SheetVersionModal.jsx"]

    PHOTOS --> LIGHTBOX["PhotoZoomLightbox.jsx"]

    PINDETAIL --> CIRCLEMODAL["CircleStampModal.jsx\n(Subcontractor stamp)"]
    PINDETAIL --> EXPORTMODAL["ExportModal.jsx"]

    DASHBOARD --> ONGOING["OngoingProjectsView.jsx"]
    DASHBOARD --> NEWPROJECT["NewProjectModal.jsx"]

    TEAM --> PROJECTTEAM["ProjectTeamModal.jsx"]

    SETTINGS --> SETTINGSVIEW["SettingsView.jsx"]
    SETTINGS --> FIELDRPT["FieldReportView.jsx"]

    APP --> QUICKSEARCH["QuickSearchModal.jsx\n(Global)"]
```

---

## 10. Data Flow Diagram — Offline Sync

```mermaid
flowchart TD
    A["User Action\n(Create/Update Pin, Save Markup)"]
    B{Online?}
    C["api.js: authFetch\n→ POST /api/pins"]
    D["FastAPI processes\n→ DB updated"]
    E["Socket.IO emits\n→ Other users updated"]
    F["IndexedDB: localDb.pins.put()\n(Cache latest)"]
    G["IndexedDB: localDb.pins.put()\n(Offline record with flag)"]
    H["syncQueue.add()\n{ entity, type, data, timestamp }"]
    I{Back online?}
    J["api.processSyncQueue()\nPOST /api/sync/batch"]
    K["FastAPI: Process batch mutations\n(create/update each item)"]
    L["syncQueue.clear()"]
    M["IndexedDB cache updated\nwith server response"]

    A --> B
    B -- Yes --> C
    C --> D
    D --> E
    D --> F

    B -- No --> G
    G --> H
    H --> I
    I -- No --> I
    I -- Yes --> J
    J --> K
    K --> L
    K --> M
```

---

## Quick Reference: API Endpoints

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| POST | `/api/auth/login` | Local JWT login | — |
| POST | `/api/auth/supabase-callback` | Exchange Supabase token | — |
| GET | `/api/auth/me` | Current user profile | Any |
| GET | `/api/projects` | List all projects | Any |
| POST | `/api/projects` | Create project | Admin |
| PATCH | `/api/projects/:id/status` | Update project status | GC+ |
| GET | `/api/projects/:id/members` | Get project team | Any |
| POST | `/api/projects/:id/members` | Add team member | GC+ |
| GET | `/api/projects/:id/sheets` | List sheets | Any |
| POST | `/api/projects/:id/sheets/upload` | Upload PDF drawing set | GC+ |
| GET | `/api/sheets/:id/versions` | Version history | Any |
| POST | `/api/sheets/:id/versions` | Upload new version | GC+ |
| GET | `/api/sheets/:id/pins` | Pins on a sheet | Any |
| GET | `/api/projects/:id/pins` | All pins for project | Any |
| POST | `/api/pins` | Create punch item | FI+ |
| PUT | `/api/pins/:id` | Update punch item | FI+ |
| PATCH | `/api/pins/:id/status` | Change pin status | Role-gated |
| POST | `/api/pins/:id/assign` | Assign pin | GC+ |
| DELETE | `/api/pins/:id` | Delete pin | Admin |
| POST | `/api/pins/:id/photos` | Upload photo | FI+ |
| POST | `/api/pins/:id/comments` | Add comment | Any |
| GET | `/api/sheets/:id/markups` | Get markups | Any |
| POST | `/api/sheets/:id/markups` | Save markup | Any |
| GET | `/api/companies` | List companies | Any |
| POST | `/api/companies` | Create company | Admin/GC |
| GET | `/api/team` | All users | Admin/GC |
| POST | `/api/team` | Add user | Admin |
| GET | `/api/documents` | List documents | Any |
| POST | `/api/documents/upload` | Upload document | GC+ |
| POST | `/api/sync/batch` | Sync offline queue | Any |
| GET | `/api/audit-logs` | Audit log | Admin |

---

## Role Permissions Summary

| Permission | Admin | GC | Sub | Architect | Owner | Inspector |
|-----------|-------|----|-----|-----------|-------|-----------|
| project.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| project.create | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| project.update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| team.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| company.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| sheet.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| sheet.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| pin.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| pin.create | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| pin.update | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| pin.update.assigned | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| pin.assign | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| pin.delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| pin.close | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| comment.create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| photo.create | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| report.export | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| task.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

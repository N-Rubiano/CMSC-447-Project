# Architectural/Engineering "Punch List" Documentation
# Software Requirement Specifications (SRS)
**Version 2.0 | 9/25/2026**

**Nathan Rubiano, Muhammad Khan, Satya Thakur**

---

## 1. Introduction

### 1.1 Purpose
This document defines the software requirements for **PunchList Pro**, a tablet-first construction inspection and documentation platform. The system is designed to address a well-known gap in the construction industry: the near-total absence of effective, purpose-built software for managing architectural and engineering punch list walkthroughs. This SRS outlines the functional and non-functional requirements, user roles, system constraints, and design expectations to guide the development team and serve as a formal agreement between developers and stakeholders throughout the project lifecycle.

---

### 1.2 Problem Statement
Just prior to the conclusion of a construction project, the project team performs a **"punch list" walkthrough** — a systematic on-site inspection to confirm that all work was constructed in accordance with the construction documents. This process is critical for project closeout, owner acceptance, and contractual obligation resolution.

Currently, very few effective software tools exist to support construction teams during this process. Teams commonly rely on paper forms, generic spreadsheet tools, and email chains to track deficiencies, resulting in:

- **No spatial context** — deficiencies are described in text with no direct linkage to a location on a blueprint.
- **Fragmented information** — photos, notes, assignee data, and status updates exist in disconnected tools.
- **Poor accountability** — tasks cannot be reliably assigned, tracked, or verified by trade.
- **Inefficient reporting** — generating a distributable, PDF-ready punch report is a manual, time-consuming process.
- **No tablet-optimized workflow** — field walkthroughs happen on-site where a laptop is impractical; most existing tools are not designed for tablet use.

The reference standard for this problem domain is **Autodesk PlanGrid**, which demonstrates that a purpose-built, PDF-centric, tablet-first platform can dramatically improve the speed and accuracy of construction field documentation.

---

### 1.3 Intended Audience
This document is intended for the development team (Nathan Rubiano, Muhammad Khan, Satya Thakur), project stakeholders, and any future contributors or evaluators of the system. It assumes a basic familiarity with web-based software systems and construction field workflows.

---

### 1.4 Scope
PunchList Pro is a tablet-first web application that allows project teams to upload architectural and engineering PDFs, perform interactive punch list walkthroughs directly on those documents, and produce exportable, annotated reports that can be opened by any standard PDF reader.

Core capabilities derived directly from the stakeholder problem include:

- **PDF Upload & Viewer** — Upload architectural/engineering plan sheets and view them in an interactive, zoomable canvas.
- **Punch Item Creation** — Drop a geo-referenced pin on the blueprint at a specific location to create a punch item tied to that coordinate.
- **Task Information** — Each punch item captures photos, location, current status, assigned user, markup annotations, and freeform comments.
- **User Assignment** — Punch items can be assigned to other users (e.g., a trade subcontractor) for resolution.
- **Markup Tools** — Users can draw annotations (clouds, arrows, shapes) directly on the blueprint canvas.
- **Downloadable Reports** — Generate a PDF report embedding punch item data and annotations that can be opened in any standard PDF application.
- **Tablet-First UX** — The interface is designed for ergonomic use on a tablet device in the field.

The platform also supports role-based access control (RBAC), real-time collaboration, and offline-first operation for low-connectivity job site environments.

---

### 1.5 Definitions

| Term | Definition |
|---|---|
| **Punch List** | A construction industry document listing outstanding defects, incomplete work, or QA/QC items that must be resolved before project closeout |
| **Punch Item / Pin** | A digital task created at a specific location on a blueprint, representing a deficiency or inspection finding |
| **Blueprint / Sheet** | A construction plan (PDF, PNG, or JPG) uploaded and viewed within the system |
| **Markup** | A vector annotation (e.g., revision cloud, arrow, rectangle) drawn directly on a blueprint to highlight an area of concern |
| **Status Lifecycle** | The enforced sequence of states a punch item progresses through: Open -> In Progress -> Contractor Review -> Admin Review -> Closed |
| **RBAC** | Role-Based Access Control — a security model restricting system access based on a user's assigned role |
| **JWT** | JSON Web Token — a compact, stateless token format used for authentication |
| **GC** | General Contractor |
| **MEP** | Mechanical, Electrical, and Plumbing — a construction discipline category |
| **IndexedDB / Dexie.js** | Browser-side database used for offline data storage and sync queue management |
| **Socket.IO** | A real-time bidirectional event-based communication library used for WebSocket sync |
| **ASGI** | Asynchronous Server Gateway Interface — the Python server standard used by FastAPI |

---

### 1.6 References
- Autodesk PlanGrid — reference platform for construction field management
- FastAPI Official Documentation: https://fastapi.tiangolo.com
- React 18 Documentation: https://react.dev
- PDF.js Documentation: https://mozilla.github.io/pdf.js
- Dexie.js Documentation: https://dexie.org
- Socket.IO Documentation: https://socket.io
- SQLAlchemy 2.0 Documentation: https://docs.sqlalchemy.org
- ReportLab Documentation: https://www.reportlab.com/docs/reportlab-userguide.pdf

---

## 2. Overall Description

### 2.1 Product Perspective
PunchList Pro is a purpose-built response to the lack of effective punch list software in the construction industry. In the same way that Autodesk PlanGrid transformed field documentation by centering the experience on interactive plan sheets, PunchList Pro provides construction teams with a centralized, real-time workspace where all punch list activity is spatially anchored to the actual drawings — not separated in a disconnected system.

The platform is built as a full-stack web application: a React 18 + Vite frontend using a tablet-first, glassmorphic design system, and a Python FastAPI backend with PostgreSQL (primary) and SQLite (fallback) database support. It supports offline-first operation using Dexie.js with a background sync queue to reconcile data when connectivity is restored.

---

### 2.2 Product Functions (Summary)

The following high-level functions map directly to the stakeholder requirements:

| # | Function | Stakeholder Requirement |
|---|---|---|
| F-01 | Upload architectural/engineering PDFs and display them in an interactive viewer | "Upload architectural/engineering pdfs and allow users to add information to the pdf" |
| F-02 | Create punch items (pins) at specific blueprint coordinates | "Add tasks" with location context |
| F-03 | Attach photos to a punch item | "Information would include photos" |
| F-04 | Record and display the location of a punch item on the drawing | "Location" |
| F-05 | Track and update the status of each punch item through a defined lifecycle | "Status" |
| F-06 | Assign a punch item to another user | "Assignability to another user" |
| F-07 | Draw vector markup annotations on the blueprint | "Create markups" |
| F-08 | Add comments to a punch item | "Add comments" |
| F-09 | Download an annotated PDF report containing all punch data | "Download the information...that can be opened by any pdf software" |
| F-10 | Tablet-optimized interface for field use | "Ideally this would be done on a tablet device" |

---

### 2.3 User Classes

| User Class | Description |
|---|---|
| **Facility Administrator (`admin`)** | Full system-wide access. Can create/edit/delete projects, manage all users and companies, close or delete punch pins, and perform all administrative actions across all projects. Serves as the final sign-off authority in the punch item lifecycle. |
| **General Contractor (`general_contractor`)** | Project-level supervisory access. Can update projects, manage team membership, upload sheets, create and assign punch pins, review subcontractor submissions, and export PDF/CSV reports. Cannot directly close pins — must escalate to Admin. |
| **Trade Subcontractor (`sub_contractor`)** | Scoped to punch items assigned to their company or user account. Can view assigned blueprints, update work status (In Progress -> Contractor Review), post field comments, and upload proof-of-completion photos. Cannot create or reassign pins. |
| **Architect (`architect`)** | Design compliance and specification auditing role. Can view drawings, drop architectural punch pins, annotate markups, log specification comments, upload defect photos, and export reports. |
| **Owner / Client Representative (`owner`)** | Read-only executive access. Can view project progress, inspect sheets and punch items, review audit trails, add stakeholder comments, and generate formal executive reports. Cannot modify any data. |
| **Field Inspector (`field_inspector`)** | On-site QA/QC walkthrough role. Can drop new punch pins, update status to In Progress or Contractor Review, log field comments, and upload site photos. |

---

### 2.4 Operating Environment
The system operates as a web-based application accessible via modern browsers (Chrome, Edge, Safari, Firefox) on desktop, laptop, tablet, and mobile devices. The frontend runs on port 3000 (Vite dev server) and the backend API runs on port 4000 (FastAPI + Uvicorn ASGI). The system is designed primarily for **tablet use on active construction sites**, including outdoor environments with direct sunlight. It must function in both fully connected and intermittently offline (low-connectivity jobsite) conditions. PostgreSQL is the primary production database; SQLite is used as an automatic fallback for local development environments.

---

### 2.5 Design and Implementation Constraints
- The frontend must function offline using Dexie.js (IndexedDB) and queue sync operations for when connectivity is restored.
- Blueprint rendering must support 4K-level zoom clarity without pixelation, using PDF.js and the HTML5 Canvas API.
- The backend must run on Python 3.14 with the pg8000 pure-Python driver (zero C-dependencies) for portability.
- Authentication must use JWT tokens with bcrypt password hashing — no third-party auth providers.
- The UI must meet tablet ergonomic standards: touch targets no smaller than 38px, no reliance on hover-only interactions.
- All status transitions for punch items must be validated server-side via the `validate_status_transition` service — the frontend cannot bypass lifecycle rules.
- All generated PDF exports must be openable by any standard PDF reader (Adobe Acrobat, Preview, Chrome PDF viewer, etc.).

---

### 2.6 Assumptions and Dependencies
- Users accessing the system in the field will primarily be on iOS or Android tablets with modern browsers.
- A stable internet connection is available at the project office; field connectivity may be intermittent.
- All uploaded blueprint files are in PDF, PNG, or JPG format with reasonable file sizes.
- Each project has at least one assigned General Contractor and one Facility Administrator.
- Users will be pre-provisioned by an Administrator; self-registration is not supported.

**Key Dependencies:**

| Dependency | Purpose |
|---|---|
| React 18 + Vite | Frontend framework and build tooling |
| Python 3.14 + FastAPI | Backend REST API and ASGI server |
| PostgreSQL + pg8000 | Primary production relational database |
| SQLite + SQLAlchemy 2.0 | Local development database fallback |
| PDF.js (pdfjs-dist) | Blueprint PDF rendering on canvas |
| Dexie.js | IndexedDB wrapper for offline storage |
| python-socketio | Real-time WebSocket event server |
| Socket.IO (client) | Frontend WebSocket client |
| python-jose | JWT token generation and validation |
| passlib/bcrypt | Password hashing |
| ReportLab + PyPDF | PDF punch report and annotated plan set generation |
| Uvicorn | ASGI production server |

---

## 3. Business Rules

| Rule ID | Rule Definition | Type | Impacted Requirements |
|---|---|---|---|
| BR-01 | Only Facility Administrators may close or delete punch pins | Authorization | FR-05, FR-06 |
| BR-02 | Subcontractors may only view punch items assigned to their company or user account | Access Control | FR-04 |
| BR-03 | Punch item status may only transition in the defined sequence: Open -> In Progress -> Contractor Review -> Admin Review -> Closed | Workflow | FR-05 |
| BR-04 | General Contractors may reject a submission back to "In Progress" but cannot close an item | Workflow | FR-05 |
| BR-05 | Non-admin users must have an explicit membership record in `project_members` to access a project | Access Control | FR-02 |
| BR-06 | Subcontractors cannot create, reassign, or delete punch pins | Authorization | FR-04, FR-05 |
| BR-07 | Blueprint revisions must preserve all existing punch pins and vector markups from prior versions | Data Integrity | FR-08 |
| BR-08 | All blueprint coordinate data for pins must be stored as percentages (x_pct, y_pct) to remain resolution-independent | Data Integrity | FR-07 |
| BR-09 | JWT tokens must be validated on every protected API request; expired tokens must return 401 | Security | NFR-01 |
| BR-10 | Photo uploads for punch items must be stored server-side and referenced by URL; raw blobs must not be stored in the database | Data Storage | FR-09 |
| BR-11 | Owners may add comments but cannot modify any project data, sheets, or pins | Authorization | FR-11 |
| BR-12 | PDF and CSV exports are only available to Admin, GC, Architect, and Owner roles | Authorization | FR-12 |
| BR-13 | All significant data changes must be logged in the `audit_logs` table with author, timestamp, and field-level change detail | Audit | NFR-03 |
| BR-14 | The system must queue offline mutations locally and sync them to the server in order when connectivity is restored | Availability | NFR-04 |
| BR-15 | Critical-priority punch items must display a pulsating halo animation to distinguish them visually from other priorities | UI/UX | FR-07 |
| BR-16 | All exported PDF reports must embed punch item data, photos, and annotations in a format readable by any standard PDF application | Data Portability | FR-12 |

---

## 4. Functional Requirements

### 4.1 Use Cases

**UC-01: User Login**
- **Actor:** All roles
- **Description:** A user enters their email and password. The system validates credentials, returns a JWT token, and redirects the user to the project dashboard based on their role.
- **Precondition:** User account exists and is provisioned by an Admin.
- **Postcondition:** User is authenticated and session token is stored client-side.

---

**UC-02: Create a Project**
- **Actor:** Facility Administrator
- **Description:** Admin fills out a project creation form (name, code, address, target date) and submits. The system creates the project record and makes it accessible for team assignment.
- **Precondition:** User is authenticated as Admin.
- **Postcondition:** New project appears in the project list.

---

**UC-03: Upload an Architectural/Engineering PDF**
- **Actor:** Admin, General Contractor
- **Description:** User uploads an architectural or engineering PDF (or PNG/JPG), selects the associated building, floor, and discipline (Architectural, Structural, MEP, Civil), and submits. The system ingests the file and renders it in the interactive blueprint viewer. This is the foundational action enabling all subsequent annotation and punch item activity.
- **Precondition:** Project exists; user has `sheet.manage` permission.
- **Postcondition:** Sheet is stored and rendered in the blueprint viewer; all team members with project access can view it.

---

**UC-04: Drop a Punch Pin (Create a Task)**
- **Actor:** Admin, GC, Architect, Field Inspector
- **Description:** During a walkthrough, the user activates the pin tool and taps a coordinate on the blueprint canvas at the location of the deficiency. A punch item form opens to capture: description, trade/discipline, priority level, room/area, initial status, assigned user, attached photos, and comments. The pin is placed at the exact tapped location on the drawing.
- **Precondition:** A sheet is loaded in the viewer; user has `pin.create` permission.
- **Postcondition:** Pin is saved with x_pct/y_pct coordinates, displayed on canvas at the tapped location, and broadcast via WebSocket to all connected users on the project.

---

**UC-05: Attach a Photo to a Punch Item**
- **Actor:** Admin, GC, Architect, Field Inspector, Trade Subcontractor
- **Description:** User opens a punch item and taps the photo upload button. They can take a photo directly from the tablet camera or select from device storage. The photo is uploaded and displayed within the punch item detail view.
- **Precondition:** Punch item exists; user has access to the item.
- **Postcondition:** Photo is stored server-side and linked to the punch item; it appears in the item detail and is included in PDF exports.

---

**UC-06: Update Punch Item Status**
- **Actor:** Depends on role (see BR-03)
- **Description:** User opens a punch item drawer, selects a new valid status from the allowed lifecycle transitions, and submits. The server validates the transition and updates the record.
- **Precondition:** User has permission to update the pin; status transition is valid per BR-03.
- **Postcondition:** Pin status is updated, audit log entry created, and real-time update is broadcast to all connected users.

---

**UC-07: Assign a Punch Item to a User**
- **Actor:** Admin, GC
- **Description:** User opens a punch item and selects an assignee from the project's member list (typically a subcontractor or field inspector responsible for remediation). The assigned user receives visibility into the item and can update its status and add comments.
- **Precondition:** Punch item exists; assignee is a member of the project.
- **Postcondition:** Punch item is linked to the assigned user; the assignee can view and update the item within their role permissions.

---

**UC-08: Add a Comment to a Punch Item**
- **Actor:** All roles
- **Description:** User opens a punch item and types a comment in the comment thread. Comments are timestamped and attributed to the user's name and role. All project members with access to the item can view the comment thread.
- **Precondition:** Punch item exists; user has access to the item.
- **Postcondition:** Comment is saved and displayed in the item's thread in chronological order.

---

**UC-09: Annotate a Blueprint with Markups**
- **Actor:** Admin, GC, Architect
- **Description:** User selects a vector annotation tool (revision cloud, rectangle, arrow, pen, or dimension line) and draws directly on the blueprint canvas to highlight areas of concern. Markups support undo/redo. Markups are saved to the sheet and visible to all project members.
- **Precondition:** Sheet is loaded; user has markup permission.
- **Postcondition:** Vector markup is saved and rendered on the blueprint canvas for all users; markups are included in PDF exports.

---

**UC-10: Download an Annotated PDF Report**
- **Actor:** Admin, GC, Architect, Owner
- **Description:** User clicks the export button on the project dashboard or blueprint viewer. The system generates a PDF report that embeds all punch item data (descriptions, photos, status, assignee, location) and markup annotations onto the original plan sheets. The output is a standard PDF file downloadable to the user's device and openable by any PDF reader.
- **Precondition:** User has `report.export` permission; the project has at least one sheet and one punch item.
- **Postcondition:** A PDF file is downloaded to the user's device. The file opens correctly in Adobe Acrobat, Chrome PDF viewer, Apple Preview, and equivalent standard PDF applications.

---

**UC-11: Subcontractor Updates Assigned Work**
- **Actor:** Trade Subcontractor
- **Description:** Subcontractor opens their assigned punch item, updates status to "Submitted for Contractor Review," adds a comment describing the remediation performed, and optionally attaches a photo as proof of completion.
- **Precondition:** Pin is assigned to the subcontractor's company or user account.
- **Postcondition:** Status moves to "Contractor Review," GC is notified via the dashboard review queue.

---

**UC-12: Offline Data Capture**
- **Actor:** Any field user
- **Description:** When internet connectivity is lost during a field walkthrough, the user continues creating pins, comments, and photos. All mutations are queued locally in Dexie.js (IndexedDB). When connectivity is restored, the background sync queue uploads all queued actions to the server in order.
- **Precondition:** User was previously authenticated; blueprint data is cached locally.
- **Postcondition:** All offline changes are reconciled with the server database without data loss.

---

**UC-13: Manage Team Members**
- **Actor:** Admin, GC
- **Description:** User navigates to the Team view for a project, adds or removes members, and assigns roles (GC, Subcontractor, Architect, Owner, Inspector) with associated trade/company tags.
- **Precondition:** User has `team.manage` permission.
- **Postcondition:** `project_members` records are updated; affected users gain or lose project access.

---

### 4.2 Data Requirements
- Each punch item must store: project ID, sheet ID, x_pct, y_pct, status, priority, trade/discipline, room/area location, assigned user, root cause, description, photos (by URL), comments, created by, and timestamps.
- Blueprint sheets must store: file URL, building, floor, discipline, version history timeline, and any associated vector markups.
- All user passwords must be stored as bcrypt hashes — never plaintext.
- Photos must be stored as files in `backend/uploads/` and referenced by URL in the `photos` table.
- Audit log entries must capture: entity type, entity ID, field changed, old value, new value, actor user ID, and timestamp.

---

### 4.3 External Interface Requirements
- **REST API:** FastAPI backend exposes JSON endpoints under `/api/` for all CRUD operations. Interactive docs available at `/docs` (Swagger) and `/redoc`.
- **WebSocket:** Socket.IO server mounted at `/socket.io` broadcasts real-time events (pin drops, status changes, markup updates) to all connected project members.
- **File Storage:** Uploaded files (blueprints, photos) are served statically from `backend/uploads/` via the `/uploads/` route.
- **Frontend Proxy:** Vite dev server proxies `/api`, `/uploads`, and `/socket.io` requests to `localhost:4000` via `vite.config.js`.

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | All API endpoints (except `/auth/login`) must require a valid JWT bearer token. Tokens expire after a configurable duration. |
| NFR-02 | Performance | The blueprint canvas must re-render at device-native pixel resolution during zoom without visible pixelation or blur. Punch pins and markups must appear within 500ms of creation. |
| NFR-03 | Auditability | All create, update, and delete operations on pins, sheets, and users must produce a corresponding `audit_logs` record. |
| NFR-04 | Availability | The system must support full offline operation for data capture; mutations must sync automatically upon reconnection with no data loss. |
| NFR-05 | Usability | All interactive touch targets must be at least 38px. The UI must be fully usable on a 768px-wide tablet in portrait orientation. The interface must be optimized for one-handed or two-handed field tablet use. |
| NFR-06 | Portability | The backend must run without C-extension dependencies (pure-Python pg8000 driver) to support cross-platform deployment. |
| NFR-07 | Maintainability | The frontend design system must use CSS custom properties (design tokens) defined in `theme.css`; no hardcoded color or spacing values in component files. |
| NFR-08 | Reliability | Blueprint coordinate data must be stored as percentages (x_pct, y_pct) to remain valid across viewport sizes and resolution changes. |
| NFR-09 | Interoperability | All PDF exports must conform to the PDF specification and be openable by any standard PDF reader without plugins or proprietary software. |

---

## 6. Reporting Requirements

- The system must support one-click generation of:
  1. An **Annotated Plan Set PDF** — the original blueprint sheets with punch pins and vector markups embedded directly on the drawings.
  2. A **Punch Report PDF** — a formal document listing all punch items with their descriptions, status history, assigned user, location reference, and embedded photos.
  3. A **CSV Export** — a spreadsheet of all punch items and their metadata for use in external project management tools.
- Reports must be scoped to the active project and reflect the current state of all pins at the time of export.
- All generated files must be openable by any standard PDF or spreadsheet application without proprietary software.
- The dashboard must display real-time KPI cards: Resolution Rate (%), Active/In Progress count, Items in Review count, and Critical Blockers count.

---

## 7. Glossary of Terms

| Term | Definition |
|---|---|
| Punch List | A construction industry document listing outstanding defects, incomplete work, or QA/QC items that must be resolved before project closeout |
| Punch Walkthrough | The on-site inspection performed just prior to project completion where the project team walks the building and documents all outstanding issues |
| Punch Item / Pin | A digital marker dropped on a blueprint at a specific coordinate to represent a punch list task |
| Markup | A vector annotation (revision cloud, arrow, rectangle, dimension line) drawn on a blueprint to spatially highlight an area of concern |
| Blueprint Viewer | The interactive PDF.js + Canvas rendering engine used to display and annotate construction plans |
| Status Lifecycle | The enforced sequence of states a punch item progresses through: Open -> In Progress -> Contractor Review -> Admin Review -> Closed |
| RBAC | Role-Based Access Control — permissions are assigned by role, not by individual user |
| Offline Sync Queue | A Dexie.js-managed list of mutations captured while offline, replayed to the server on reconnection |
| Revision Cloud | A CAD-standard annotation shape (scalloped cloud outline) used to highlight areas of change on a blueprint |
| JWT | JSON Web Token — a signed token issued at login used to authenticate all subsequent API requests |
| Audit Log | A server-side record of every significant data change, capturing actor, timestamp, and field-level delta |
| PlanGrid | Autodesk PlanGrid — the reference enterprise platform for construction field documentation; the primary inspiration for this software |

---

## 8. Appendix

### Technology Stack Summary

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + Vite (ES6+, JSX) |
| Styling | Vanilla CSS3, CSS Custom Properties, Glassmorphic design |
| Blueprint Rendering | PDF.js + HTML5 Canvas API |
| Offline Storage | Dexie.js (IndexedDB wrapper) |
| Backend | Python 3.14, FastAPI, Uvicorn ASGI (Port 4000) |
| Database | PostgreSQL (pg8000) primary / SQLite fallback via SQLAlchemy 2.0 |
| Real-Time | Socket.IO (python-socketio AsyncServer) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Reporting | ReportLab + PyPDF |

### Project Directory Structure
```
PunchList/
+-- backend/
|   +-- app/
|   |   +-- main.py          <- FastAPI app + Socket.IO ASGI mount
|   |   +-- database.py      <- Dual PostgreSQL / SQLite engine
|   |   +-- auth.py          <- JWT & bcrypt authentication
|   |   +-- permissions.py   <- RBAC enforcement
|   |   +-- sio.py           <- Real-time WebSocket event hub
|   |   +-- routers/         <- REST API endpoints
|   |   +-- services/        <- PDF export & status transition logic
|   +-- uploads/             <- Blueprint PDFs & punch photos
+-- frontend/
    +-- src/
        +-- components/      <- All React UI components
        +-- services/        <- API client & canvas renderers
        +-- hooks/           <- Custom React hooks
        +-- data/            <- Static data & config
        +-- styles/          <- Design system (theme.css)
```

---

## 9. Approvals and Sign-off
By signing this document, the customer and developers agree to the details specified in this document, specifically: the scope of the project, the functional requirements, and the non-functional requirements.

| Name | Position | Date Reviewed | Signature | Date |
|---|---|---|---|---|
| Nathan Rubiano | Developer / Backend Lead | | | |
| Muhammad Khan | Developer / Full-Stack | | | |
| Satya Thakur | Developer / Frontend Lead | | | |
| | Project Stakeholder / Customer | | | |
| | Faculty Advisor / Reviewer | | | |

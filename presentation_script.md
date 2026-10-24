# 🏗️ PunchList Pro — 20-Minute Technical Presentation Script
### Team: Nathan Rubiano · Muhammad Khan · Satya Thakur
### Format: 3 Speakers · ~6:30 min per speaker · Slide Cues, Live Demos & Q&A Defense

---

## 📋 Presentation Overview & Timing Table

| Speaker | Role / Section | Key Topics & Demos | Target Time |
|---|---|---|---|
| **Speaker 1: Nathan Rubiano** | Project Vision, Architecture & Dashboard | Problem statement, high-level architecture, live login, interactive Dashboard, and **Real-Time Activity Logs** | `0:00 – 6:30` |
| **Speaker 2: Muhammad Khan** | Cloud Backend, Database & Security | Supabase Cloud PostgreSQL, 13 relational tables, dual auth (Google OAuth + JWT), 5-stage state machine, and offline Dexie.js | `6:30 – 13:00` |
| **Speaker 3: Satya Thakur** | Blueprint Engine, Live Demo & Engineering | 4K PDF.js + Dual Canvas engine, percentage coordinates, live pin drop/collaboration, real bug fixes, and future roadmap | `13:00 – 19:30` |
| **All Team** | Q&A Defense | Technical defense on sync conflicts, coordinate scaling, security, and scalability | `19:30 – 20:00+` |

---

## 💡 Pre-Presentation Setup Checklist

> [!IMPORTANT]
> Complete these steps 5 minutes before your presentation begins:
> 1. Start backend: `python -m uvicorn app.main:app --port 4000 --reload` (verify connected to Supabase).
> 2. Start frontend: `npm run dev` (running on `http://localhost:3000`).
> 3. Have **two browser windows** open side-by-side:
>    - Window A: Logged in as **General Contractor** (`gc@punchlistpro.com` or demo persona).
>    - Window B: Logged in as **Trade Subcontractor** (`sub@punchlistpro.com` or private incognito window) to showcase **real-time WebSocket collaboration**.
> 4. Pre-load a sample architectural PDF drawing set in the upload folder ready for drag-and-drop.
> 5. Screen resolution set to **1080p (1920×1080)** or standard projector resolution.

---

# 🎤 SPEAKER 1: Nathan Rubiano — Project Vision, Architecture & Dashboard
**Target Time: 0:00 – 6:30**

---

### [0:00 – 1:30] Introduction & The Industry Problem

**[SLIDE 1: Title Slide — PunchList Pro: Enterprise Field Management & Blueprint Inspection Platform]**
*(Presenters: Nathan Rubiano, Muhammad Khan, Satya Thakur)*

> *"Good [morning/afternoon] professors, evaluators, and colleagues. I'm Nathan Rubiano, and together with Muhammad Khan and Satya Thakur, we are presenting **PunchList Pro** — a full-stack, enterprise-grade construction management platform built specifically for field QA/QC inspections.*
>
> *To understand why we built this, let's step onto an active commercial construction site. Before a multi-million-dollar building can achieve Substantial Completion and obtain an occupancy certificate, inspectors and project managers must execute a 'punch list'. This is a meticulous catalog of every defect, unfinished item, and code violation across hundreds of thousands of square feet — from unsealed firewall penetrations and misaligned HVAC dampers to cracked drywall.*
>
> *Today, the industry still struggles with fragmented paper checklists, WhatsApp messages, and out-of-date Excel spreadsheets. The consequences are severe: duplicate work, disputed subcontractor billings, missed handover deadlines, and costly rework. Our mission was to build a modern, tablet-first web platform inspired by industry standards like Procore and PlanGrid — giving contractors, architects, and trade subcontractors a single real-time source of truth directly pinned to the architectural blueprints."*

---

### [1:30 – 3:30] System Topology & Architectural Foundation

**[SLIDE 2: Full-Stack Architecture Diagram]**

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      CLIENT TIER (React 18 + Vite)                     │
 │  • Dual HTML5 Canvas Blueprint Engine (PDF.js @ 4K)                    │
 │  • Dexie.js (IndexedDB) Offline Cache & Mutation Sync Queue            │
 │  • Responsive Tablet-First Touch UI (38px+ targets, Sunlight Contrast) │
 └─────────────────┬──────────────────────────────────┬───────────────────┘
                   │ HTTP REST (Port 3000 -> 4000)    │ WebSockets (Socket.IO)
                   ▼                                  ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    SERVER TIER (FastAPI on Python 3.14)                │
 │  • Asynchronous ASGI Event Loop (Uvicorn)                              │
 │  • Stateless JWT Bearer Token & Google OAuth SSO Verification          │
 │  • Server-Side Lifecycle State Machine & RBAC Authorization Gate       │
 │  • ReportLab Automated PDF & CSV Export Generation Engine              │
 └─────────────────┬──────────────────────────────────┬───────────────────┘
                   │ SSL Connection Pool (pg8000)     │ Multipart File Storage
                   ▼                                  ▼
 ┌──────────────────────────────────┐      ┌──────────────────────────────┐
 │   SUPABASE CLOUD POSTGRESQL DB   │      │ LOCAL & CLOUD FILE STORAGE   │
 │ • 13 Relational Normalized Tables│      │ • High-Res Blueprint PDFs    │
 │ • Real-Time Audit Log Streams    │      │ • Defect Inspection Photos   │
 └──────────────────────────────────┘      └──────────────────────────────┘
```

> *"To satisfy our Software Requirements Specifications, we engineered a clean, decoupled architecture:
>
> 1. **Client Tier**: A React 18 single-page application bundled with Vite. It features a custom dual-layer HTML5 Canvas blueprint viewer powered by Mozilla's PDF.js rendering at 4K resolution, combined with Dexie.js for client-side IndexedDB caching.
> 2. **Server Tier**: A high-performance Python 3.14 backend powered by FastAPI and Uvicorn. FastAPI's asynchronous ASGI architecture handles high-throughput REST transactions alongside real-time Socket.IO event multiplexing on the same port.
> 3. **Data & Storage Tier**: For persistence, we transitioned to **Supabase Cloud PostgreSQL** using connection pooling and SSL encryption, backing 13 relational tables and secure file storage for high-resolution plan sets and inspection photos.
> 4. **Offline Resilience**: Field job sites often lose Wi-Fi. Our app is offline-first: workers can continue dropping pins and capturing photos without internet; local changes are queued and automatically synchronized when connectivity returns."*

---

### [3:30 – 6:30] Live Demo: Role-Based Login & Dashboard with Real-Time Activity Logs

**[SWITCH TO BROWSER: Show Login Screen `http://localhost:3000`]**

> *"Let's jump into the live system.
>
> Here is our authentication gateway. We support dual authentication: traditional email and bcrypt-hashed password credentials, as well as one-click **Google OAuth Single Sign-On** handled via Supabase. For this demonstration, I'm logging in under the **General Contractor** profile.*
>
> *[Action: Click Login / Enter GC Dashboard]*
>
> *Notice our dashboard layout. It adheres strictly to our tablet ergonomics requirement — touch targets are at least 38 pixels, high-contrast typography ensures readability under outdoor sunlight, and the interface provides immediate executive visibility:*
>
> - *At the top, dynamic **KPI metric cards** calculate our Resolution Rate (currently 82%), open items, critical safety blockers, and trade breakdowns — computed dynamically without redundant queries.*
> - *Below that is our searchable, multi-discipline Punch Item grid with trade tags (MEP, Electrical, Structural) and priority indicators.*
>
> *Now, I want to draw your attention to a major capability we just engineered into the platform:*
>
> **[Action: Point cursor to the 'Live Project Activity Logs' container below the punch list]**
>
> *This is our **Real-Time Project Activity Logs** stream. On an active project with dozens of subcontractors, stakeholders need an incontrovertible, chronological audit trail of site events. 
> 
> Notice that this feed is **100% dynamic and live** — not hardcoded mock data. Every single event you see here is backed by our Supabase `audit_logs` table and streamed through WebSockets. Whenever an inspector logs a new defect, a subcontractor posts proof-of-work, a new blueprint sheet is uploaded, or a team member is provisioned, this container updates instantly without a page refresh.*
>
> *To demonstrate: if my teammate updates a punch pin or uploads a drawing on their device right now, an audit log with author, timestamp, and field-level diff appears right here in real time.*
>
> *With that foundation, I will hand over to **Muhammad Khan**, who will break down our cloud database schema, backend security, and the business logic powering our state machine."*

---

# 🎤 SPEAKER 2: Muhammad Khan — Cloud Backend, Database & Security
**Target Time: 6:30 – 13:00**

---

### [6:30 – 8:45] Supabase Cloud PostgreSQL Schema & Storage Architecture

**[SLIDE 3: Relational Database Schema & Supabase Architecture]**

```
                           ┌──────────────────────────┐
                           │        COMPANIES         │
                           └────────────┬─────────────┘
                                        │ 1:N
                           ┌────────────▼─────────────┐
                     ┌─────┤          USERS           ├─────┐
                     │     └────────────┬─────────────┘     │
                 1:N │              1:N │                   │ 1:N
                     ▼                  ▼                   ▼
           ┌──────────────────┐   ┌───────────┐   ┌───────────────────┐
           │ PROJECT_MEMBERS  │   │ COMMENTS  │   │    AUDIT_LOGS     │
           └─────────┬────────┘   └───────────┘   │ (Real-time Stream)│
                 N:1 │                            └───────────────────┘
                     ▼
           ┌──────────────────┐
           │     PROJECTS     ├─────────────────────────────┐
           └─────────┬────────┘                             │ 1:N
                 1:N │                                      ▼
                     ▼                            ┌───────────────────┐
           ┌──────────────────┐                   │     DOCUMENTS     │
           │      SHEETS      │                   │ (Specifications & │
           │ (Floor Plans)    │                   │  Submittals)      │
           └─────────┬────────┘                   └───────────────────┘
                 1:N │
                     ▼
           ┌──────────────────┐
           │  SHEET_VERSIONS  │
           └─────────┬────────┘
                 1:N │
                     ▼
           ┌──────────────────┐          1:N      ┌───────────────────┐
           │       PINS       ├───────────────────┤    PIN_PHOTOS     │
           │ (Punch Items)    │                   │ (Defect Evidence) │
           └──────────────────┘                   └───────────────────┘
```

> *"Thank you, Nathan. I'm Muhammad Khan, and I'll walk you through our backend engineering, data persistence, and security controls.
>
> Originally, our prototype ran on a local SQLite instance. To meet enterprise requirements for concurrent multi-user sync and remote site access, we migrated the entire persistent store to **Supabase Cloud PostgreSQL** hosted on AWS.
>
> Our relational database schema comprises **13 normalized tables**:
> - **`users` and `companies`**: Handles authentication, user profiles, enterprise company associations, and real-time online presence.
> - **`projects` and `project_members`**: Establishes project boundaries and enforces team membership so users only see authorized job sites.
> - **`sheets` and `sheet_versions`**: Represents architectural drawing sheets (A-101 Floor Plans, E-201 Electrical, M-301 Mechanical). By decoupling `sheets` from `sheet_versions`, we preserve all punch pins when an architect issues a Revision Addendum.
> - **`pins`**: The heart of the application. It captures the punch title, trade discipline, priority, room location, assigned subcontractor, and most critically — **percentage-based X and Y coordinates**.
> - **`pin_photos`, `comments`, and `documents`**: Stores supporting evidence, field discussions, and contract submittals, referencing files stored in our secure asset storage.
> - **`audit_logs`**: Backs the real-time activity stream Nathan just showed you, writing immutable change records with microsecond timestamps.*
>
> *We configured the database connection using SQLAlchemy 2.0 with the pure-Python `pg8000` driver and custom SSL context handshakes. This eliminates all C-compiler binary dependencies, guaranteeing our backend deploys cleanly across Windows, Linux, and containerized Docker environments."*

---

### [8:45 – 10:45] Security Architecture & 5-Stage Punch Lifecycle State Machine

**[SLIDE 4: RBAC Hierarchy & State Machine Transition Engine]**

```
  [Field Inspector / GC / Architect]
                 │
                 ▼  (Creates Pin)
          ┌─────────────┐
          │    OPEN     │
          └──────┬──────┘
                 │ Subcontractor starts work
                 ▼
          ┌─────────────┐
          │ IN PROGRESS │ ◄─────────────────────────┐
          └──────┬──────┘                           │
                 │ Subcontractor attaches photo &   │ GC Rejection
                 │ submits for approval             │ (Work unacceptable)
                 ▼                                  │
      ┌───────────────────────┐                     │
      │   CONTRACTOR REVIEW   ├─────────────────────┘
      └──────────┬────────────┘
                 │ General Contractor validates work
                 ▼
      ┌───────────────────────┐
      │     ADMIN REVIEW      │
      └──────────┬────────────┘
                 │ Facility Admin / Owner sign-off
                 ▼
          ┌─────────────┐
          │   CLOSED    │  (Immutable Archive)
          └─────────────┘
```

> *"Security and workflow governance in construction must be ironclad. You cannot allow a subcontractor to mark their own electrical violation as 'Closed' without contractor inspection.
>
> We implemented strict **Role-Based Access Control (RBAC)** across 6 personas: Facility Admin, General Contractor, Trade Subcontractor, Architect, Owner Representative, and Field Inspector.
>
> On every protected API route, FastAPI's dependency injection system executes `get_current_user`, verifying the cryptographic signature of the JWT bearer token.
>
> To govern defect resolution, we designed a server-side finite state machine codified in `permissions.py` with 5 discrete stages:
> 1. **Open**: Defect identified during field walkthrough.
> 2. **In Progress**: Assigned subcontractor accepts responsibility.
> 3. **Contractor Review**: Subcontractor submits proof of completion (photo + notes).
> 4. **Admin Review**: GC approves quality and escalates for owner closeout.
> 5. **Closed**: Final sign-off.
>
> If a subcontractor attempts to bypass review and send a `PATCH` request setting status to `Closed`, our backend blocks the request with an HTTP 403 Forbidden. The frontend UI reflects these constraints dynamically, disabling unauthorized buttons."*

---

### [10:45 – 13:00] Offline-First Sync Engine & REST API Design

**[SLIDE 5: Dexie.js Offline Sync Flow & Swagger Documentation]**

> *"One of our toughest non-functional requirements (NFR-04) was offline field capability. Concrete basements and steel-framed high-rises frequently have dead zones with zero cell service.
>
> To solve this, we integrated **Dexie.js**, a reactive wrapper around the browser's IndexedDB. 
> - When an inspector is online, reads and writes pass through our REST endpoints, and pins are mirrored into IndexedDB.
> - When connectivity is severed, the app triggers an offline banner. The inspector can continue walking the site, dropping pins, typing notes, and snapping photos. All mutations are committed to an IndexedDB **Sync Mutation Queue**.
> - When the tablet re-establishes a network connection, a background sync worker dequeues mutations in chronological sequence, posting them to our batch API routes and resolving temporary client-generated UUIDs with server-assigned IDs.*
>
> *Every backend endpoint is self-documenting. FastAPI automatically compiles OpenAPI 3.0 schemas, generating interactive Swagger docs at `/docs` where all routes, request bodies, and authentication headers can be tested live.*
>
> *Now, I'll pass the mic to **Satya Thakur**, who will unveil our custom Blueprint rendering engine, demonstrate live multi-user collaboration, and detail the technical hurdles we overcame."*

---

# 🎤 SPEAKER 3: Satya Thakur — Blueprint Engine, Live Demo & Engineering
**Target Time: 13:00 – 19:30**

---

### [13:00 – 15:15] Dual-Canvas Blueprint Engine & Percentage Coordinate System

**[SLIDE 6: Dual-Layer Canvas Architecture & Coordinate Geometry]**

```
┌─────────────────────────────────────────────────────────────────┐
│                      VIEWPORT CONTAINER                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  LAYER 1: Base Blueprint Canvas (HTML5 Canvas + PDF.js)   │  │
│  │  • Renders architectural vector lines at 4K (3840px+)     │  │
│  │  • CSS transform Matrix: pan (tx, ty), zoom (scale 0.5-8x)│  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  LAYER 2: Interactive Annotation Overlay Canvas           │  │
│  │  • Composite Stamp Pins (Trade initials: 'EL', 'PL', 'HV')│  │
│  │  • Pulsating Halo Shader for Critical Priority Items      │  │
│  │  • Vector Markups (Revision clouds, callout arrows)       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

> *"Thank you, Muhammad. I'm Satya Thakur, and I'll walk you through the centerpiece of PunchList Pro: our high-performance Blueprint Viewer, real-time collaboration engine, and key software engineering challenges.
>
> In construction software, rendering architectural plans is notoriously difficult. A standard building plan is a massive vector PDF with dense line work, door swings, and conduit dimensions. Naive image rendering results in blurry text when inspectors zoom in on small rooms.
>
> We engineered a **dual-layer HTML5 Canvas architecture**:
> - **Base Canvas Layer**: Uses Mozilla's `pdfjs-dist` to parse and rasterize multi-page PDF drawing sets directly to an offscreen buffer at **4K resolution (3840px+ width)**, preserving razor-sharp vector clarity up to 800% zoom.
> - **Interactive Overlay Canvas**: Positioned directly on top, this transparent canvas renders the punch pins and vector markups without requiring the heavy PDF base layer to re-render during mouse interactions.*
>
> **The Percentage Coordinate Breakthrough (SRS Rule BR-08):**
> *In construction field tools, screen sizes vary wildly — an inspector carries an 11-inch iPad, a superintendent has a 27-inch 4K desktop monitor, and an architect opens it on a laptop. If you store pin coordinates in fixed screen pixels (like `x: 450px`), the pin jumps to the wrong room when the window resizes.*
>
> *We solved this mathematically: every pin coordinate is normalized as a percentage of the blueprint's intrinsic dimensions:*
> 
> $$\text{x\_pct} = \frac{X_{\text{click}}}{W_{\text{sheet}}} \times 100, \quad \text{y\_pct} = \frac{Y_{\text{click}}}{H_{\text{sheet}}} \times 100$$
>
> *Our coordinate transformer function, `pctToCanvas()`, maps those percentages back to screen space using the active zoom scale and pan matrix. Whether you zoom in 500% or view on an iPhone, that electrical defect stays locked to the exact junction box."*

---

### [15:15 – 17:15] Live Interactive Demo: Live Pin Drop & WebSocket Sync

**[SWITCH TO BROWSER: Split screen Window A (GC) & Window B (Subcontractor)]**

> *"Let's prove this live with a dual-window demonstration.*
>
> **[Action: Click on 'Open Blueprint' for Engineering Hall Floor 2]**
>
> *Notice our UI refinement: we eliminated unnecessary sidebar clutter. Blueprint viewing is integrated directly into the project sheet navigator and dashboard cards.*
>
> *[Action: Demonstrate Zoom & Pan]*
> *As I zoom smoothly into Room 214 using the trackpad, watch the vector rendering quality — zero blur, instant 60 FPS transform.*
>
> *Now, watch Window A on the left (my screen as General Contractor) and Window B on the right (representing a Subcontractor Foreman out in the field).*
>
> **[Action: Select Pin Tool -> Click inside Room 214 -> Fill Modal]**
> - *Title: 'Missing Ground Wire on Panel B'*
> - *Trade: Electrical (`EL`)*
> - *Priority: Critical*
> - *Click 'Save Punch Item'*
>
> *[Action: Observe both screens]*
> *Look at Window B! The pin instantly appeared on the subcontractor's blueprint without refreshing the page!*
>
> *Notice the visual aesthetics: our custom `stampRenderer.js` drew a crisp blue circular badge with the trade initials `EL`, surrounded by a **pulsating red halo animation** because it's flagged as a critical safety blocker.*
>
> **[Action: Click on the pin in Window B -> Open Detail Drawer]**
> *The subcontractor clicks the pin to open the slide-out inspection drawer. They can upload a proof-of-fix photo, post a comment, and transition the status to 'Contractor Review'. When they hit submit, Window A receives the status update and the Dashboard Activity Log logs the event immediately."*

---

### [17:15 – 18:45] Technical Hurdles & Real Bugs Solved

**[SLIDE 7: Engineering Challenges & Solved Pitfalls]**

> *"Engineering an enterprise application inevitably presents real debugging challenges. I want to highlight five concrete bugs we diagnosed and resolved during our development cycle:
>
> 1. **Async Token Resolution Bug on Blueprint Upload**:
>    - *Symptom*: Uploading high-res blueprints returned `401 Unauthorized`.
>    - *Root Cause*: Our `getToken()` method was asynchronous, but the multipart upload function passed it without `await`, sending `Bearer [object Promise]` in the HTTP header.
>    - *Fix*: Awaited the token resolution across all upload handlers, restoring authenticated plan uploads.
> 2. **PostgreSQL Foreign Key Constraint Violations**:
>    - *Symptom*: Creating sheets failed with database constraint errors.
>    - *Root Cause*: Child `sheets` rows were uploaded before default parent `projects` records were seeded in Supabase.
>    - *Fix*: Added automatic project seeding and fallback validation on startup.
> 3. **CORS Security Specification Violation**:
>    - *Symptom*: Modern browsers blocked authenticated cross-origin cookies.
>    - *Root Cause*: FastAPI originally configured `allow_origins=['*']` with `allow_credentials=True`. The W3C CORS specification forbids wildcards with credentials.
>    - *Fix*: Replaced the wildcard with explicit whitelisted origin arrays for dev (`localhost:3000`) and production URLs.
> 4. **Canvas Memory Leak in Stamp Hit-Testing**:
>    - *Symptom*: High memory consumption when clicking on crowded blueprints.
>    - *Root Cause*: The hit-test routine was instantiating an offscreen DOM `<canvas>` element on every single mouse click to calculate color bounding boxes.
>    - *Fix*: Replaced DOM allocation with pure mathematical Pythagorean distance checks against normalized stamp radius.
> 5. **PDF Blob URL Premature Garbage Collection**:
>    - *Symptom*: Blueprints intermittently disappeared after closing the upload modal.
>    - *Root Cause*: A `useEffect` cleanup hook was calling `URL.revokeObjectURL()` immediately when the modal closed before the canvas finished rasterizing.
>    - *Fix*: Decoupled object URL lifecycle management to persist until project unmount."*

---

### [18:45 – 19:30] Automated Reporting, Future Roadmap & Conclusion

**[SLIDE 8: Automated Reporting & Future Roadmap]**

> *"To close out the inspection cycle, PunchList Pro features an **Automated Reporting Engine** using ReportLab. With a single click on the dashboard, project managers can export:
> 1. An **Annotated Plan Set PDF** with punch stamps physically baked onto the architectural blueprint pages.
> 2. A formal **Punch Report PDF** complete with contractor sign-off blocks, timestamps, and embedded before/after photos.
> 3. A comprehensive **CSV Data Export** for ERP accounting and auditing.
>
> **Future Roadmap**:
> If we continue development into Phase 2, our next milestones are:
> - **AI Defect Classification**: Using computer vision models to inspect uploaded photos and automatically tag defect severity and trade categories.
> - **React Native Mobile Client**: Packaging our Dexie offline engine into a native tablet app with hardware camera integration.
> - **BIM 360 / Procore Webhook Sync**: Bi-directional data connectors to synchronize punch items with enterprise construction ERPs.
>
> In summary, our team delivered a robust, secure, real-time construction QA/QC platform that solves a tangible multi-billion-dollar industry bottleneck. Thank you for your time, and Nathan, Muhammad, and I welcome your questions!"*

---

# 🛡️ Anticipated Q&A Technical Defense Cheat Sheet
### Prepare for these tough evaluators' questions:

#### Q1: "How do you handle conflict resolution if two inspectors edit the same punch item while both are offline?"
> **Answer (Nathan / Muhammad):**
> *"We implement a **Last-Write-Wins (LWW)** strategy backed by server-side vector clocks and optimistic locking in PostgreSQL. Every `pins` record contains an `updated_at` timestamp. When the sync queue pushes offline mutations, the server compares the timestamp. Furthermore, our state machine prevents invalid status regression — for example, if Inspector A offline marks an item 'Contractor Review' and Inspector B offline marks it 'Closed', the server rejects the unauthorized transition when reconciling."*

#### Q2: "Why did you use percentage-based coordinates instead of standard pixel or millimeter coordinates?"
> **Answer (Satya):**
> *"Architectural drawings are rendered dynamically at different device pixel ratios (DPR) and zoom scales depending on whether an inspector is using an iPad, a 1080p laptop, or a 4K monitor. Millimeter coordinates require knowing the physical DPI of the source CAD file, which is often stripped during PDF export. By storing $X$ and $Y$ as float percentages relative to the sheet width and height, the coordinate is 100% resolution-independent and mathematically invariant to zoom transforms."*

#### Q3: "What prevents a malicious user from forging API requests and deleting other companies' punch pins?"
> **Answer (Muhammad):**
> *"We enforce multi-tenant authorization at the API route layer in FastAPI, not just in the UI. When an API call arrives, `get_current_user` extracts the caller's user ID and role from the cryptographically signed JWT. We then query the `project_members` table to verify active membership. In `permissions.py`, `BR-01` strictly mandates that only users with the `admin` role can execute `DELETE` queries on pins. Any unauthorized attempt returns an HTTP 403 Forbidden."*

#### Q4: "How does the Real-Time Activity Log scale if you have hundreds of workers on a mega-project?"
> **Answer (Satya / Nathan):**
> *"We designed the activity log using **Socket.IO project rooms**. When a client opens a project, their WebSocket joins a room keyed by `project_id`. Audit events are broadcast only to the connected sockets in that specific room, not the entire server. Additionally, the backend logs are indexed on `(project_id, created_at DESC)` in PostgreSQL, enabling sub-millisecond pagination queries for historical logs."*

#### Q5: "Why choose FastAPI over Node.js/Express or Django?"
> **Answer (Muhammad):**
> *"FastAPI offers three distinct advantages: first, it is built on Starlette and Pydantic, providing asynchronous ASGI performance comparable to Node.js and Go; second, Python allows seamless future integration with data science and computer vision libraries like OpenCV or PyTorch for AI photo defect detection; and third, it auto-generates standards-compliant OpenAPI Swagger documentation directly from our type hints."*

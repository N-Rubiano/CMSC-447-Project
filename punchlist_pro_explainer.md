# PunchList Pro — Step-by-Step Project Explainer & Interview Prep

---

## 🏗️ What Is This Project?

**PunchList Pro** is a full-stack, enterprise-grade **construction field management platform** — think Procore or PlanGrid. It lets General Contractors, Subcontractors, Architects, Owners, and Field Inspectors collaborate on construction sites using digital blueprints, punch items (defects), photos, and real-time sync.

---

## Step 1 — The Big Picture (System Architecture)

The project is split into two halves that talk to each other:

```
Browser (React App) ←──── HTTP REST / WebSocket ────→ Python FastAPI Server
        ↑                                                        ↓
    Vite Dev Server                                    PostgreSQL / SQLite DB
    (Port 3000)                                              (Port 4000)
```

- **Frontend**: React 18 + Vite (modern JavaScript bundler)
- **Backend**: Python FastAPI + Uvicorn (async web server)
- **Database**: PostgreSQL (production) or SQLite (local dev fallback)
- **Real-Time**: Socket.IO for live pin-drop and sync across devices
- **Offline**: Dexie.js (IndexedDB) lets field workers work without internet

---

## Step 2 — Starting the App (`package.json` at root)

The root `package.json` uses **`concurrently`** to run both servers at once:

```bash
npm run dev          # starts BOTH backend + frontend
npm run dev:backend  # FastAPI on http://localhost:4000
npm run dev:frontend # Vite on http://localhost:3000
```

Vite proxies `/api`, `/uploads`, and `/socket.io` requests to the backend — so the frontend always calls relative paths like `/api/projects` and Vite silently forwards them.

---

## Step 3 — Backend Entry Point (`backend/app/main.py`)

This is the **FastAPI application factory**. Here's what it does step by step:

1. **Creates the FastAPI app** with Swagger docs at `/docs` and `/redoc`
2. **Adds CORS middleware** — allows the React dev server (port 3000) to call the API
3. **Mounts static file routes** — `/uploads/*` serves blueprint PDFs and punch photos
4. **Registers all API routers** — each file in `routers/` handles one domain:
   - `auth.py` → login, logout, JWT tokens
   - `projects.py` → create/update/delete projects
   - `sheets.py` → blueprint sheet upload and version control
   - `pins.py` → punch items (the core entity)
   - `markups.py` → vector annotations drawn on blueprints
   - `tasks.py` → subcontractor task workflow
   - `reports.py` → PDF/CSV export
   - `sync.py` → offline data sync
   - `companies.py`, `users.py` → team management
5. **Runs `init_db()` on startup** — creates all database tables from SQLAlchemy models
6. **Wraps everything in a Socket.IO ASGI app** — WebSocket and REST share the same port

---

## Step 4 — Database (`backend/app/database.py`)

Uses **SQLAlchemy 2.0** with a **dual-engine architecture**:

| Environment | Database | Driver |
|---|---|---|
| Production | PostgreSQL | pg8000 (pure Python) |
| Local Dev | SQLite | Built-in Python |

Key tables:
- `users` — accounts with roles and bcrypt-hashed passwords
- `projects` — construction projects with GC assignment
- `sheets` — blueprint files (PDFs/images) linked to a project + building
- `sheet_versions` — revision history (Rev 1, Rev 2...) without losing pins
- `pins` — **the core entity**: punch items with X/Y coordinates on the blueprint
- `photos`, `comments`, `markups` — media and annotation attached to pins
- `project_members` — many-to-many: users ↔ projects with role scoping
- `audit_logs` — full change history for compliance

---

## Step 5 — Authentication (`backend/app/auth.py`)

Security follows industry-standard patterns:

1. User sends `email + password` → `/api/auth/login`
2. Backend looks up user, verifies password with **bcrypt** (`passlib`)
3. If valid, returns a signed **JWT token** (JSON Web Token) using `python-jose`
4. Frontend stores the token and sends it as `Authorization: Bearer <token>` on every request
5. FastAPI dependency `get_current_user` decodes the token and injects the user object

---

## Step 6 — Role-Based Access Control (`backend/app/permissions.py`)

Six roles with tiered permissions:

| Role | Can Do |
|---|---|
| `admin` | Everything — only role that can **close** or **delete** pins |
| `general_contractor` | Manage projects, review subcontractor work, approve to admin |
| `sub_contractor` | Only see/update pins **assigned to them** |
| `architect` | Create pins, annotate markups, export reports |
| `owner` | Read-only access + stakeholder comments |
| `field_inspector` | Create pins, upload photos, update status |

Punch items follow a **strict state machine**:
```
Open → In Progress → Contractor Review → Admin Review → Closed
                  ↑ (GC can reject back)
```
Subcontractors can only move items forward; only Admin can close.

---

## Step 7 — Real-Time Sync (`backend/app/sio.py`)

Uses **python-socketio** (AsyncServer) mounted alongside FastAPI:

- When a user **drops or drags a punch pin**, the backend saves coordinates to the DB and broadcasts a `pin_updated` event to all connected clients in that project room
- All users on the same project see the pin move **live without refreshing**
- This is the same pattern used in collaborative tools like Figma or Google Docs

---

## Step 8 — Frontend Entry (`frontend/src/main.jsx` → `App.jsx`)

React 18 with `createRoot`. `App.jsx` (~1800 lines) is the main orchestrator:

- Manages **global auth state** (current user, JWT token)
- Handles **routing** between views (dashboard, blueprint viewer, reports, etc.)
- Holds **project/sheet selection state** shared across all components via props
- Connects to **Socket.IO** for real-time updates
- Uses **Dexie.js** (IndexedDB) for offline caching of pins and comments

---

## Step 9 — Key Frontend Components

| Component | Purpose |
|---|---|
| [`LoginPage.jsx`](file:///c:/Users/tsaty/Downloads/PunchList/frontend/src/components/LoginPage.jsx) | Auth form, JWT token storage |
| [`Navbar.jsx`](file:///c:/Users/tsaty/Downloads/PunchList/frontend/src/components/Navbar.jsx) | Building/Floor/Sheet cascading selector, project switcher |
| [`SheetCanvas.jsx`](file:///c:/Users/tsaty/Downloads/PunchList/frontend/src/components/SheetCanvas.jsx) | **The main blueprint viewer** — PDF.js + HTML5 Canvas, zoom/pan, pin rendering |
| [`DashboardView.jsx`](file:///c:/Users/tsaty/Downloads/PunchList/frontend/src/components/DashboardView.jsx) | KPI cards, punch table, review queues |
| [`PinDetailModal.jsx`](file:///c:/Users/tsaty/Downloads/PunchList/frontend/src/components/PinDetailModal.jsx) | Full punch item form: status, photos, comments, RBAC guards |
| [`CircleStampModal.jsx`](file:///c:/Users/tsaty/Downloads/PunchList/frontend/src/components/CircleStampModal.jsx) | Create new punch pin with trade initials stamp |
| [`FieldReportView.jsx`](file:///c:/Users/tsaty/Downloads/PunchList/frontend/src/components/FieldReportView.jsx) | Chronological activity feed |
| [`TeamView.jsx`](file:///c:/Users/tsaty/Downloads/PunchList/frontend/src/components/TeamView.jsx) | Manage GCs and subcontractors |

---

## Step 10 — Export & Reporting (`backend/app/routers/reports.py`)

Uses **ReportLab** (Python library) to generate:
- **Annotated Plan Set PDF** — blueprint images with pin overlays
- **Punch Report PDF** — formal document listing all punch items, photos, status
- **CSV Export** — spreadsheet of all punch items for PM tools

---

## Step 11 — Design System (`frontend/src/styles/theme.css`)

Built from scratch (no Bootstrap/Tailwind):
- **Tablet-first** — generous 38px+ touch targets for jobsite gloves
- **Architectural palette** — warm parchment tones, amber brand color, safety crimson
- **Glassmorphism HUDs** — floating toolbars with `backdrop-filter: blur(20px)`
- **JetBrains Mono** for technical data (coordinates, version tags)
- **Pulsating ring animation** (`@keyframes pulseRing`) for critical priority pins

---

---

# 🎯 Interview Questions — New Grad Software Engineer

These questions are drawn directly from what this project demonstrates. Use your experience building this as evidence.

---

## 🔷 System Design & Architecture

1. **"Walk me through the architecture of a full-stack app you've built."**
   > Talk about: React frontend ↔ FastAPI backend ↔ PostgreSQL. Mention the proxy setup in Vite, REST vs. WebSocket usage, and why you chose each layer.

2. **"Why would you use a dual-database strategy (PostgreSQL + SQLite)?"**
   > PostgreSQL for production (concurrent users, ACID compliance, scale). SQLite for local dev (no server setup, fast iteration). The codebase auto-detects based on env vars.

3. **"How does your offline-first feature work?"**
   > Dexie.js wraps IndexedDB — actions are queued locally when offline. The `sync.py` router processes the queue when connectivity returns. This is common in field apps (like Google Maps offline mode).

4. **"How did you handle real-time collaboration?"**
   > Socket.IO over WebSocket. When a pin is moved, the backend emits an event to a project "room". All connected clients receive it and update their canvas state without polling.

---

## 🔷 Backend / API Design

5. **"What is REST and how did you structure your API?"**
   > REST uses HTTP verbs (GET, POST, PUT, DELETE) mapped to resources. `/api/projects` for project CRUD, `/api/pins/{id}` for punch item operations, etc.

6. **"How does JWT authentication work?"**
   > User logs in → server validates password with bcrypt → returns a signed token. Client sends `Authorization: Bearer <token>` on every request. Server decodes and trusts it without a DB lookup on every request (stateless).

7. **"What is CORS and why did you need it?"**
   > Cross-Origin Resource Sharing — browser security policy blocking requests from one origin (port 3000) to another (port 4000). The FastAPI `CORSMiddleware` whitelists the dev server origin.

8. **"How would you prevent a subcontractor from seeing another company's pins?"**
   > Two layers: (1) `can_user_access_project` checks project membership. (2) `can_user_access_pin` checks if the pin's `assigned_subcontractor_id` matches the user's company. This is enforced in every pin API endpoint.

9. **"What is a state machine? Give an example from your project."**
   > A defined set of states + valid transitions. In this project: `Open → In Progress → Contractor Review → Admin Review → Closed`. The backend's `validate_status_transition` function rejects any invalid jump (e.g., sub trying to close a pin directly).

---

## 🔷 Database & SQL

10. **"What is SQLAlchemy and why use an ORM?"**
    > SQLAlchemy is a Python ORM — maps Python classes to DB tables. You write Python instead of raw SQL, get type safety, and can swap PostgreSQL for SQLite with one env variable change.

11. **"How do you handle database migrations / schema changes?"**
    > The `init_db()` runs on startup and uses SQLAlchemy's `create_all` to create missing tables. For production, tools like Alembic provide versioned migrations.

12. **"How is revision history tracked without losing existing data?"**
    > `sheets` table holds the current active version. `sheet_versions` holds all historical revisions with timestamps. Pins reference the sheet (not the version), so they remain pinned even after a revision upload.

---

## 🔷 Frontend / React

13. **"What is React and why use a component-based architecture?"**
    > React builds UIs from reusable components. State flows from parent → child via props. This makes it easy to reason about, test, and reuse UI (e.g., `PinDetailModal` is used everywhere a pin is clicked).

14. **"How does the blueprint PDF viewer work?"**
    > PDF.js parses the PDF and renders pages to an HTML5 `<canvas>`. A second canvas layer overlays the punch pins as SVG/DOM elements at stored X/Y percentage coordinates. On zoom, the canvas is re-rendered at the new pixel density (preventing blur).

15. **"What's the difference between `useState` and `useEffect` in React?"**
    > `useState` holds reactive data (re-renders the component when changed). `useEffect` runs side effects (API calls, subscriptions) after renders. Example: `useEffect` fetches pins from the API when the active sheet changes; `useState` stores the result.

16. **"How did you make the app work offline?"**
    > Dexie.js persists data to IndexedDB (browser storage). When offline, reads come from the local cache. Writes queue up. When the network returns, the sync module pushes queued operations to the backend.

---

## 🔷 Security

17. **"How do you store passwords securely?"**
    > Never store plaintext passwords. Use bcrypt (via `passlib`) which salts and hashes. To verify, bcrypt the incoming password and compare to the stored hash.

18. **"What is RBAC and how did you implement it?"**
    > Role-Based Access Control. Each user has a role. Each API endpoint checks the role before executing. Example: `pin.close` is gated behind `role == "admin"`. This is enforced server-side, not just on the frontend.

---

## 🔷 Behavioral / Project-Based

19. **"Tell me about a technical challenge you faced building this."**
    > Great options: (a) Making Canvas re-rendering crisp at 4K zoom without pixelation — required dynamic `devicePixelRatio` scaling. (b) Enforcing RBAC across 6 roles without spaghetti code — led to a clean `permissions.py` module. (c) Offline sync conflicts.

20. **"How would you scale this app to 10,000 concurrent users?"**
    > Frontend: CDN + code splitting. Backend: horizontal scaling (multiple Uvicorn workers), Redis for Socket.IO pub/sub across instances, PostgreSQL connection pooling (PgBouncer), and a queue (Celery + Redis) for PDF report generation.

21. **"What would you add to this project next?"**
    > Push notifications (Firebase FCM), mobile native app (React Native), AI-powered defect categorization from photos, Gantt chart timeline view, or Procore/BIM 360 integration via their APIs.

---

> **Pro Tip**: In every answer, anchor to a specific file or feature in this project. Interviewers respond well to *"In my project, I handled this by..."* instead of generic textbook answers.

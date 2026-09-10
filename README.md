# 🏗️ PunchList Pro

> **Enterprise tablet-first construction field management & inspection platform**  
> Built in the spirit of PlanGrid and Procore — for the jobsite, not the boardroom.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [User Roles & RBAC](#-user-roles--rbac)
- [Punch Item Lifecycle](#-punch-item-lifecycle)
- [Design System](#-design-system)
- [Project Structure](#-project-structure)
- [Running Locally](#-running-locally)

---

## 🔍 Overview

**PunchList Pro** enables General Contractors, Subcontractors, Architects, Owners, and Field Inspectors to:

- 📌 Perform on-site walkthroughs and drop **traceable punch pins**
- 🏷️ Stamp **subcontractor-attributed vector callouts**
- 📄 Track **document revisions** and **resolve QA/QC defects** in real time
- 📶 Operate across **connected and offline environments**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | JavaScript (ES6+), React 18, Vite |
| **Styling & UI** | Vanilla CSS3, CSS Custom Properties, Glassmorphic HUDs, Responsive Design |
| **Blueprint Rendering** | PDF.js (`pdfjs-dist`), HTML5 Canvas API — crystal-clear 4K zoom |
| **Offline Storage** | Dexie.js (IndexedDB wrapper) with background sync queue |
| **Backend Server** | Python 3.14, FastAPI, Uvicorn ASGI on **Port 4000** · Swagger at [`/docs`](http://localhost:4000/docs) · ReDoc at [`/redoc`](http://localhost:4000/redoc) |
| **Database** | Dual-engine via SQLAlchemy 2.0: **PostgreSQL** (`pg8000` — pure Python, zero C-deps) + **SQLite** fallback |
| **Real-Time Sync** | Socket.IO (`python-socketio` AsyncServer on `/socket.io`) |
| **Reporting & Export** | ReportLab & PyPDF — annotated plan sets, punch reports with photos, CSV exports |
| **Auth & Security** | JWT (`python-jose`), bcrypt (`passlib`), RBAC enforcement |

---

## 👥 User Roles & RBAC

PunchList Pro implements an enterprise construction governance model with **6 canonical roles**, multi-tier scoping (system, project, company/trade), and an enforced lifecycle state machine.

### Role Definitions

| Role | Label | Scope | Key Capabilities |
|---|---|---|---|
| 🔑 `admin` | Facility Administrator | System-wide, unrestricted | Full project CRUD, drawing ingestion, team/company management, sole authority to close & delete pins |
| 🦺 `general_contractor` | General Contractor | Assigned GC projects | Project updates, team allocation, sheet management, inspection sign-off, PDF/CSV export |
| 🔧 `sub_contractor` | Trade Subcontractor | Own assigned items only | View assigned sheets/pins, update work status, post comments, upload proof photos |
| 📐 `architect` | Architect | Design compliance auditing | View drawings, drop architectural pins, annotate markups, export reports |
| 💼 `owner` | Owner / Client Rep | Read-only across projects | View progress, inspect pins & audit trails, generate executive reports |
| 🔍 `field_inspector` | Field Inspector | On-site QA/QC | Field walkthrough, drop new pins, update status, log comments, upload field photos |

---

### 🔐 Capability Matrix

| Capability | Admin | GC | Sub | Arch | Owner | Inspector |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `project.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `project.create` | ✅ | — | — | — | — | — |
| `project.update` | ✅ | ✅ | — | — | — | — |
| `team.manage` | ✅ | ✅ | — | — | — | — |
| `company.manage` | ✅ | ✅ | — | — | — | — |
| `sheet.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sheet.manage` | ✅ | ✅ | — | — | — | — |
| `pin.view` | ✅ | ✅ | ¹ | ✅ | ✅ | ✅ |
| `pin.create` | ✅ | ✅ | — | ✅ | — | ✅ |
| `pin.update` | ✅ | ✅ | — | ✅ | — | ✅ |
| `pin.update.assigned` | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| `pin.assign` | ✅ | ✅ | — | — | — | — |
| `pin.close` | ✅ | — | — | — | — | — |
| `pin.delete` | ✅ | — | — | — | — | — |
| `comment.create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `photo.create` | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| `report.export` | ✅ | ✅ | — | ✅ | ✅ | — |
| `task.manage` | ✅ | ✅ | — | — | — | — |

> ¹ Subcontractor pin visibility is **scoped strictly** to items assigned to their trade company.

---

## 🔄 Punch Item Lifecycle

The backend rigorously enforces status transitions via `validate_status_transition`:

```
┌─────────────────────┐
│   Open / Assigned   │
└──────────┬──────────┘
           │  Subcontractor / GC / Inspector
           ▼
┌─────────────────────┐
│     In Progress     │
└──────────┬──────────┘
           │  Sub / Inspector submits remediation proof
           ▼
┌──────────────────────────────────────┐
│  Submitted for Contractor Review     │
│             (In Review)              │
└──────┬───────────────────────────────┘
       │                        │
       │ GC Rejects             │ GC Approves
       ▼                        ▼
┌─────────────┐     ┌──────────────────────────────┐
│ In Progress │     │  Submitted for Admin Review  │
└─────────────┘     └──────────────┬───────────────┘
                                   │  Facility Admin Final Sign-Off
                                   ▼
                        ┌──────────────────────┐
                        │   Closed / Resolved  │
                        └──────────────────────┘
```

| Role | Boundary |
|---|---|
| **Subcontractor** | Open → In Progress → Contractor Review |
| **General Contractor** | Evaluate remediation; reject back to In Progress or approve to Admin Review. Cannot close directly. |
| **Facility Admin** | Sole authority to transition items to **Closed** or permanently delete pins. |

---

## 🎨 Design System

The design system ([`frontend/src/styles/theme.css`](frontend/src/styles/theme.css)) is built for **industrial tablet durability**, **outdoor sunlight readability**, and **CAD/BIM precision**.

### Philosophy

- **Tablet-First Field Usability** — 38px+ touch targets (`-webkit-tap-highlight-color: transparent`), zero-latency manipulation
- **Glare-Resistant Palette** — High-contrast parchment tones reducing eye fatigue under direct jobsite sunlight
- **Non-Destructive Layering** — Glassmorphic floating HUD controls that maximize active blueprint canvas area

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--bg-app` | `#F8F7F4` | Warm industrial off-white app background |
| `--bg-canvas` | `#F0ECE1` | Architectural drafting surface |
| `--bg-surface-1/2/3` | `#FFF` → `#ECE7DC` | Card surface hierarchy |
| `--bg-glass-heavy` | `rgba(255,255,255,0.97)` + `blur(20px)` | Floating HUD panels |
| `--primary` | `#D97706` | Construction Amber — primary brand color |
| `--brand-yellow-dark` | `#EAB308` | Accent amber |
| `--brand-brown` | `#5C3A21` | Timber Brown |
| `--brand-black` | `#18181B` | Deep Charcoal Black |
| `--brand-red` | `#DC2626` | Safety Crimson / Open status |

### Semantic Status Colors

| Status | Color | Background | Border |
|---|---|---|---|
| 🔴 Open / Action Needed | `#DC2626` | `#FEF2F2` | `#FCA5A5` |
| 🟡 In Review (Pending GC) | `#D97706` | `#FFFBEB` | `#FCD34D` |
| 🟢 Closed / Sign-Off | `#15803D` | `#F0FDF4` | `#86EFAC` |
| ⚫ Rejected / Inactive | `#78716C` | `#F5F5F4` | `#D6D3D1` |

### Priority Hierarchy

| Priority | Color | Effect |
|---|---|---|
| 🔴 Critical | `#DC2626` Crimson | Animated SVG `@keyframes pulseRing` halo |
| 🟠 High | `#D97706` Amber | Solid amber accent |
| 🟡 Medium | `#CA8A04` Ochre | Ochre yellow accent |
| ⚪ Low | `#78716C` Slate | Neutral indicator |

### Typography

| Role | Font | Usage |
|---|---|---|
| Primary Interface | `Inter`, system-ui | Clean geometric sans-serif for retina/mobile |
| CAD Technical Data | `JetBrains Mono` | Live plan coordinates, version tags, trade initials, item counters |

### HUD Components

| Component | Class | Description |
|---|---|---|
| Floating Vector Toolbar | `.floating-toolbar` | Glassmorphism `blur(20px)`, 97% opacity, amber active states. Top-left tool switcher, bottom-right zoom/layer controls. |
| Stamped Circle Pins | `.pin-circle-stamp` | 2-letter trade initials (e.g. `MP`, `AC`). Hover scale 1.15×, drag elevation 1.25× with 24px drop shadow. |
| Teardrop CAD Pins | `.pin-marker` | 45° rotated counter-head, numerical ID, trade label badge, pulsating halo on critical. |
| Coordinate HUD | `.coordinate-hud` | Bottom-center floating pill with real-time cursor coordinates in plan percentages. |
| Slide-Over Drawer | `.drawer-panel` | 480px side drawer, spring-eased transitions, inspection forms, photo attachments, comment feeds. |

### Responsive Breakpoints

| Viewport | Mode | Behavior |
|---|---|---|
| `> 1024px` | Desktop / Laptop | Full dual-pane, collapsible nav rail, floating CAD HUDs |
| `768px – 1024px` | **Tablet** *(primary field mode)* | Touch-optimized toolbars, slide-over drawers, pinch-to-zoom canvas |
| `< 820px` | Compact Mobile | Auto-suppressed coordinate chips; toolbars compress to compact floating clusters |

---

## 📁 Project Structure

```
PunchList/
├── backend/                      ← Python / FastAPI backend (Port 4000)
│   ├── .env                      ← Database credentials & settings
│   ├── requirements.txt          ← Python dependencies
│   ├── venv/                     ← Python 3.14 virtual environment
│   ├── uploads/                  ← Blueprint PDFs, punch photos, attachments
│   └── app/
│       ├── main.py               ← FastAPI app + Socket.IO ASGI mount
│       ├── database.py           ← Dual PostgreSQL / SQLite engine + migrations
│       ├── auth.py               ← JWT & bcrypt authentication
│       ├── config.py             ← Settings loaded from environment
│       ├── sio.py                ← python-socketio real-time event hub
│       ├── permissions.py        ← RBAC enforcement
│       ├── routers/              ← REST endpoints: auth, projects, sheets,
│       │                            pins, markups, reports, sync, tasks,
│       │                            users, companies
│       └── services/             ← ReportLab PDF export & task state validation
│
└── frontend/                     ← React 18 / Vite tablet-first app (Port 3000)
    ├── src/                      ← Components, canvas renderers, offline Dexie DB
    ├── vite.config.js            ← Proxies /api, /uploads, /socket.io → backend
    └── package.json              ← Orchestration scripts (npm run dev)
```

---

## 🚀 Running Locally

```bash
# Install and start everything from the root
npm run dev
```

| Service | URL |
|---|---|
| Frontend (React/Vite) | http://localhost:3000 |
| Backend (FastAPI) | http://localhost:4000 |
| Swagger API Docs | http://localhost:4000/docs |
| ReDoc API Docs | http://localhost:4000/redoc |

---

*Built for CMSC 447 · PunchList Pro — Field-grade construction management.*

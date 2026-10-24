# 📋 PunchList Pro

> **Industrial-grade, tablet-first construction punch list and field inspection platform.** Built in the spirit of PlanGrid and Procore for General Contractors, Subcontractors, Architects, Field Inspectors, and Facility Owners.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2F%20Python%203.14-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2F%20Vite-61DAFB.svg?style=flat-square&logo=react)](https://react.dev)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20SQLite%20Fallback-336791.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Real-Time](https://img.shields.io/badge/Sync-Socket.IO-010101.svg?style=flat-square&logo=socketdotio)](https://socket.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

---

## 🏗️ Overview

**PunchList Pro** is an on-site field defect tracking and blueprint inspection system. It eliminates disjointed spreadsheets, paper plans, and email chains by providing:

1. **High-Resolution Plan Viewer** — Dynamic HTML5 Canvas + PDF.js renderer supporting multi-sheet architectural sets, pinch-to-zoom 4K fidelity without raster blur, and coordinate-anchored pins.
2. **Subcontractor Circle Stamp Markers** — Trade-attributed 2-letter initials (e.g., `MP` for Mechanical Piping, `EE` for Electrical) stamped with live status-coded rings.
3. **Role-Based Access Control (RBAC)** — 6 canonical system roles (`Facility Administrator`, `General Contractor`, `Trade Subcontractor`, `Architect`, `Owner`, `Field Inspector`) enforcing strict lifecycle state machines.
4. **Real-Time Collaboration** — Bi-directional WebSocket events via Socket.IO for immediate pin drops, live annotations, and instant status updates across field tablets.
5. **Dual-Engine Persistence** — Cloud-hosted PostgreSQL (via Supabase) with automatic offline/local SQLite fallback.
6. **Executive Export Suite** — ReportLab-powered PDF punch lists with photo embeds, alongside CSV exports.

---

## 📐 Architecture & Technology Stack

```
PunchList/
├── frontend/                         # React 18 + Vite SPA (Port 3000)
│   ├── src/
│   │   ├── components/               # BlueprintViewer, Dashboard, Modals, HUDs
│   │   ├── services/                 # API client, PDF & stamp renderers, Socket.IO
│   │   ├── data/                     # Offline schemas, sample floorplans
│   │   └── styles/                   # Industrial glare-resistant design tokens
│   └── package.json
│
├── backend/                          # FastAPI / Uvicorn ASGI backend (Port 4000)
│   ├── app/
│   │   ├── main.py                   # FastAPI app factory, ASGI mount, CORS
│   │   ├── database.py               # Dual PostgreSQL (pg8000) & SQLite engine
│   │   ├── auth.py                   # JWT & Supabase auth token verification
│   │   ├── permissions.py            # RBAC capability matrix & status validator
│   │   ├── sio.py                    # Real-time Socket.IO event hub
│   │   ├── middleware/               # In-memory rate limiting & security headers
│   │   ├── routers/                  # Modular REST routers (pins, sheets, etc.)
│   │   └── services/                 # PDF generator, cache, task validators
│   ├── migrations/                   # SQL schema versioning & runner
│   ├── tests/                        # Pytest automated test suite
│   └── requirements.txt
│
├── .github/workflows/                # CI / CD GitHub Actions pipelines
├── docker-compose.yml                # Multi-container orchestration
└── package.json                      # Unified root orchestration scripts
```

### Stack Breakdown

| Layer | Technologies | Key Capabilities |
|---|---|---|
| **Frontend** | React 18, Vite, PDF.js, Dexie.js (IndexedDB) | Tablet-optimized touch targets, offline queue, HUD controls |
| **Backend** | Python 3.14, FastAPI, Uvicorn, SQLAlchemy Core | High throughput, async WebSocket gateway, Swagger OpenAPI |
| **Database** | PostgreSQL (Supabase) + SQLite fallback | Pure-Python `pg8000` driver, auto-provisioning schema |
| **Real-time** | `python-socketio` AsyncServer | Room-based project broadcasting, low latency sync |
| **Reporting** | ReportLab, PyPDF | Architectural plan exports with embedded photos |

---

## 👥 Role-Based Access Control (RBAC)

PunchList Pro enforces an enterprise construction governance matrix:

| Role | Label | Scope & Core Capabilities |
|---|---|---|
| **`admin`** | Facility Administrator | Full system governance, project CRUD, sheet management, and sole authority to **close** or **delete** punch items. |
| **`general_contractor`** | General Contractor | Manages trade allocations, assigns pins, reviews remediations, approves or rejects subcontractor fixes. |
| **`sub_contractor`** | Trade Subcontractor | Scoped strictly to assigned items. Updates status (`Open` → `In Progress` → `Contractor Review`) and uploads photo proof. |
| **`architect`** | Architect | Specification auditing, defect logging, vector annotations, and report generation. |
| **`owner`** | Owner / Client Rep | Read-only executive dashboard, real-time walkthrough review, export formal PDF reports. |
| **`field_inspector`** | Field Inspector | On-site QA/QC walkthrough, dropping defect pins, verifying code compliance. |

### Status State Machine

```
[ Open / Assigned ]
         │  (Subcontractor / GC / Inspector)
         ▼
  [ In Progress ]
         │  (Subcontractor submits remediation)
         ▼
[ Submitted for Contractor Review ]
         ├──► GC Rejects ──────────► [ In Progress ]
         └──► GC Approves
                    ▼
      [ Submitted for Admin Review ]
                    │  (Facility Admin Final Sign-Off)
                    ▼
           [ Closed / Resolved ]
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** v18+ & `npm`
- **Python** 3.11+ (Python 3.14 tested)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/SdThakur/CMSC-447-Project.git
cd CMSC-447-Project

# Install frontend & root dependencies
npm run install:all

# Setup Python virtual environment
cd backend
python -m venv venv
venv\Scripts\activate      # Windows (or: source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
cd ..
```

### 2. Environment Configuration
Copy the provided environment templates:
```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration (optional override)
cp frontend/.env.example frontend/.env
```

*Note: If `DATABASE_URL` is omitted in `backend/.env`, PunchList Pro will seamlessly initialize a local SQLite database in `backend/data/` for zero-configuration local development.*

### 3. Run the Development Servers
From the root directory:
```bash
npm run dev
```

| Service | Address |
|---|---|
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) |
| **FastAPI REST API** | [http://localhost:4000](http://localhost:4000) |
| **Swagger Interactive Docs** | [http://localhost:4000/docs](http://localhost:4000/docs) |
| **ReDoc OpenAPI Documentation** | [http://localhost:4000/redoc](http://localhost:4000/redoc) |

---

## 🧪 Testing & Quality Assurance

PunchList Pro includes an automated test suite covering authentication, RBAC rules, health endpoints, and state transitions.

```bash
cd backend
venv\Scripts\activate
pytest -v
```

---

## 🐳 Docker Deployment

The platform is container-ready with multi-stage Dockerfiles and `docker-compose`:

```bash
# Build and run the entire stack with Docker Compose
docker-compose up --build -d

# Verify running containers
docker-compose ps
```

---

## 📄 License

This project is developed for **CMSC 447** at the University of Maryland, Baltimore County (UMBC). Licensed under the [MIT License](LICENSE).

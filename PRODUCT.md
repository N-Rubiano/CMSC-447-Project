# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

PunchList Pro serves six equal-priority construction and facility management roles:
- **Facility Administrator (`admin`)**: System-wide oversight, user provisioning, sheet management, final sign-off, and closing/deleting punch items.
- **General Contractor (`general_contractor`)**: Project-level coordination, team/subcontractor sponsorship, punch assignment, remediation review, and PDF/CSV export.
- **Trade Subcontractor (`sub_contractor`)**: Scoped to assigned trades/items; updates remediation progress (`Open` → `In Progress` → `Contractor Review`), posts comments, and uploads proof-of-completion photos.
- **Architect / Engineer (`architect`)**: Specification compliance auditing, drawing reviews, architectural pin drops, markups, and report exports.
- **Owner Representative (`owner`)**: Read-only executive visibility across project progress, audit trails, comments, and formal closeout exports.
- **Field Inspector (`field_inspector`)**: On-site QA/QC walkthroughs, blueprint pin capture with photos and priority tags, and status updates up to Contractor Review.

## Product Purpose

PunchList Pro is a tablet-first construction punch list and field inspection platform that replaces fragmented paper forms, spreadsheets, and email chains with spatially anchored defect tracking directly on architectural and engineering blueprints. Success means every defect is pinned to an exact drawing coordinate, tracked through a server-validated 5-stage approval lifecycle, and exported into audit-ready closeout reports.

## Positioning

*(Inferred from repository — A2 skipped by user)* Combines normalized, sub-inch blueprint pin anchoring (PDF.js + HTML5 Canvas), real-time Socket.IO multi-user collaboration, offline-first field resilience (Dexie.js IndexedDB + PostgreSQL-to-SQLite failover), and a server-enforced 5-stage defect lifecycle (`Open` → `In Progress` → `Contractor Review` → `Admin Review` → `Closed`) across all 6 RBAC roles.

## Operating Context

- **Environment**: Tablet-first web application used both on active, low-connectivity construction jobsites (including outdoor/bright-light conditions) and in office/executive settings on desktop browsers.
- **Project Scope**: Supports both the **UMBC Campus & Harbor Point** default demo workspace (with pre-configured UMBC buildings and floors in `umbcBuildings.js`) and generic multi-project construction workflows.
- **Core Workflows**: Building → Floor → Blueprint sheet selection; PDF/image blueprint ingestion and revision tracking; pin placement and composite trade-stamp attribution; threaded comments and geotagged inspection photos; real-time audit logging; and ReportLab PDF/CSV closeout exports.

## Capabilities and Constraints

- **Stack**: React 18 + Vite 6 frontend, FastAPI + SQLAlchemy Core backend, PostgreSQL (primary) / SQLite WAL (automatic failover), Supabase Auth + local JWT fallback, Socket.IO (`python-socketio`), Dexie.js IndexedDB, PDF.js, and ReportLab.
- **Security & RBAC**: All 6 roles and 5-stage status transitions are enforced server-side (`backend/app/permissions.py`); client-side restrictions are ergonomic only.
- **Performance**: Production bundle uses route-level code splitting (`React.lazy`), vendor chunking, Brotli/Gzip compression, and lightweight `/api/auth/me` payloads (Lighthouse 99/100/100).
- **Offline-First**: Mutations queue locally via Dexie.js and reconcile on reconnection.

## Evidence on Hand

- UMBC campus building/floor registry (`frontend/src/data/umbcBuildings.js`) and default project seed (`UMBC-2026`, `AIC-2026`).
- Software Requirements Specification (`SRS_PunchListPro.md`), architecture diagrams (`diagrams.md`), and UI design reference (`docs/DESIGN.md`).
- Automated test coverage: 39 Vitest + React Testing Library frontend tests across 6 suites plus Pytest backend tests.

## Product Principles

- **Spatial Precision First**: Every defect anchors to normalized `(x, y)` coordinates on a specific building, floor, and sheet revision.
- **Equal Clarity Across All 6 Roles**: Workflows and navigation surface role-appropriate actions cleanly for Inspectors, GCs, Subcontractors, Architects, Owners, and Admins alike.
- **Offline-Resilient Field Ergonomics**: Touch targets (`>= 38px`), high-contrast status indicators, and local IndexedDB queueing keep walkthroughs moving without reliable Wi-Fi/LTE.
- **Server-Enforced Accountability**: Every status handoff, assignment, and revision is validated server-side and recorded in an immutable audit trail.

## Accessibility & Inclusion

- Target WCAG AA+ compliance (already verified at Lighthouse Accessibility 100), with `>= 4.5:1` contrast ratios on dark navigation rails, keyboard-accessible modals/shortcuts (`Ctrl+K` / `⌘K`, `Escape`), `prefers-reduced-motion` support, and status indicators that pair color with text/icons.

# PunchList Pro — Security & Load Testing Report

**Date:** 2026-11-24  
**Repository:** `CMSC-447-Project` (`main` @ `7715d59`)  
**Scope:** Automated secret scanning (`gitleaks`) and HTTP load testing (`autocannon`) against the FastAPI backend.

---

## 1. Secret Scanning (`gitleaks`)

**Tool:** Gitleaks `v8.30.1`  
**Command:** `gitleaks detect --source . --no-git`

### Initial Scan
- **Data Scanned:** ~15.44 MB (`15,435,583` bytes) in `1.67s`
- **Findings:** `3` alerts (all false positives)

| Rule ID | File | Line | Match | Assessment |
| --- | --- | --- | --- | --- |
| `generic-api-key` | `frontend/src/__tests__/OnboardingPage.test.jsx` | 47 | `token="valid-tok-123"` | False positive (unit test mock fixture) |
| `generic-api-key` | `frontend/src/__tests__/OnboardingPage.test.jsx` | 86 | `token="valid-tok-123"` | False positive (unit test mock fixture) |
| `generic-api-key` | `frontend/src/__tests__/OnboardingPage.test.jsx` | 108 | `token: 'valid-tok-123'` | False positive (unit test mock fixture) |

### Remediation & Verification
- Added `.gitleaksignore` at the repository root to suppress the 3 unit-test fixture fingerprints (`frontend/src/__tests__/OnboardingPage.test.jsx:generic-api-key:47`, `:86`, `:108`).
- Committed and pushed `.gitleaksignore` (`7715d59`).
- **Re-scan Result:** Scanned ~15.44 MB (`15,435,903` bytes) in `1.32s` — **0 leaks found** (`no leaks found`).

---

## 2. HTTP Load & Throughput Testing (`autocannon`)

**Tool:** `npx autocannon`  
**Target:** FastAPI backend (`PunchList Pro Python/FastAPI 2.0.0`) at `http://127.0.0.1:4000`

### Summary Results

| Endpoint | Connections | Duration | Total Requests | Avg Throughput | Latency p50 | Latency p99 | Errors | HTTP 200 | HTTP 429 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /api/health` | 50 | 10.02s | 15,321 | 1,532.1 req/s | 29 ms | 85 ms | 0 | 119 | 15,202 |
| `GET /api/projects` | 20 | 10.04s | 11,381 | 1,138.1 req/s | 16 ms | 46 ms | 0 | 0 | 11,381 |

### Observations
- **Zero Transport Errors:** Both runs completed with `0` socket/connection errors under sustained concurrent load.
- **Low Tail Latency:** Median latency stayed under `30 ms` (`29 ms` at 50 connections, `16 ms` at 20 connections) and p99 stayed under `85 ms`.
- **Rate Limiting Active:** The backend's rate limiter actively throttled burst traffic with HTTP `429` once the threshold was reached (`119` `200 OK` responses on `/api/health` before throttling kicked in, and all subsequent requests on `/api/projects` returned `429` within the rate-limit window).

"""
permissions.py — Role-Based Access Control (RBAC) capability registry.

Canonical Roles (from README)
------------------------------
  admin              — Facility Administrator (system-wide)
  general_contractor — GC project supervisor
  sub_contractor     — Trade subcontractor (scoped to assigned items)
  architect          — Design compliance auditor
  owner              — Read-only executive representative
  field_inspector    — On-site QA/QC inspector

Capability Matrix
-----------------
Each capability string maps to the set of roles that hold it.
Use `can(user, capability)` to check access in route handlers,
or import `CAPABILITY_MAP` to introspect the matrix directly.

Special cases
-------------
- `pin.view` for sub_contractor is granted but MUST be additionally
  filtered at the query level to only return pins assigned to their
  company (enforced in the pins router, not here).
"""

from fastapi import Depends, HTTPException, status
from app.auth import get_current_user

# ── Canonical role constants ───────────────────────────────────────────────────

ADMIN               = "admin"
GENERAL_CONTRACTOR  = "general_contractor"
SUB_CONTRACTOR      = "sub_contractor"
ARCHITECT           = "architect"
OWNER               = "owner"
FIELD_INSPECTOR     = "field_inspector"

ALL_ROLES = {ADMIN, GENERAL_CONTRACTOR, SUB_CONTRACTOR, ARCHITECT, OWNER, FIELD_INSPECTOR}

# ── Capability → allowed roles map ────────────────────────────────────────────

CAPABILITY_MAP: dict[str, set[str]] = {
    "project.view":        {ADMIN, GENERAL_CONTRACTOR, SUB_CONTRACTOR, ARCHITECT, OWNER, FIELD_INSPECTOR},
    "project.create":      {ADMIN},
    "project.update":      {ADMIN, GENERAL_CONTRACTOR},
    "team.manage":         {ADMIN, GENERAL_CONTRACTOR},
    "company.manage":      {ADMIN, GENERAL_CONTRACTOR},
    "sheet.view":          {ADMIN, GENERAL_CONTRACTOR, SUB_CONTRACTOR, ARCHITECT, OWNER, FIELD_INSPECTOR},
    "sheet.manage":        {ADMIN, GENERAL_CONTRACTOR},
    "pin.view":            {ADMIN, GENERAL_CONTRACTOR, SUB_CONTRACTOR, ARCHITECT, OWNER, FIELD_INSPECTOR},
    "pin.create":          {ADMIN, GENERAL_CONTRACTOR, ARCHITECT, FIELD_INSPECTOR},
    "pin.update":          {ADMIN, GENERAL_CONTRACTOR, ARCHITECT, FIELD_INSPECTOR},
    "pin.update.assigned": {ADMIN, GENERAL_CONTRACTOR, SUB_CONTRACTOR, ARCHITECT, FIELD_INSPECTOR},
    "pin.assign":          {ADMIN, GENERAL_CONTRACTOR},
    "pin.close":           {ADMIN},
    "pin.delete":          {ADMIN},
    "comment.create":      {ADMIN, GENERAL_CONTRACTOR, SUB_CONTRACTOR, ARCHITECT, OWNER, FIELD_INSPECTOR},
    "photo.create":        {ADMIN, GENERAL_CONTRACTOR, SUB_CONTRACTOR, ARCHITECT, FIELD_INSPECTOR},
    "report.export":       {ADMIN, GENERAL_CONTRACTOR, ARCHITECT, OWNER},
    "task.manage":         {ADMIN, GENERAL_CONTRACTOR},
}

# ── Punch item status transition state machine ─────────────────────────────────

# Maps (current_status) → set of (next_status, allowed_roles) tuples
STATUS_TRANSITIONS: dict[str, list[tuple[str, set[str]]]] = {
    "open": [
        ("in_progress", {ADMIN, GENERAL_CONTRACTOR, SUB_CONTRACTOR, FIELD_INSPECTOR}),
    ],
    "in_progress": [
        ("contractor_review", {ADMIN, GENERAL_CONTRACTOR, SUB_CONTRACTOR, FIELD_INSPECTOR}),
    ],
    "contractor_review": [
        ("in_progress",    {ADMIN, GENERAL_CONTRACTOR}),   # GC rejects / requests rework
        ("admin_review",   {ADMIN, GENERAL_CONTRACTOR}),   # GC approves → escalate
    ],
    "admin_review": [
        ("closed",         {ADMIN}),                        # Admin final sign-off
        ("in_progress",    {ADMIN}),                        # Admin rejects
    ],
    "closed": [],  # Terminal — no further transitions
}


def can(user, capability: str) -> bool:
    """Return True if `user.role` holds the given capability."""
    return user.role in CAPABILITY_MAP.get(capability, set())


def validate_status_transition(current_status: str, next_status: str, user) -> None:
    """
    Raise HTTP 403 if the requested status transition is not permitted for
    this user's role, or HTTP 422 if the transition itself is invalid.
    """
    transitions = STATUS_TRANSITIONS.get(current_status, [])
    for allowed_next, allowed_roles in transitions:
        if allowed_next == next_status:
            if user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{user.role}' cannot move a pin from "
                           f"'{current_status}' → '{next_status}'.",
                )
            return  # Valid transition + authorised
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"Invalid status transition: '{current_status}' → '{next_status}'.",
    )


# ── FastAPI dependency factory ─────────────────────────────────────────────────

def require_capability(capability: str):
    """
    Dependency that raises HTTP 403 if the current user lacks `capability`.

    Usage::

        @router.post("/pins")
        def create_pin(user=Depends(require_capability("pin.create"))):
            ...
    """
    def _guard(current_user=Depends(get_current_user)):
        if not can(current_user, capability):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing capability: '{capability}'.",
            )
        return current_user
    return _guard

"""
permissions.py — Role-based access control helpers.

Direct Python port of the three RBAC functions in Node.js backend/src/index.js:
  - canUserAccessProject
  - canUserAccessPin
  - validateStatusTransition (for the v1 pins API)
"""
from .database import execute_one, execute_query


# Canonical system roles and capabilities. Project membership still scopes
# every non-admin role to the projects they are assigned to.
ROLE_PERMISSIONS = {
    "admin": {
        "project.view", "project.create", "project.update", "team.manage",
        "company.manage", "sheet.view", "sheet.manage", "pin.view",
        "pin.create", "pin.update", "pin.assign", "pin.delete", "pin.close",
        "comment.create", "photo.create", "report.export", "task.manage",
    },
    "general_contractor": {
        "project.view", "project.update", "team.manage", "company.manage",
        "sheet.view", "sheet.manage", "pin.view", "pin.create", "pin.update",
        "pin.assign", "comment.create", "photo.create", "report.export",
        "task.manage",
    },
    "sub_contractor": {
        "project.view", "sheet.view", "pin.view", "pin.update.assigned",
        "comment.create", "photo.create", "task.update.assigned",
    },
    "architect": {
        "project.view", "sheet.view", "pin.view", "pin.create", "pin.update",
        "comment.create", "photo.create", "report.export",
    },
    "owner": {
        "project.view", "sheet.view", "pin.view", "comment.create",
        "report.export",
    },
    "field_inspector": {
        "project.view", "sheet.view", "pin.view", "pin.create", "pin.update",
        "comment.create", "photo.create",
    },
}

ROLE_LABELS = {
    "admin": "Facility Administrator",
    "general_contractor": "General Contractor",
    "sub_contractor": "Trade Subcontractor",
    "architect": "Architect",
    "owner": "Owner / Client Rep",
    "field_inspector": "Field Inspector",
}


def has_permission(user: dict, permission: str) -> bool:
    """Return whether a user's system role has the requested capability."""
    return permission in ROLE_PERMISSIONS.get((user or {}).get("role"), set())


# ---------------------------------------------------------------------------
# Project access
# ---------------------------------------------------------------------------

def can_user_access_project(user: dict, project_id: str) -> bool:
    if not user:
        return False
    # Facility Administrator: System-wide unrestricted
    # Owner / Client Rep: Read-only access across all projects
    if user.get("role") in ("admin", "owner"):
        return True

    project = execute_one("SELECT * FROM projects WHERE id=:id", {"id": project_id})
    if not project:
        return False

    if user.get("role") == "general_contractor":
        if project.get("gc_user_id") == user.get("id"):
            return True
        if project.get("contractor_company_id") and project.get("contractor_company_id") == user.get("company_id"):
            return True
        member = execute_one(
            "SELECT id FROM project_members WHERE CAST(project_id AS TEXT)=:pid AND CAST(user_id AS TEXT)=:uid",
            {"pid": project_id, "uid": user.get("id")},
        )
        return member is not None

    if user.get("role") == "sub_contractor":
        # Has an assigned pin on this project
        assigned = execute_one(
            """SELECT id FROM pins WHERE project_id=:pid AND (
               assigned_subcontractor_id=:cid OR
               assigned_to_user_id=:uid OR
               LOWER(assigned_to_company)=LOWER(:company)
            ) LIMIT 1""",
            {
                "pid": project_id,
                "cid": user.get("company_id", ""),
                "uid": user.get("id", ""),
                "company": user.get("company", ""),
            },
        )
        if assigned:
            return True
        member = execute_one(
            "SELECT id FROM project_members WHERE CAST(project_id AS TEXT)=:pid AND CAST(user_id AS TEXT)=:uid",
            {"pid": project_id, "uid": user.get("id")},
        )
        return member is not None

    if has_permission(user, "project.view"):
        member = execute_one(
            "SELECT id FROM project_members WHERE CAST(project_id AS TEXT)=:pid AND CAST(user_id AS TEXT)=:uid",
            {"pid": project_id, "uid": user.get("id")},
        )
        return member is not None

    return False


# ---------------------------------------------------------------------------
# Pin access
# ---------------------------------------------------------------------------

def can_user_access_pin(user: dict, pin: dict) -> bool:
    if not user or not pin:
        return False
    if user.get("role") == "admin":
        return True

    if user.get("role") == "general_contractor":
        if (pin.get("assigned_contractor_id") and
                pin.get("assigned_contractor_id") == user.get("company_id")):
            return True
        project = execute_one("SELECT * FROM projects WHERE id=:id", {"id": pin.get("project_id")})
        if project and (
            project.get("gc_user_id") == user.get("id") or
            project.get("contractor_company_id") == user.get("company_id")
        ):
            return True
        return False

    if user.get("role") == "sub_contractor":
        if (pin.get("assigned_subcontractor_id") and
                pin.get("assigned_subcontractor_id") == user.get("company_id")):
            return True
        if (pin.get("assigned_to_user_id") and
                pin.get("assigned_to_user_id") == user.get("id")):
            return True
        if (pin.get("assigned_to_company") and user.get("company") and
                pin.get("assigned_to_company", "").lower() == user.get("company", "").lower()):
            return True
        return False

    if has_permission(user, "pin.view"):
        return can_user_access_project(user, pin.get("project_id"))

    return False


# ---------------------------------------------------------------------------
# Status transition validation (v1 pins API)
# ---------------------------------------------------------------------------

def validate_status_transition(user: dict, pin: dict, target_status: str) -> dict:
    """
    Returns {"valid": bool, "message": str | None}
    Mirrors validateStatusTransition() in index.js.
    """
    if not user or not pin:
        return {"valid": False, "message": "Invalid user or pin"}

    current = pin.get("status", "open")
    nxt = target_status

    is_current_open = current in ("open", "assigned")
    is_next_open = nxt in ("open", "assigned")
    is_current_in_progress = current == "in_progress"
    is_next_in_progress = nxt == "in_progress"
    is_current_contractor_review = current in ("submitted_for_contractor_review", "in_review")
    is_next_contractor_review = nxt == "submitted_for_contractor_review"
    is_current_admin_review = current == "submitted_for_admin_review"
    is_next_admin_review = nxt == "submitted_for_admin_review"
    is_next_closed = nxt == "closed"

    if user.get("role") == "sub_contractor":
        if not can_user_access_pin(user, pin):
            return {"valid": False, "message": "Subcontractor cannot update pins not assigned to their company"}
        if is_current_open and is_next_in_progress:
            return {"valid": True}
        if is_current_in_progress and is_next_contractor_review:
            return {"valid": True}
        if is_current_in_progress and is_next_in_progress:
            return {"valid": True}
        return {
            "valid": False,
            "message": (
                f"Subcontractor can only transition from Open to 'In Progress' or submit "
                f"to 'Contractor Review'. Invalid: {current} → {nxt}"
            ),
        }

    if user.get("role") == "general_contractor":
        if not can_user_access_pin(user, pin):
            return {"valid": False, "message": "Contractor cannot update pins outside their company scope"}
        if is_current_contractor_review and is_next_admin_review:
            return {"valid": True}
        if is_current_contractor_review and is_next_in_progress:
            return {"valid": True}
        if is_current_open and is_next_in_progress:
            return {"valid": True}
        if is_current_in_progress and is_next_admin_review:
            return {"valid": True}
        if is_next_closed:
            return {"valid": False, "message": "Only Facility Admin can formally close a punch item."}
        return {"valid": True}

    if user.get("role") == "field_inspector":
        if not can_user_access_pin(user, pin):
            return {"valid": False, "message": "Inspector cannot update pins outside their project."}
        if is_current_open and is_next_in_progress:
            return {"valid": True}
        if is_current_in_progress and is_next_contractor_review:
            return {"valid": True}
        return {
            "valid": False,
            "message": "Field Inspectors can move items to In Progress or Contractor Review.",
        }

    if user.get("role") == "admin":
        return {"valid": True}

    return {"valid": False, "message": "Unauthorized role"}

"""
services/task_validator.py — v2 Task schema validation and state machine.
Python port of backend/src/services/taskValidator.js.
"""
from typing import Optional
from ..database import execute_query

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_PRIORITIES = ["P-1", "P-2"]
VALID_STATUSES = ["Pending", "Open", "Closed"]
MAX_ASSIGNEES = 2
MAX_COMMENT_CHARS = 2000

PRIORITY_LEGACY_MAP = {
    "critical": "P-1", "high": "P-1", "medium": "P-2", "low": "P-2",
    "p-1": "P-1", "p-2": "P-2",
}

STATUS_LEGACY_MAP = {
    "open": "Open", "pending": "Pending", "closed": "Closed",
    "in_progress": "Open", "in_review": "Open", "assigned": "Open",
    "submitted_for_contractor_review": "Open",
    "submitted_for_admin_review": "Open",
    "rejected": "Closed",
}

ALLOWED_TRANSITIONS = {
    "Pending": ["Open"],
    "Open": ["Closed"],
    "Closed": ["Open"],
}

CSV_COLUMN_SPEC = [
    "title", "project_id", "sheet_id",
    "subcontractorStamp", "priority", "status",
    "buildingNumber", "officeRoomNo", "rootCause", "description",
    "startDate", "endDate", "assignee1", "assignee2",
]


# ---------------------------------------------------------------------------
# Normalizers
# ---------------------------------------------------------------------------

def normalize_priority(raw) -> str:
    if not raw:
        return "P-2"
    return PRIORITY_LEGACY_MAP.get(str(raw).lower().strip(), "P-2")


def normalize_status(raw) -> str:
    if not raw:
        return "Pending"
    return STATUS_LEGACY_MAP.get(str(raw).lower().strip(), "Pending")


# ---------------------------------------------------------------------------
# Subcontractor registry helpers
# ---------------------------------------------------------------------------

def get_subcontractor(sub_id: str) -> Optional[dict]:
    rows = execute_query("SELECT * FROM subcontractors WHERE id=:id", {"id": sub_id})
    return rows[0] if rows else None


def get_all_subcontractors() -> list:
    return execute_query("SELECT * FROM subcontractors ORDER BY name ASC")


# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------

def validate_assignees(assignee_ids: list) -> dict:
    if not isinstance(assignee_ids, list):
        return {"valid": False, "error": "assignees must be an array of subcontractor IDs."}
    if len(assignee_ids) > MAX_ASSIGNEES:
        return {
            "valid": False,
            "error": f"ASSIGNEE_LIMIT_EXCEEDED: A task may have at most {MAX_ASSIGNEES} assignees. Received {len(assignee_ids)}.",
        }
    for sub_id in assignee_ids:
        if not get_subcontractor(sub_id):
            return {
                "valid": False,
                "error": f'UNREGISTERED_SUBCONTRACTOR: "{sub_id}" does not exist in the subcontractor registry.',
            }
    return {"valid": True}


def validate_comment(body: str) -> dict:
    if not isinstance(body, str) or not body.strip():
        return {"valid": False, "error": "Comment body must be a non-empty string."}
    if len(body) > MAX_COMMENT_CHARS:
        return {
            "valid": False,
            "error": f"COMMENT_TOO_LONG: Comment exceeds the {MAX_COMMENT_CHARS}-character limit (received {len(body)} chars).",
        }
    return {"valid": True}


def validate_location(location) -> dict:
    if location is None:
        return {"valid": True}
    if not isinstance(location, dict):
        return {"valid": True}  # optional
    if "buildingNumber" in location and not (isinstance(location.get("buildingNumber"), str) and location.get("buildingNumber")):
        return {"valid": False, "error": "location.buildingNumber must be a non-empty string."}
    if "officeRoomNo" in location and not (isinstance(location.get("officeRoomNo"), str) and location.get("officeRoomNo")):
        return {"valid": False, "error": "location.officeRoomNo must be a non-empty string."}
    coords = location.get("coordinates")
    if coords:
        x, y = coords.get("x"), coords.get("y")
        if not (isinstance(x, (int, float)) and isinstance(y, (int, float)) and 0 <= x <= 100 and 0 <= y <= 100):
            return {"valid": False, "error": "location.coordinates.x and .y must be numbers in [0, 100]."}
    return {"valid": True}


def validate_task_payload(body: dict, is_update: bool = False) -> dict:
    errors = []

    if not is_update:
        if not body.get("title") or not str(body.get("title")).strip():
            errors.append("title is required and must be a non-empty string.")
        if not body.get("project_id"):
            errors.append("project_id is required.")
        if not body.get("sheet_id"):
            errors.append("sheet_id is required.")

    normalized_priority = normalize_priority(body.get("priority"))
    if body.get("priority") and normalized_priority not in VALID_PRIORITIES:
        errors.append(f'priority must be one of: {", ".join(VALID_PRIORITIES)}. Received: "{body.get("priority")}".')

    normalized_status = normalize_status(body.get("status"))
    if body.get("status") and normalized_status not in VALID_STATUSES:
        errors.append(f'status must be one of: {", ".join(VALID_STATUSES)}. Received: "{body.get("status")}".')

    if "assignees" in body:
        check = validate_assignees(body["assignees"])
        if not check["valid"]:
            errors.append(check["error"])

    if "location" in body:
        check = validate_location(body["location"])
        if not check["valid"]:
            errors.append(check["error"])

    for field in ["startDate", "endDate"]:
        val = body.get(field)
        if val is not None:
            try:
                from datetime import datetime
                datetime.fromisoformat(str(val).replace("Z", "+00:00"))
            except Exception:
                errors.append(f"{field} must be a valid ISO date string.")

    if "subcontractorStamp" in body:
        stamp = body.get("subcontractorStamp")
        if not isinstance(stamp, str) or len(stamp.strip()) > 6:
            errors.append("subcontractorStamp must be a string of at most 6 characters.")

    normalized = {**body, "priority": normalized_priority, "status": normalized_status}
    return {"valid": len(errors) == 0, "errors": errors, "normalized": normalized}


def validate_status_transition_v2(user: dict, task: dict, new_status: str) -> dict:
    """v2 Pending → Open → Closed state machine (mirrors taskValidator.js)."""
    normalized_new = normalize_status(new_status)
    current_status = normalize_status(task.get("status", "Pending"))
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])

    if normalized_new not in allowed:
        return {
            "valid": False,
            "message": f'INVALID_TRANSITION: Cannot move from "{current_status}" to "{normalized_new}". Allowed: {", ".join(allowed) or "none"}.',
            "normalizedStatus": normalized_new,
        }

    if current_status == "Closed" and normalized_new == "Open":
        if user.get("role") not in ("admin", "general_contractor"):
            return {
                "valid": False,
                "message": "FORBIDDEN: Only Admins or General Contractors can re-open a Closed task.",
                "normalizedStatus": normalized_new,
            }

    return {"valid": True, "normalizedStatus": normalized_new}


def validate_csv_row(row: dict, row_index: int) -> dict:
    errors = []
    for col in ["title", "project_id", "sheet_id"]:
        if not row.get(col) or not str(row[col]).strip():
            errors.append(f'Row {row_index}: "{col}" is required but missing or empty.')

    normalized_priority = normalize_priority(row.get("priority"))
    normalized_status = normalize_status(row.get("status"))

    assignee_ids = [row.get("assignee1"), row.get("assignee2")]
    assignee_ids = [a for a in assignee_ids if a]
    if assignee_ids:
        check = validate_assignees(assignee_ids)
        if not check["valid"]:
            errors.append(f"Row {row_index}: {check['error']}")

    for field in ["startDate", "endDate"]:
        val = row.get(field)
        if val:
            try:
                from datetime import datetime
                datetime.fromisoformat(str(val).replace("Z", "+00:00"))
            except Exception:
                errors.append(f'Row {row_index}: "{field}" is not a valid date (received: "{val}").')

    normalized = {
        "title": str(row.get("title") or "").strip(),
        "project_id": str(row.get("project_id") or "").strip(),
        "sheet_id": str(row.get("sheet_id") or "").strip(),
        "subcontractorStamp": str(row.get("subcontractorStamp") or "").strip()[:6],
        "priority": normalized_priority,
        "status": normalized_status,
        "location": {
            "buildingNumber": str(row.get("buildingNumber") or "").strip(),
            "officeRoomNo": str(row.get("officeRoomNo") or "").strip(),
            "sheetId": str(row.get("sheet_id") or "").strip(),
        },
        "rootCause": str(row.get("rootCause") or "").strip(),
        "description": str(row.get("description") or "").strip(),
        "startDate": row.get("startDate") or None,
        "endDate": row.get("endDate") or None,
        "assignees": assignee_ids,
        "watchers": [],
    }
    return {"valid": len(errors) == 0, "errors": errors, "normalized": normalized}

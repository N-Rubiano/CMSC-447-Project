"""
routers/pins.py — Punch pin CRUD + status transition endpoints.

Routes
------
GET    /api/projects/{pid}/sheets/{sid}/pins      — List pins on a sheet
POST   /api/projects/{pid}/sheets/{sid}/pins      — Drop a new pin
GET    /api/pins/{pin_id}                         — Get a single pin
PATCH  /api/pins/{pin_id}                         — Update pin fields
PATCH  /api/pins/{pin_id}/status                  — Transition lifecycle status
PATCH  /api/pins/{pin_id}/assign                  — Assign pin to user/company
DELETE /api/pins/{pin_id}                         — Hard-delete (admin only)
POST   /api/pins/{pin_id}/close                   — Close / resolve (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.permissions import require_capability, validate_status_transition
from app.auth import get_current_user
from app.models.pin import Pin
from app.sio import broadcast_pin_event

router = APIRouter(tags=["pins"])


class PinCreate(BaseModel):
    sheet_id:    int
    x_pct:       float
    y_pct:       float
    title:       str
    description: str | None = None
    pin_type:    str = "teardrop"
    priority:    str = "medium"
    room_label:  str | None = None


class PinUpdate(BaseModel):
    title:       str | None = None
    description: str | None = None
    priority:    str | None = None
    room_label:  str | None = None
    x_pct:       float | None = None
    y_pct:       float | None = None


class StatusTransition(BaseModel):
    new_status: str


class AssignPin(BaseModel):
    assignee_id:         int | None = None
    assigned_company_id: int | None = None


@router.get("/projects/{project_id}/sheets/{sheet_id}/pins")
def list_pins(
    project_id: int,
    sheet_id:   int,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("pin.view")),
):
    q = db.query(Pin).filter(Pin.project_id == project_id, Pin.sheet_id == sheet_id)
    # Subcontractor: only see pins assigned to their company
    if user.role == "sub_contractor" and user.company_id:
        q = q.filter(Pin.assigned_company_id == user.company_id)
    return q.all()


@router.post("/projects/{project_id}/sheets/{sheet_id}/pins", status_code=status.HTTP_201_CREATED)
async def create_pin(
    project_id: int,
    sheet_id:   int,
    payload:    PinCreate,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("pin.create")),
):
    pin = Pin(
        project_id=project_id,
        creator_id=user.id,
        **payload.model_dump(),
    )
    db.add(pin)
    db.commit()
    db.refresh(pin)
    await broadcast_pin_event("pin_created", project_id, {"pin_id": pin.id})
    return pin


@router.get("/pins/{pin_id}")
def get_pin(pin_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    pin = db.get(Pin, pin_id)
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found.")
    return pin


@router.patch("/pins/{pin_id}")
async def update_pin(
    pin_id:  int,
    payload: PinUpdate,
    db:      Session = Depends(get_db),
    user   = Depends(require_capability("pin.update")),
):
    pin = db.get(Pin, pin_id)
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(pin, k, v)
    db.commit()
    db.refresh(pin)
    await broadcast_pin_event("pin_updated", pin.project_id, {"pin_id": pin.id})
    return pin


@router.patch("/pins/{pin_id}/status")
async def transition_status(
    pin_id:  int,
    payload: StatusTransition,
    db:      Session = Depends(get_db),
    user   = Depends(get_current_user),
):
    pin = db.get(Pin, pin_id)
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found.")
    validate_status_transition(pin.status, payload.new_status, user)
    pin.status = payload.new_status
    db.commit()
    db.refresh(pin)
    await broadcast_pin_event("pin_updated", pin.project_id, {"pin_id": pin.id, "status": pin.status})
    return pin


@router.patch("/pins/{pin_id}/assign")
def assign_pin(
    pin_id:  int,
    payload: AssignPin,
    db:      Session = Depends(get_db),
    user   = Depends(require_capability("pin.assign")),
):
    pin = db.get(Pin, pin_id)
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found.")
    if payload.assignee_id is not None:
        pin.assignee_id = payload.assignee_id
    if payload.assigned_company_id is not None:
        pin.assigned_company_id = payload.assigned_company_id
    db.commit()
    db.refresh(pin)
    return pin


@router.post("/pins/{pin_id}/close")
async def close_pin(
    pin_id: int,
    db:     Session = Depends(get_db),
    user  = Depends(require_capability("pin.close")),
):
    from datetime import datetime, timezone
    pin = db.get(Pin, pin_id)
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found.")
    pin.status    = "closed"
    pin.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pin)
    await broadcast_pin_event("pin_closed", pin.project_id, {"pin_id": pin.id})
    return pin


@router.delete("/pins/{pin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pin(
    pin_id: int,
    db:     Session = Depends(get_db),
    user  = Depends(require_capability("pin.delete")),
):
    pin = db.get(Pin, pin_id)
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found.")
    project_id = pin.project_id
    db.delete(pin)
    db.commit()
    await broadcast_pin_event("pin_deleted", project_id, {"pin_id": pin_id})

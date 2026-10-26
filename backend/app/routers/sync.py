"""routers/sync.py — Offline batch sync endpoint: POST /api/sync/batch"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..database import execute_write, settings

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/batch")
def batch_sync(body: dict, current_user: dict = Depends(get_current_user)):
    mutations = body.get("mutations")
    if not isinstance(mutations, list):
        raise HTTPException(400, "Mutations array required")

    results = []
    now = datetime.now(timezone.utc).isoformat()

    for item in mutations:
        entity = item.get("entity")
        mtype = item.get("type")
        data = item.get("data", {})
        try:
            if entity == "pin" and mtype == "create":
                pin_id = data.get("id") or f"pin-{uuid.uuid4().hex[:8]}"
                if settings.use_postgres:
                    execute_write(
                        """INSERT INTO pins (id,sheet_id,project_id,item_number,title,description,status,
                           priority,discipline,x_pct,y_pct,room_location,due_date,assigned_to_user_id,
                           assigned_to_company,created_by_user_id,assigned_contractor_id,
                           assigned_subcontractor_id,created_at,updated_at)
                           VALUES (:id,:sid,:pid,:num,:title,:desc,:status,:prio,:disc,:x,:y,:room,
                           :due,:uid,:company,:created_by,:cid,:scid,:now,:now)
                           ON CONFLICT (id) DO NOTHING""",
                        dict(id=pin_id, sid=data.get("sheet_id"), pid=data.get("project_id"),
                             num=data.get("item_number"), title=data.get("title"),
                             desc=data.get("description", ""), status=data.get("status", "open"),
                             prio=data.get("priority", "medium"), disc=data.get("discipline"),
                             x=data.get("x_pct"), y=data.get("y_pct"), room=data.get("room_location"),
                             due=data.get("due_date"), uid=data.get("assigned_to_user_id"),
                             company=data.get("assigned_to_company"), created_by=data.get("created_by_user_id"),
                             cid=data.get("assigned_contractor_id"), scid=data.get("assigned_subcontractor_id"),
                             now=now),
                    )
                else:
                    execute_write(
                        """INSERT OR REPLACE INTO pins (id,sheet_id,project_id,item_number,title,description,
                           status,priority,discipline,x_pct,y_pct,room_location,due_date,
                           assigned_to_user_id,assigned_to_company,created_by_user_id,
                           assigned_contractor_id,assigned_subcontractor_id,created_at,updated_at)
                           VALUES (:id,:sid,:pid,:num,:title,:desc,:status,:prio,:disc,:x,:y,:room,
                           :due,:uid,:company,:created_by,:cid,:scid,:now,:now)""",
                        dict(id=pin_id, sid=data.get("sheet_id"), pid=data.get("project_id"),
                             num=data.get("item_number"), title=data.get("title"),
                             desc=data.get("description", ""), status=data.get("status", "open"),
                             prio=data.get("priority", "medium"), disc=data.get("discipline"),
                             x=data.get("x_pct"), y=data.get("y_pct"), room=data.get("room_location"),
                             due=data.get("due_date"), uid=data.get("assigned_to_user_id"),
                             company=data.get("assigned_to_company"), created_by=data.get("created_by_user_id"),
                             cid=data.get("assigned_contractor_id"), scid=data.get("assigned_subcontractor_id"),
                             now=now),
                    )
                results.append({"id": pin_id, "status": "synced"})
            else:
                results.append({"id": data.get("id"), "status": "skipped",
                                 "error": f"Unknown entity/type: {entity}/{mtype}"})
        except Exception as e:
            results.append({"id": data.get("id"), "status": "failed", "error": str(e)})

    synced = [r for r in results if r["status"] == "synced"]
    return {"syncedCount": len(synced), "results": results}

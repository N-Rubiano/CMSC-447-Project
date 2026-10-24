"""routers/companies.py — CRUD /api/companies"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..auth import get_current_user
from ..database import execute_query, execute_one, execute_write, settings
from ..sio import sio

router = APIRouter(prefix="/api/companies", tags=["companies"])


class CompanyCreate(BaseModel):
    name: str
    type: str = "subcontractor"
    parent_contractor_id: Optional[str] = None
    phone: str = ""
    email: str = ""
    license_number: str = ""
    trade: str = ""
    address: str = ""
    contact_person: str = ""


@router.get("")
def list_companies(current_user: dict = Depends(get_current_user)):
    return execute_query("SELECT * FROM companies ORDER BY name ASC")


@router.get("/{company_id}/subcontractors")
def list_subcontractors(company_id: str, current_user: dict = Depends(get_current_user)):
    return execute_query(
        "SELECT * FROM companies WHERE parent_contractor_id=:cid",
        {"cid": company_id},
    )


@router.post("", status_code=201)
async def create_company(body: CompanyCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "general_contractor"):
        raise HTTPException(403, "Only Administrators or General Contractors can add companies.")
    if not body.name.strip():
        raise HTTPException(400, "Company name is required")

    ctype = "contractor" if body.type == "contractor" else "subcontractor"
    cid = f"cmp-{'gc' if ctype == 'contractor' else 'sub'}-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    if settings.use_postgres:
        execute_write(
            """INSERT INTO companies (id,name,type,parent_contractor_id,phone,email,license_number,trade,address,contact_person,created_at)
               VALUES (:id,:name,:type,:parent,:phone,:email,:lic,:trade,:addr,:contact,:now)
               ON CONFLICT (id) DO NOTHING""",
            dict(id=cid, name=body.name.strip(), type=ctype, parent=body.parent_contractor_id,
                 phone=body.phone.strip(), email=body.email.strip(), lic=body.license_number.strip(),
                 trade=body.trade.strip(), addr=body.address.strip(), contact=body.contact_person.strip(), now=now),
        )
    else:
        execute_write(
            """INSERT OR IGNORE INTO companies (id,name,type,parent_contractor_id,phone,email,license_number,trade,address,contact_person,created_at)
               VALUES (:id,:name,:type,:parent,:phone,:email,:lic,:trade,:addr,:contact,:now)""",
            dict(id=cid, name=body.name.strip(), type=ctype, parent=body.parent_contractor_id,
                 phone=body.phone.strip(), email=body.email.strip(), lic=body.license_number.strip(),
                 trade=body.trade.strip(), addr=body.address.strip(), contact=body.contact_person.strip(), now=now),
        )

    company = execute_one("SELECT * FROM companies WHERE id=:id", {"id": cid})
    await sio.emit("company:created", company)
    return company


@router.patch("/{company_id}")
async def update_company(company_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "general_contractor"):
        raise HTTPException(403, "Only Administrators or General Contractors can update companies.")
    existing = execute_one("SELECT * FROM companies WHERE id=:id", {"id": company_id})
    if not existing:
        raise HTTPException(404, "Company not found")

    allowed = ["name", "type", "parent_contractor_id", "phone", "email",
               "license_number", "trade", "address", "contact_person"]
    sets = ", ".join(f"{k}=:{k}" for k in allowed if k in body)
    if not sets:
        return existing

    execute_write(f"UPDATE companies SET {sets} WHERE id=:company_id",
                  {**{k: body[k] for k in allowed if k in body}, "company_id": company_id})
    updated = execute_one("SELECT * FROM companies WHERE id=:id", {"id": company_id})
    await sio.emit("company:updated", updated)
    return updated


@router.delete("/{company_id}")
async def delete_company(company_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only Administrators can remove companies.")
    existing = execute_one("SELECT * FROM companies WHERE id=:id", {"id": company_id})
    if not existing:
        raise HTTPException(404, "Company not found")
    execute_write("DELETE FROM companies WHERE id=:id", {"id": company_id})
    await sio.emit("company:deleted", {"id": company_id})
    return {"message": "Company deleted successfully", "id": company_id}

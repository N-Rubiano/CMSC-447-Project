"""
routers/companies.py — Trade company / subcontractor company management.

Routes
------
GET    /api/companies          — List all companies
POST   /api/companies          — Create a company (admin | gc)
GET    /api/companies/{id}     — Get a company
PATCH  /api/companies/{id}     — Update a company (admin | gc)
DELETE /api/companies/{id}     — Delete a company (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.permissions import require_capability
from app.models.company import Company

router = APIRouter(prefix="/companies", tags=["companies"])


class CompanyCreate(BaseModel):
    name:         str
    trade:        str | None = None
    initials:     str | None = None   # 2-4 uppercase letters for circle stamps
    color_accent: str | None = None   # hex e.g. "#2563EB"


class CompanyUpdate(BaseModel):
    name:         str | None = None
    trade:        str | None = None
    initials:     str | None = None
    color_accent: str | None = None


@router.get("/")
def list_companies(
    db:   Session = Depends(get_db),
    user = Depends(require_capability("company.manage")),
):
    return db.query(Company).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    db:      Session = Depends(get_db),
    user   = Depends(require_capability("company.manage")),
):
    company = Company(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/{company_id}")
def get_company(
    company_id: int,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("company.manage")),
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    return company


@router.patch("/{company_id}")
def update_company(
    company_id: int,
    payload:    CompanyUpdate,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("company.manage")),
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(company, k, v)
    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("company.manage")),
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    db.delete(company)
    db.commit()

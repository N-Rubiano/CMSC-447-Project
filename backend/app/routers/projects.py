"""
routers/projects.py — Project CRUD endpoints.

Routes
------
GET    /api/projects          — List all projects (role-scoped)
POST   /api/projects          — Create a project (admin only)
GET    /api/projects/{id}     — Get a single project
PATCH  /api/projects/{id}     — Update a project (admin | gc)
DELETE /api/projects/{id}     — Delete a project (admin only)
GET    /api/projects/{id}/team — List project team members
POST   /api/projects/{id}/team — Add a user to the project team (admin | gc)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.permissions import require_capability
from app.models.project import Project

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name:        str
    address:     str | None = None
    description: str | None = None


class ProjectUpdate(BaseModel):
    name:        str | None = None
    address:     str | None = None
    description: str | None = None
    status:      str | None = None


@router.get("/")
def list_projects(
    db:   Session = Depends(get_db),
    user = Depends(require_capability("project.view")),
):
    # TODO: scope to user's assigned projects for sub_contractor / field_inspector
    return db.query(Project).all()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db:      Session = Depends(get_db),
    user   = Depends(require_capability("project.create")),
):
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}")
def get_project(
    project_id: int,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("project.view")),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.patch("/{project_id}")
def update_project(
    project_id: int,
    payload:    ProjectUpdate,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("project.update")),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(project, k, v)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("project.create")),  # admin only
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    db.delete(project)
    db.commit()

"""
routers/tasks.py — Task / checklist item management.

Routes
------
GET    /api/projects/{pid}/tasks    — List tasks for a project
POST   /api/projects/{pid}/tasks    — Create a task (admin | gc)
PATCH  /api/tasks/{id}             — Update / mark done (admin | gc)
DELETE /api/tasks/{id}             — Delete a task (admin | gc)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.permissions import require_capability
from app.models.task import Task

router = APIRouter(tags=["tasks"])


class TaskCreate(BaseModel):
    title:       str
    description: str | None = None
    pin_id:      int | None = None
    due_date:    datetime | None = None


class TaskUpdate(BaseModel):
    title:       str | None = None
    description: str | None = None
    is_done:     bool | None = None
    due_date:    datetime | None = None


@router.get("/projects/{project_id}/tasks")
def list_tasks(
    project_id: int,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("task.manage")),
):
    return db.query(Task).filter(Task.project_id == project_id).all()


@router.post("/projects/{project_id}/tasks", status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    payload:    TaskCreate,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("task.manage")),
):
    task = Task(project_id=project_id, **payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/tasks/{task_id}")
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db:      Session = Depends(get_db),
    user   = Depends(require_capability("task.manage")),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(task, k, v)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db:      Session = Depends(get_db),
    user   = Depends(require_capability("task.manage")),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    db.delete(task)
    db.commit()

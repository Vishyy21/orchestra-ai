"""Task management API router for ORCHESTRA AI."""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.task_service import task_service
from app.schemas.task import TaskCreate, TaskRead, TaskListResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=TaskListResponse)
def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """GET /api/tasks — List all tasks with optional category and status filtering."""
    tasks, total = task_service.list_tasks(
        db, skip=skip, limit=limit, status=status, category=category
    )
    return TaskListResponse(tasks=[TaskRead.model_validate(t) for t in tasks], total=total)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    auto_execute: bool = Query(False, description="Automatically dispatch LangGraph 5-agent execution"),
    db: Session = Depends(get_db),
):
    """POST /api/tasks — Submit a new task into the Orchestra orchestration pipeline."""
    task = task_service.create_task(db, payload)

    if auto_execute:
        import threading
        from app.graph.workflow import execute_task_workflow
        thread = threading.Thread(
            target=execute_task_workflow,
            args=(task.id,),
            kwargs={"requires_approval": task.requires_approval},
            daemon=True,
        )
        thread.start()

    return TaskRead.model_validate(task)


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: str, db: Session = Depends(get_db)):
    """GET /api/tasks/{task_id} — Retrieve detailed task status and agent runs."""
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' not found.",
        )
    return TaskRead.model_validate(task)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):
    """PATCH /api/tasks/{task_id} — Update task attributes."""
    task = task_service.update_task(db, task_id, payload)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' not found.",
        )
    return TaskRead.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    """DELETE /api/tasks/{task_id} — Remove task."""
    deleted = task_service.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' not found.",
        )
    return None


@router.post("/{task_id}/execute")
def execute_task(
    task_id: str,
    sync: bool = Query(False, description="Execute synchronously and wait for completion"),
    requires_approval: Optional[bool] = Query(None, description="Override task approval requirement"),
    db: Session = Depends(get_db),
):
    """POST /api/tasks/{task_id}/execute — Run the full 5-agent LangGraph workflow against local Ollama."""
    from app.graph.workflow import execute_task_workflow
    import threading

    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' not found.",
        )

    if sync:
        result = execute_task_workflow(task_id, requires_approval=requires_approval)
        refreshed_task = task_service.get_task(db, task_id)
        return {
            "message": "Task workflow execution finished",
            "task_id": task_id,
            "status": refreshed_task.status if refreshed_task else "unknown",
            "result_summary": refreshed_task.result_summary if refreshed_task else None,
            "workflow_result": result,
        }

    # Asynchronous thread execution
    thread = threading.Thread(
        target=execute_task_workflow,
        args=(task_id,),
        kwargs={"requires_approval": requires_approval},
        daemon=True,
    )
    thread.start()

    return {
        "message": "Task workflow execution initiated across 5 agents",
        "task_id": task_id,
        "status": "running",
    }

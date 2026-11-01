"""Approvals and Human-in-the-Loop API router for ORCHESTRA AI."""

import threading
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Approval, Task
from app.schemas.approval import ApprovalRead, ApprovalDecision

router = APIRouter(prefix="/approvals", tags=["Human Approvals"])


@router.get("", response_model=List[ApprovalRead])
def list_approvals(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """GET /api/approvals — List approval requests for human-in-the-loop governance."""
    query = db.query(Approval)
    if status_filter:
        query = query.filter(Approval.status == status_filter)
    approvals = query.order_by(Approval.created_at.desc()).all()
    return [ApprovalRead.model_validate(a) for a in approvals]


@router.post("/{approval_id}/decide", response_model=ApprovalRead)
def decide_approval(
    approval_id: str,
    payload: ApprovalDecision,
    sync: bool = Query(False, description="Whether to execute remaining workflow synchronously"),
    db: Session = Depends(get_db),
):
    """POST /api/approvals/{id}/decide — Approve or reject an agent action and resume/abort workflow."""
    from app.graph.workflow import resume_task_workflow, reject_task_workflow

    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval with ID '{approval_id}' not found.",
        )

    approval.status = payload.decision
    approval.decided_at = datetime.utcnow()
    db.commit()
    db.refresh(approval)

    task = db.query(Task).filter(Task.id == approval.task_id).first()
    if task and task.status == "awaiting_approval":
        if payload.decision == "approved":
            if sync:
                resume_task_workflow(approval.task_id)
            else:
                thread = threading.Thread(
                    target=resume_task_workflow,
                    args=(approval.task_id,),
                    daemon=True,
                )
                thread.start()
        elif payload.decision == "rejected":
            reject_task_workflow(
                approval.task_id,
                reason=payload.reason or "Rejected by human supervisor",
            )

    return ApprovalRead.model_validate(approval)

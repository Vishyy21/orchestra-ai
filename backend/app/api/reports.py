"""Reports API router for ORCHESTRA AI."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Report
from app.schemas.report import ReportCreate, ReportRead

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=List[ReportRead])
def list_reports(task_id: Optional[str] = None, db: Session = Depends(get_db)):
    """GET /api/reports — List all synthesized reports."""
    query = db.query(Report)
    if task_id:
        query = query.filter(Report.task_id == task_id)
    reports = query.order_by(Report.created_at.desc()).all()
    return [ReportRead.model_validate(r) for r in reports]


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: str, db: Session = Depends(get_db)):
    """GET /api/reports/{report_id} — Retrieve single report."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' not found.",
        )
    return ReportRead.model_validate(report)


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, db: Session = Depends(get_db)):
    """POST /api/reports — Save a new intelligence report."""
    report = Report(
        task_id=payload.task_id,
        title=payload.title,
        content=payload.content,
        category=payload.category,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return ReportRead.model_validate(report)

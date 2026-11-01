"""Task service for managing task lifecycle, runs, and validation in ORCHESTRA AI."""

from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.database.models import Task, AgentRun
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
    """Business logic for task operations."""

    def create_task(self, db: Session, task_in: TaskCreate) -> Task:
        """Create and persist a new task."""
        requires_approval = getattr(task_in, "requires_approval", False) or (task_in.priority == "critical")
        task = Task(
            title=task_in.title.strip(),
            description=task_in.description.strip(),
            category=task_in.category,
            priority=task_in.priority,
            requires_approval=requires_approval,
            status="pending",
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    def list_tasks(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        category: Optional[str] = None,
    ) -> Tuple[List[Task], int]:
        """List tasks with optional filtering and total count."""
        query = db.query(Task)
        if status:
            query = query.filter(Task.status == status)
        if category:
            query = query.filter(Task.category == category)

        total = query.count()
        tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
        return tasks, total

    def get_task(self, db: Session, task_id: str) -> Optional[Task]:
        """Retrieve task by ID including relationships."""
        return db.query(Task).filter(Task.id == task_id).first()

    def update_task(self, db: Session, task_id: str, task_in: TaskUpdate) -> Optional[Task]:
        """Update existing task attributes."""
        task = self.get_task(db, task_id)
        if not task:
            return None

        update_data = task_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        db.commit()
        db.refresh(task)
        return task

    def delete_task(self, db: Session, task_id: str) -> bool:
        """Delete task and associated records."""
        task = self.get_task(db, task_id)
        if not task:
            return False

        db.delete(task)
        db.commit()
        return True


task_service = TaskService()

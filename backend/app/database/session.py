"""Database session and connection management for ORCHESTRA AI."""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings
from app.database.models import Base

# SQLite configuration with thread-safe settings
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all database tables safely if they do not exist, and perform non-destructive migrations."""
    Base.metadata.create_all(bind=engine)
    if settings.database_url.startswith("sqlite"):
        with engine.connect() as conn:
            from sqlalchemy import text
            try:
                conn.execute(text("ALTER TABLE documents ADD COLUMN chunk_count INTEGER DEFAULT 0"))
                conn.commit()
            except Exception:
                pass  # Column already exists
            try:
                conn.execute(text("ALTER TABLE documents ADD COLUMN file_hash VARCHAR(64) DEFAULT NULL"))
                conn.commit()
            except Exception:
                pass  # Column already exists
            try:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN requires_approval BOOLEAN DEFAULT 0"))
                conn.commit()
            except Exception:
                pass  # Column already exists

        # Non-destructive backfill: calculate SHA-256 for existing document records lacking a hash
        try:
            import hashlib
            from pathlib import Path
            from app.database.models import Document

            with SessionLocal() as db:
                unhashed_docs = db.query(Document).filter(
                    (Document.file_hash == None) | (Document.file_hash == "")
                ).all()
                updated_count = 0
                for doc in unhashed_docs:
                    doc_path = Path(doc.file_path)
                    if doc_path.exists():
                        try:
                            content = doc_path.read_bytes()
                            doc.file_hash = hashlib.sha256(content).hexdigest()
                            updated_count += 1
                        except Exception:
                            pass
                if updated_count > 0:
                    db.commit()
        except Exception:
            pass


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""Knowledge base and document management service for ORCHESTRA AI.

Integrates file storage, text extraction (PDF/TXT/MD), semantic chunking,
and persistent vector indexing via ChromaDB.
"""

import os
from pathlib import Path
from typing import List, Optional, Dict, Any
import logging
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Document
from app.rag.extractor import (
    extract_text_from_file,
    chunk_text,
    DocumentExtractionError,
)
from app.rag.chroma_service import chroma_service

logger = logging.getLogger("orchestra.rag.document_service")


class DocumentService:
    """Service for handling document uploads, text extraction, and vector indexing."""

    def __init__(self, uploads_dir: Optional[Path] = None):
        self.uploads_dir = uploads_dir or settings.uploads_dir
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

    async def save_and_index_file(
        self,
        db: Session,
        upload_file: UploadFile,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
    ) -> Document:
        """Save an uploaded file to storage, extract text, chunk, and index into ChromaDB.
        
        Uses SHA-256 content hashing for robust duplicate detection across filenames.
        Only marks indexed=True if extraction, chunking, and ChromaDB indexing all succeed.
        Cleans up disk artifacts and database records if processing fails.
        """
        import hashlib

        filename = upload_file.filename or "uploaded_document"
        safe_filename = "".join(c for c in filename if c.isalnum() or c in "._- ")

        content = await upload_file.read()
        file_size = len(content)

        if file_size == 0:
            raise DocumentExtractionError("Uploaded file is empty (0 bytes).")

        # Compute deterministic SHA-256 content hash
        file_hash = hashlib.sha256(content).hexdigest()

        # Robust duplicate check: Match by content hash (detects duplicates even with different filenames)
        existing_doc = (
            db.query(Document)
            .filter(
                Document.file_hash == file_hash,
                Document.indexed == True,
            )
            .first()
        )
        if existing_doc and Path(existing_doc.file_path).exists():
            logger.info(
                f"Duplicate upload detected: Content SHA-256 ({file_hash[:12]}...) is already indexed "
                f"as '{existing_doc.filename}' (Doc ID: {existing_doc.id}). Reusing existing record."
            )
            return existing_doc

        target_path = self.uploads_dir / safe_filename

        # If a different file with same name exists, generate unique name
        counter = 1
        base_name, ext = os.path.splitext(safe_filename)
        while target_path.exists():
            target_path = self.uploads_dir / f"{base_name}_{counter}{ext}"
            counter += 1

        with open(target_path, "wb") as f:
            f.write(content)

        # Create base document record (unindexed initially, storing SHA-256 hash)
        doc = Document(
            filename=target_path.name,
            file_path=str(target_path),
            file_size=file_size,
            mime_type=upload_file.content_type or "application/octet-stream",
            indexed=False,
            chunk_count=0,
            file_hash=file_hash,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        try:
            # 1. Text extraction
            pages = extract_text_from_file(target_path)

            # 2. Semantic chunking
            chunks = chunk_text(
                pages=pages,
                doc_id=doc.id,
                filename=doc.filename,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )

            if not chunks:
                raise DocumentExtractionError("No valid text chunks could be produced from document.")

            # 3. Vector indexing in ChromaDB
            indexed_count = chroma_service.index_chunks(
                doc_id=doc.id,
                filename=doc.filename,
                chunks=chunks,
            )

            # 4. Mark indexed only on complete success
            doc.indexed = True
            doc.chunk_count = indexed_count
            db.commit()
            db.refresh(doc)
            logger.info(f"Successfully processed and indexed document '{doc.filename}' ({doc.chunk_count} chunks).")
            return doc

        except Exception as exc:
            logger.error(f"Failed to extract/index document '{doc.filename}': {exc}. Cleaning up artifacts.")
            # Purge any partial vectors if created
            try:
                chroma_service.delete_document_vectors(doc.id)
            except Exception:
                pass

            # Clean up the physical file from disk
            if target_path.exists():
                try:
                    target_path.unlink()
                except OSError:
                    pass

            # Clean up database record so failed indexing does not leave zombie records
            try:
                db.delete(doc)
                db.commit()
            except Exception:
                db.rollback()

            raise

    def list_documents(self, db: Session) -> List[Document]:
        """List all uploaded documents."""
        return db.query(Document).order_by(Document.uploaded_at.desc()).all()

    def get_document(self, db: Session, doc_id: str) -> Optional[Document]:
        """Retrieve a document by ID."""
        return db.query(Document).filter(Document.id == doc_id).first()

    def delete_document(self, db: Session, doc_id: str) -> bool:
        """Delete a document from storage, ChromaDB vector store, and SQLite database."""
        doc = self.get_document(db, doc_id)
        if not doc:
            return False

        # 1. Purge vectors from ChromaDB
        try:
            chroma_service.delete_document_vectors(doc_id)
        except Exception as exc:
            logger.warning(f"Failed to delete ChromaDB vectors for doc_id {doc_id}: {exc}")

        # 2. Remove physical file from disk
        file_path = Path(doc.file_path)
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError as exc:
                logger.warning(f"Could not delete physical file {file_path}: {exc}")

        # 3. Remove database row
        db.delete(doc)
        db.commit()
        logger.info(f"Deleted document '{doc.filename}' (ID: {doc_id}) from knowledge base.")
        return True

    def search_knowledge_base(
        self,
        query: str,
        n_results: int = 4,
        doc_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Search the knowledge base for relevant chunks."""
        return chroma_service.search(query=query, n_results=n_results, doc_ids=doc_ids)


document_service = DocumentService()

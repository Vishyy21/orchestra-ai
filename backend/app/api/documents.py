"""Documents & Knowledge Base API router for ORCHESTRA AI."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.rag.document_service import document_service
from app.rag.extractor import DocumentExtractionError
from app.schemas.document import DocumentRead

router = APIRouter(prefix="/documents", tags=["Knowledge Base"])


@router.get("", response_model=List[DocumentRead])
def list_documents(db: Session = Depends(get_db)):
    """GET /api/documents — List knowledge base documents."""
    docs = document_service.list_documents(db)
    return [DocumentRead.model_validate(d) for d in docs]


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """POST /api/documents/upload — Upload, extract, chunk, and index a document into ChromaDB."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required for document upload.",
        )
    try:
        doc = await document_service.save_and_index_file(db, file)
        return DocumentRead.model_validate(doc)
    except DocumentExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document extraction failed: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index document: {exc}",
        )


@router.get("/search")
def search_documents(
    query: str = Query(..., min_length=1, description="Semantic search query"),
    n_results: int = Query(4, ge=1, le=20, description="Max chunks to retrieve"),
):
    """GET /api/documents/search — Query indexed knowledge base vectors."""
    hits = document_service.search_knowledge_base(query=query, n_results=n_results)
    return {"query": query, "total_hits": len(hits), "results": hits}


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    """DELETE /api/documents/{doc_id} — Delete document and purge vector embeddings."""
    success = document_service.delete_document(db, doc_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found.",
        )
    return None

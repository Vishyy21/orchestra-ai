"""ChromaDB Vector Store Service for ORCHESTRA AI.

Provides persistent semantic vector storage under data/chroma.
Uses the local Sentence Transformers model all-MiniLM-L6-v2.
Preserves document ID, filename, page number, and chunk index.
Prevents duplicate indexing via clean document ID purging before upsert.
"""

from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
import chromadb
from app.config import settings

logger = logging.getLogger("orchestra.rag.chroma")


class ChromaService:
    """Reusable vector store service backed by ChromaDB and Sentence Transformers."""

    def __init__(
        self,
        persist_dir: Optional[Path] = None,
        collection_name: str = "orchestra_knowledge_base",
        embedding_model_name: str = "all-MiniLM-L6-v2",
    ):
        self.persist_dir = persist_dir or settings.chroma_dir
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.collection_name = collection_name
        self.embedding_model_name = embedding_model_name

        self._client: Optional[chromadb.PersistentClient] = None
        self._model: Any = None

    @property
    def client(self) -> chromadb.PersistentClient:
        """Lazy initialization of ChromaDB persistent client."""
        if self._client is None:
            self._client = chromadb.PersistentClient(path=str(self.persist_dir))
        return self._client

    @property
    def model(self) -> Any:
        """Lazy loading and caching of SentenceTransformer embedding model."""
        if self._model is None:
            logger.info(f"Loading local SentenceTransformer model: {self.embedding_model_name}")
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.embedding_model_name)
        return self._model

    def get_collection(self):
        """Get or create the persistent collection configured with cosine similarity."""
        return self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Compute 384-dimensional dense embeddings for a list of strings."""
        if not texts:
            return []
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()

    def index_chunks(
        self,
        doc_id: str,
        filename: str,
        chunks: List[Dict[str, Any]],
    ) -> int:
        """Index a list of document chunks into ChromaDB.
        
        Removes any existing vectors for the same doc_id to prevent duplicates.
        """
        if not chunks:
            return 0

        # Step 1: Remove existing chunks for this document if any (deduplication)
        self.delete_document_vectors(doc_id)

        collection = self.get_collection()

        texts = [c["content"] for c in chunks]
        ids = [c["chunk_id"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]

        # Step 2: Generate local dense embeddings
        embeddings = self.embed_texts(texts)

        # Step 3: Add to ChromaDB
        collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info(f"Indexed {len(chunks)} chunks for document '{filename}' (ID: {doc_id}) into ChromaDB.")
        return len(chunks)

    def compute_similarity(self, query: str, text: str) -> float:
        """Compute cosine similarity between query and candidate text using local embeddings.
        
        Range: [-1.0, 1.0]. Values >= 0.30 indicate semantic topical relevance.
        """
        if not query.strip() or not text.strip():
            return 0.0
        import numpy as np
        embeddings = self.model.encode([query, text], convert_to_numpy=True)
        v1, v2 = embeddings[0], embeddings[1]
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(v1, v2) / (norm1 * norm2))

    def search(
        self,
        query: str,
        n_results: int = 4,
        doc_ids: Optional[List[str]] = None,
        max_distance: Optional[float] = 0.82,
    ) -> List[Dict[str, Any]]:
        """Perform semantic similarity search against the indexed document chunks.
        
        Parameters:
        - query: Search string or natural language question
        - n_results: Number of top chunks to retrieve (default: 4)
        - doc_ids: Optional list of document IDs to scope search
        - max_distance: Maximum cosine distance cutoff (default: 0.82). Chunks further
          away are excluded to prevent unrelated/fabricated document references.
        
        Returns:
        List of matching chunks with document metadata and distance.
        """
        if not query.strip():
            return []

        collection = self.get_collection()
        total_items = collection.count()
        if total_items == 0:
            return []

        # Cap n_results to total available items
        fetch_k = min(n_results, total_items)

        query_emb = self.embed_texts([query])
        where_filter = None
        if doc_ids:
            if len(doc_ids) == 1:
                where_filter = {"doc_id": doc_ids[0]}
            else:
                where_filter = {"doc_id": {"$in": doc_ids}}

        kwargs: Dict[str, Any] = {
            "query_embeddings": query_emb,
            "n_results": fetch_k,
        }
        if where_filter:
            kwargs["where"] = where_filter

        try:
            results = collection.query(**kwargs)
        except Exception as exc:
            logger.error(f"ChromaDB search query failed: {exc}")
            return []

        hits: List[Dict[str, Any]] = []
        if not results or not results.get("ids") or not results["ids"][0]:
            return hits

        for i in range(len(results["ids"][0])):
            chunk_id = results["ids"][0][i]
            content = results["documents"][0][i] if results.get("documents") else ""
            metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
            distance = results["distances"][0][i] if results.get("distances") else 0.0

            # Exclude chunks exceeding maximum cosine distance threshold
            if max_distance is not None and distance > max_distance:
                logger.debug(
                    f"Excluding chunk {chunk_id} with distance {distance:.4f} > {max_distance}"
                )
                continue

            hits.append({
                "chunk_id": chunk_id,
                "content": content,
                "filename": metadata.get("filename", "Unknown Document"),
                "page_number": metadata.get("page_number", 1),
                "doc_id": metadata.get("doc_id", ""),
                "chunk_index": metadata.get("chunk_index", 0),
                "distance": distance,
            })

        return hits

    def delete_document_vectors(self, doc_id: str) -> bool:
        """Purge all vector embeddings associated with a document ID."""
        collection = self.get_collection()
        try:
            # Query if document chunks exist before attempting deletion
            existing = collection.get(where={"doc_id": doc_id})
            if existing and existing.get("ids"):
                collection.delete(where={"doc_id": doc_id})
                logger.info(f"Deleted {len(existing['ids'])} vectors for doc_id '{doc_id}' from ChromaDB.")
            return True
        except Exception as exc:
            logger.warning(f"Error purging vectors for doc_id '{doc_id}': {exc}")
            return False

    def count(self) -> int:
        """Return total chunks currently indexed in ChromaDB."""
        return self.get_collection().count()


# Global singleton service instance
chroma_service = ChromaService()

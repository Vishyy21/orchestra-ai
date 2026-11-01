"""Document extraction and text chunking engine for ORCHESTRA AI.

Supports PDF (via pypdf), plain text (.txt), and Markdown (.md).
Configurable chunking preserving page numbers and document IDs.
"""

import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger("orchestra.rag.extractor")


class DocumentExtractionError(Exception):
    """Raised when document extraction fails due to format, corruption, or empty content."""
    pass


@dataclass
class ExtractedPage:
    """Represents text extracted from a document page or section."""
    page_number: int
    text: str


def extract_text_from_file(file_path: Path) -> List[ExtractedPage]:
    """Extract readable text from a supported file format.
    
    Supports:
    - PDF (.pdf) via pypdf
    - Plain text (.txt)
    - Markdown (.md)
    """
    if not file_path.exists():
        raise DocumentExtractionError(f"File not found: {file_path}")

    if file_path.stat().st_size == 0:
        raise DocumentExtractionError("File is empty (0 bytes).")

    ext = file_path.suffix.lower()

    if ext == ".pdf":
        return _extract_pdf(file_path)
    elif ext in [".txt", ".md", ".markdown"]:
        return _extract_plain_text(file_path)
    else:
        # Fallback: attempt plain text read if format might be textual
        try:
            return _extract_plain_text(file_path)
        except Exception:
            raise DocumentExtractionError(
                f"Unsupported document format '{ext}'. Supported formats: .pdf, .txt, .md"
            )


def _extract_pdf(file_path: Path) -> List[ExtractedPage]:
    """Extract text from PDF pages using pypdf."""
    try:
        import pypdf
    except ImportError as e:
        raise DocumentExtractionError("pypdf is required for PDF extraction but is not installed.") from e

    try:
        reader = pypdf.PdfReader(str(file_path))
    except Exception as exc:
        raise DocumentExtractionError(f"Failed to parse PDF file (corrupted or invalid format): {exc}") from exc

    if reader.is_encrypted:
        try:
            # Attempt empty password decryption
            decrypted = reader.decrypt("")
            if decrypted == 0:
                raise DocumentExtractionError("PDF is password-protected or encrypted.")
        except Exception as exc:
            raise DocumentExtractionError(f"PDF is encrypted and cannot be read: {exc}") from exc

    pages: List[ExtractedPage] = []
    total_text = ""

    for i, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            logger.warning(f"Failed to extract text from PDF page {i}: {exc}")
            text = ""
        clean_text = text.strip()
        if clean_text:
            pages.append(ExtractedPage(page_number=i, text=clean_text))
            total_text += clean_text

    if not pages or not total_text.strip():
        raise DocumentExtractionError(
            "PDF contains no extractable text. Scanned image-only PDFs require OCR."
        )

    return pages


def _extract_plain_text(file_path: Path) -> List[ExtractedPage]:
    """Extract text from plain text or markdown files."""
    content = ""
    for encoding in ["utf-8", "utf-8-sig", "latin-1"]:
        try:
            with open(file_path, "r", encoding=encoding) as f:
                content = f.read()
            break
        except UnicodeDecodeError:
            continue

    clean_text = content.strip()
    if not clean_text:
        raise DocumentExtractionError("Document contains no text or is empty.")

    return [ExtractedPage(page_number=1, text=clean_text)]


def chunk_text(
    pages: List[ExtractedPage],
    doc_id: str,
    filename: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> List[Dict[str, Any]]:
    """Chunk extracted pages into semantic segments preserving metadata.
    
    Parameters:
    - pages: List of ExtractedPage objects
    - doc_id: SQLite Document ID
    - filename: Original document filename
    - chunk_size: Approximate maximum characters per chunk (default: 500)
    - chunk_overlap: Character overlap between consecutive chunks (default: 50)
    
    Returns:
    List of chunk dictionaries with content, chunk_id, and metadata.
    """
    if chunk_size <= chunk_overlap:
        raise ValueError("chunk_size must be strictly greater than chunk_overlap.")

    chunks: List[Dict[str, Any]] = []
    global_index = 0

    for page in pages:
        text = page.text
        if not text:
            continue

        start = 0
        text_length = len(text)

        while start < text_length:
            end = start + chunk_size

            # If not at the end of text, attempt to break at a sentence or word boundary
            if end < text_length:
                boundary = _find_natural_break(text, start, end)
                if boundary > start:
                    end = boundary

            chunk_content = text[start:end].strip()

            if chunk_content:
                chunks.append({
                    "chunk_id": f"{doc_id}_p{page.page_number}_c{global_index}",
                    "content": chunk_content,
                    "metadata": {
                        "doc_id": doc_id,
                        "filename": filename,
                        "page_number": page.page_number,
                        "chunk_index": global_index,
                        "char_count": len(chunk_content),
                    },
                })
                global_index += 1

            if end >= text_length:
                break

            # Slide window by (chunk_size - overlap)
            start = max(start + 1, end - chunk_overlap)

    return chunks


def _find_natural_break(text: str, start: int, end: int) -> int:
    """Find a sentence or paragraph break near the end of the chunk window."""
    # Look back up to 80 characters for a sentence boundary ('. ', '\n\n', '\n', '? ', '! ')
    window_start = max(start, end - 80)
    search_window = text[window_start:end]

    for punct in ["\n\n", ".\n", ". ", "?\n", "? ", "!\n", "! ", "\n"]:
        pos = search_window.rfind(punct)
        if pos != -1:
            return window_start + pos + len(punct)

    # Fall back to last space
    space_pos = search_window.rfind(" ")
    if space_pos != -1:
        return window_start + space_pos + 1

    return end

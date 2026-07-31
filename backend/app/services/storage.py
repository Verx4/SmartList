import hashlib
import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import StoredBlob

settings = get_settings()

ALLOWED_EXTENSIONS = {
    "excel": {".xlsx", ".xlsm", ".csv"},
    "template": {".pptx"},
    "image": {".png", ".jpg", ".jpeg"},
    "prevision_export": {".xlsx", ".xlsm", ".csv", ".pdf"},
}


@dataclass
class StoredFile:
    storage_key: str
    absolute_path: Path
    original_filename: str
    content_type: str
    size_bytes: int
    sha256: str


def safe_filename(filename: str) -> str:
    base = Path(filename).name
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(base).stem).strip("._")
    extension = Path(base).suffix.lower()
    return f"{stem[:120] or 'arquivo'}{extension}"


def resolve_private_path(storage_key: str) -> Path:
    root = settings.private_storage_path.resolve()
    candidate = (root / storage_key).resolve()
    if root != candidate and root not in candidate.parents:
        raise HTTPException(status_code=400, detail="Caminho de arquivo inválido.")
    return candidate


async def save_upload(upload: UploadFile, kind: str) -> StoredFile:
    filename = safe_filename(upload.filename or "arquivo")
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS.get(kind, set()):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Formato {extension or 'sem extensão'} não permitido para {kind}.",
        )

    storage_key = f"uploads/{kind}/{uuid.uuid4().hex}/{filename}"
    destination = resolve_private_path(storage_key)
    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    size = 0

    try:
        with destination.open("xb") as target:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_file_size_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Arquivo excede o limite de {settings.max_file_size_mb} MB.",
                    )
                digest.update(chunk)
                target.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()

    return StoredFile(
        storage_key=storage_key,
        absolute_path=destination,
        original_filename=filename,
        content_type=upload.content_type or "application/octet-stream",
        size_bytes=size,
        sha256=digest.hexdigest(),
    )


def output_path(filename: str) -> tuple[str, Path]:
    storage_key = f"generated/{uuid.uuid4().hex}/{safe_filename(filename)}"
    path = resolve_private_path(storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    return storage_key, path


def persist_file(
    db: Session,
    storage_key: str,
    path: Path,
    content_type: str = "application/octet-stream",
) -> None:
    """Keep a database copy so files survive an ephemeral server restart."""
    content = path.read_bytes()
    record = db.get(StoredBlob, storage_key)
    if record is None:
        record = StoredBlob(
            storage_key=storage_key,
            content=content,
            content_type=content_type,
            size_bytes=len(content),
        )
        db.add(record)
    else:
        record.content = content
        record.content_type = content_type
        record.size_bytes = len(content)


def ensure_local_file(db: Session, storage_key: str) -> Path:
    """Restore a database-backed file to the temporary local workspace."""
    path = resolve_private_path(storage_key)
    if path.is_file():
        return path
    record = db.get(StoredBlob, storage_key)
    if record is None:
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(record.content)
    return path


def delete_stored_file(db: Session, storage_key: str) -> None:
    resolve_private_path(storage_key).unlink(missing_ok=True)
    record = db.get(StoredBlob, storage_key)
    if record is not None:
        db.delete(record)

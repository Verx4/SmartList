from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import (
    AuditLog,
    Project,
    Upload,
    UploadKind,
    User,
    UserRole,
)
from app.schemas.contracts import SavedExcelRead, UploadRead
from app.services.excel import analyze_workbook, validate_workbook_compatibility
from app.services.storage import (
    delete_stored_file,
    ensure_local_file,
    persist_file,
    save_upload,
)

router = APIRouter()


def excel_is_deleted(upload: Upload) -> bool:
    return bool((upload.analysis or {}).get("deleted_at"))


@router.get("/excel/saved", response_model=list[SavedExcelRead])
def list_saved_excels(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SavedExcelRead]:
    rows = db.execute(
        select(Upload, Project)
        .join(Project, Upload.project_id == Project.id)
        .where(
            Upload.kind == UploadKind.EXCEL,
            Upload.uploaded_by_id == user.id,
        )
        .order_by(Upload.created_at.desc())
    ).all()
    return [
        SavedExcelRead(
            id=upload.id,
            project_id=upload.project_id,
            project_name=project.name,
            original_filename=upload.original_filename,
            content_type=upload.content_type,
            size_bytes=upload.size_bytes,
            detected_reference_month=(upload.analysis or {}).get(
                "detected_reference_month"
            ),
            created_at=upload.created_at,
        )
        for upload, project in rows
        if not excel_is_deleted(upload)
    ]


def get_accessible_excel(upload_id: str, db: Session, user: User) -> Upload:
    upload = db.get(Upload, upload_id)
    if not upload or upload.kind != UploadKind.EXCEL or excel_is_deleted(upload):
        raise HTTPException(status_code=404, detail="Excel não encontrado.")
    if upload.uploaded_by_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Excel pertence a outro usuário.")
    return upload


@router.get("/excel/{upload_id}/download")
def download_saved_excel(
    upload_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    upload = get_accessible_excel(upload_id, db, user)
    path = ensure_local_file(db, upload.storage_key)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo Excel não encontrado.")
    return FileResponse(
        path,
        media_type=upload.content_type,
        filename=upload.original_filename,
    )


def soft_delete_excel(upload: Upload, db: Session) -> None:
    delete_stored_file(db, upload.storage_key)
    upload.analysis = {
        **(upload.analysis or {}),
        "deleted_at": datetime.now(timezone.utc).isoformat(),
    }


@router.delete("/excel", status_code=status.HTTP_204_NO_CONTENT)
def clear_saved_excels(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    uploads = list(
        db.scalars(
            select(Upload).where(
                Upload.kind == UploadKind.EXCEL,
                Upload.uploaded_by_id == user.id,
            )
        )
    )
    active_uploads = [upload for upload in uploads if not excel_is_deleted(upload)]
    for upload in active_uploads:
        soft_delete_excel(upload, db)
    db.add(
        AuditLog(
            user_id=user.id,
            action="excels.cleared",
            entity_type="upload",
            details={"count": len(active_uploads)},
        )
    )
    db.commit()


@router.delete("/excel/{upload_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_excel(
    upload_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    upload = get_accessible_excel(upload_id, db, user)
    soft_delete_excel(upload, db)
    db.add(
        AuditLog(
            user_id=user.id,
            action="excel.deleted",
            entity_type="upload",
            entity_id=upload.id,
            details={"filename": upload.original_filename},
        )
    )
    db.commit()


@router.post("/excel", response_model=UploadRead, status_code=status.HTTP_201_CREATED)
async def upload_excel(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ENGINEERING)
    ),
) -> Upload:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Obra não encontrada.")
    stored = await save_upload(file, "excel")
    if stored.absolute_path.suffix.lower() == ".csv":
        analysis = {
            "sheet_count": 1,
            "sheets": [
                {
                    "name": "CSV",
                    "dimensions": "arquivo delimitado",
                    "preview": [],
                    "message": "Selecione colunas manualmente no mapeamento.",
                }
            ],
        }
    else:
        try:
            analysis = analyze_workbook(stored.absolute_path)
        except Exception as exc:
            stored.absolute_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=422,
                detail=f"Não foi possível ler a planilha: {exc}",
            ) from exc

    compatibility_issues = (
        ["O modelo selecionado exige um arquivo Excel com abas estruturadas."]
        if stored.absolute_path.suffix.lower() == ".csv"
        and (project.custom_rules or {}).get("excel_validation")
        else validate_workbook_compatibility(
            stored.absolute_path,
            project.custom_rules,
            strict_identity=False,
        )
    )
    if (
        (project.custom_rules or {})
        .get("excel_validation", {})
        .get("reference_month_required")
        and not analysis.get("detected_reference_month")
    ):
        compatibility_issues.append(
            "Não foi possível identificar automaticamente o último mês com valor realizado."
        )
    if compatibility_issues:
        stored.absolute_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "Este Excel não corresponde à obra e ao modelo selecionados. "
                    "Escolha a obra correta ou cadastre o modelo específico dessa planilha."
                ),
                "issues": compatibility_issues,
            },
        )

    identity_warnings = validate_workbook_compatibility(
        stored.absolute_path,
        project.custom_rules,
        strict_identity=True,
    )
    if identity_warnings:
        analysis["compatibility_warnings"] = identity_warnings
        analysis["layout_project"] = project.name

    record = Upload(
        project_id=project_id,
        uploaded_by_id=user.id,
        kind=UploadKind.EXCEL,
        original_filename=stored.original_filename,
        storage_key=stored.storage_key,
        content_type=stored.content_type,
        size_bytes=stored.size_bytes,
        sha256=stored.sha256,
        analysis=analysis,
    )
    db.add(record)
    db.flush()
    persist_file(db, stored.storage_key, stored.absolute_path, stored.content_type)
    db.add(
        AuditLog(
            user_id=user.id,
            action="excel.uploaded",
            entity_type="upload",
            entity_id=record.id,
            details={
                "filename": stored.original_filename,
                "sha256": stored.sha256,
                "sheets": [sheet["name"] for sheet in analysis["sheets"]],
                "detected_project": analysis.get("detected_project"),
                "compatibility_warnings": analysis.get("compatibility_warnings", []),
            },
        )
    )
    db.commit()
    db.refresh(record)
    return record

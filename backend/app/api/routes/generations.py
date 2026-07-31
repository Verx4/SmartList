from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import (
    AuditLog,
    Generation,
    GenerationStatus,
    Project,
    SlideMapping,
    Template,
    Upload,
    User,
    UserRole,
)
from app.schemas.contracts import (
    GenerationCreate,
    GenerationRead,
    SavedPresentationRead,
)
from app.services.excel import validate_reference_month, validate_workbook_compatibility
from app.services.powerpoint import generate_presentation
from app.services.storage import (
    delete_stored_file,
    ensure_local_file,
    output_path,
    persist_file,
)

router = APIRouter()

MONTH_NAMES = (
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
)


@router.get("", response_model=list[GenerationRead])
def list_generations(
    project_id: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Generation]:
    query = (
        select(Generation)
        .where(Generation.created_by_id == user.id)
        .order_by(Generation.created_at.desc())
    )
    if project_id:
        query = query.where(Generation.project_id == project_id)
    return list(db.scalars(query.limit(100)))


@router.get("/saved", response_model=list[SavedPresentationRead])
def list_saved_presentations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SavedPresentationRead]:
    rows = db.execute(
        select(Generation, Project, Template, Upload)
        .join(Project, Generation.project_id == Project.id)
        .join(Template, Generation.template_id == Template.id)
        .join(Upload, Generation.excel_upload_id == Upload.id)
        .where(
            Generation.created_by_id == user.id,
            Generation.output_storage_key.is_not(None),
        )
        .order_by(Generation.created_at.desc())
    ).all()
    return [
        SavedPresentationRead(
            id=generation.id,
            project_name=project.name,
            template_name=template.name,
            excel_filename=upload.original_filename,
            reference_month=generation.reference_month,
            status=generation.status,
            warning_count=len(generation.warnings or []),
            has_powerpoint=bool(generation.output_storage_key),
            has_report=bool(generation.report_storage_key),
            created_at=generation.created_at,
        )
        for generation, project, template, upload in rows
    ]


def remove_generation_files(generation: Generation, db: Session) -> None:
    for storage_key in (
        generation.output_storage_key,
        generation.report_storage_key,
    ):
        if storage_key:
            delete_stored_file(db, storage_key)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_saved_presentations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    generations = list(
        db.scalars(
            select(Generation).where(Generation.created_by_id == user.id)
        )
    )
    for generation in generations:
        remove_generation_files(generation, db)
        db.delete(generation)
    db.add(
        AuditLog(
            user_id=user.id,
            action="presentations.cleared",
            entity_type="generation",
            details={"count": len(generations)},
        )
    )
    db.commit()


@router.post("", response_model=GenerationRead, status_code=status.HTTP_201_CREATED)
def create_generation(
    payload: GenerationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ENGINEERING)
    ),
) -> Generation:
    project = db.get(Project, payload.project_id)
    template = db.get(Template, payload.template_id)
    upload = db.get(Upload, payload.excel_upload_id)
    if not project or not template or not upload:
        raise HTTPException(
            status_code=404,
            detail="Obra, modelo ou planilha não encontrado.",
        )
    if template.project_id and template.project_id != project.id:
        raise HTTPException(status_code=409, detail="Modelo não pertence à obra informada.")
    if upload.project_id and upload.project_id != project.id:
        raise HTTPException(status_code=409, detail="Planilha não pertence à obra informada.")
    if upload.uploaded_by_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Planilha pertence a outro usuário.")
    if (upload.analysis or {}).get("deleted_at") or not ensure_local_file(
        db, upload.storage_key
    ).is_file():
        raise HTTPException(
            status_code=409,
            detail="A planilha foi removida dos Excel salvos. Envie o arquivo novamente.",
        )

    compatibility_issues = validate_workbook_compatibility(
        ensure_local_file(db, upload.storage_key),
        project.custom_rules,
        strict_identity=False,
    )
    if compatibility_issues:
        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "Este Excel não corresponde à obra e ao modelo selecionados. "
                    "A apresentação não foi gerada para evitar dados incorretos."
                ),
                "issues": compatibility_issues,
            },
        )

    month_issues = validate_reference_month(
        ensure_local_file(db, upload.storage_key),
        payload.reference_month,
    )
    if month_issues:
        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "O mês informado não corresponde aos dados realizados no Excel. "
                    "Confirme o período antes de gerar a apresentação."
                ),
                "issues": month_issues,
            },
        )

    mappings = list(
        db.scalars(
            select(SlideMapping)
            .where(SlideMapping.template_id == template.id)
            .order_by(SlideMapping.slide_number)
        )
    )
    if not mappings:
        raise HTTPException(
            status_code=409,
            detail="O modelo ainda não possui mapeamentos.",
        )
    review_fields = [item.target_ref for item in mappings if item.requires_review]
    if review_fields and not payload.confirm_warnings:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Existem campos que exigem revisão manual.",
                "fields": review_fields,
            },
        )

    generation = Generation(
        project_id=project.id,
        template_id=template.id,
        excel_upload_id=upload.id,
        created_by_id=user.id,
        reference_month=payload.reference_month,
        status=GenerationStatus.PROCESSING,
        mapping_version=template.version,
        data_sources=["excel"],
    )
    if payload.manual_values:
        generation.data_sources = ["excel", "manual"]
    db.add(generation)
    db.commit()
    db.refresh(generation)

    safe_project = "".join(character if character.isalnum() else "_" for character in project.code)
    output_key, output_file = output_path(
        f"{safe_project}_{payload.reference_month}.pptx"
    )
    report_key, report_file = output_path(
        f"{safe_project}_{payload.reference_month}_alteracoes.json"
    )

    try:
        reference_date = datetime.strptime(payload.reference_month, "%Y-%m")
        month_name = MONTH_NAMES[reference_date.month - 1]
        manual_values = dict(payload.manual_values)
        manual_values.setdefault(
            "TextBox 7|p2|r1",
            f"{month_name.upper()}/{reference_date:%Y}",
        )
        manual_values.setdefault(
            "TextBox 98|p1|r1",
            f"Mês de Referência: {month_name[:3].title()}/{reference_date:%y}",
        )
        report = generate_presentation(
            template_path=ensure_local_file(db, template.storage_key),
            excel_path=ensure_local_file(db, upload.storage_key),
            output_path=output_file,
            report_path=report_file,
            mappings=mappings,
            protected_slides=set(template.protected_slides),
            manual_values=manual_values,
            reference_month=payload.reference_month,
            layout_only=bool((upload.analysis or {}).get("compatibility_warnings")),
        )
        generation.output_storage_key = output_key
        generation.report_storage_key = report_key
        persist_file(
            db,
            output_key,
            output_file,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
        persist_file(db, report_key, report_file, "application/json")
        generation.warnings = report["warnings"]
        generation.status = (
            GenerationStatus.REVIEW
            if report["warnings"]
            else GenerationStatus.COMPLETED
        )
        db.add(
            AuditLog(
                user_id=user.id,
                action="presentation.generated",
                entity_type="generation",
                entity_id=generation.id,
                details={
                    "changed_slides": report["changed_slides"],
                    "protected_slides": report["protected_slides"],
                    "warning_count": len(report["warnings"]),
                },
            )
        )
    except Exception as exc:
        output_file.unlink(missing_ok=True)
        report_file.unlink(missing_ok=True)
        generation.status = GenerationStatus.FAILED
        generation.error_message = str(exc)
    db.commit()
    db.refresh(generation)
    return generation


def download_file(
    generation_id: str,
    storage_field: str,
    media_type: str,
    suffix: str,
    db: Session,
    user: User,
) -> FileResponse:
    generation = db.get(Generation, generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail="Geração não encontrada.")
    if generation.created_by_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Arquivo pertence a outro usuário.")
    storage_key = getattr(generation, storage_field)
    if not storage_key:
        raise HTTPException(status_code=409, detail="Arquivo ainda não disponível.")
    path = ensure_local_file(db, storage_key)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no armazenamento.")
    return FileResponse(
        path,
        media_type=media_type,
        filename=f"engenharia-slides-{generation.reference_month}{suffix}",
    )


@router.get("/{generation_id}/download")
def download_presentation(
    generation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    return download_file(
        generation_id,
        "output_storage_key",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".pptx",
        db,
        user,
    )


@router.get("/{generation_id}/report")
def download_report(
    generation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    return download_file(
        generation_id,
        "report_storage_key",
        "application/json",
        "-alteracoes.json",
        db,
        user,
    )


@router.delete("/{generation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_presentation(
    generation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    generation = db.get(Generation, generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail="Apresentação não encontrada.")
    if generation.created_by_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apresentação pertence a outro usuário.")
    remove_generation_files(generation, db)
    db.add(
        AuditLog(
            user_id=user.id,
            action="presentation.deleted",
            entity_type="generation",
            entity_id=generation.id,
            details={"reference_month": generation.reference_month},
        )
    )
    db.delete(generation)
    db.commit()

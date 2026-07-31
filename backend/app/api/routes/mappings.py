from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import (
    AuditLog,
    SlideMapping,
    Template,
    User,
    UserRole,
)
from app.schemas.contracts import SlideMappingCreate, SlideMappingRead

router = APIRouter()


@router.get("/template/{template_id}", response_model=list[SlideMappingRead])
def list_mappings(
    template_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[SlideMapping]:
    return list(
        db.scalars(
            select(SlideMapping)
            .where(SlideMapping.template_id == template_id)
            .order_by(SlideMapping.slide_number, SlideMapping.created_at)
        )
    )


@router.post(
    "/template/{template_id}",
    response_model=SlideMappingRead,
    status_code=status.HTTP_201_CREATED,
)
def create_mapping(
    template_id: str,
    payload: SlideMappingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
) -> SlideMapping:
    template = db.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")
    if payload.slide_number in template.protected_slides:
        raise HTTPException(
            status_code=409,
            detail="Não é possível mapear um slide protegido.",
        )
    mapping = SlideMapping(template_id=template_id, **payload.model_dump())
    db.add(mapping)
    db.flush()
    db.add(
        AuditLog(
            user_id=user.id,
            action="mapping.created",
            entity_type="slide_mapping",
            entity_id=mapping.id,
            details={
                "slide_number": mapping.slide_number,
                "target": mapping.target_ref,
            },
        )
    )
    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/{mapping_id}", status_code=204)
def delete_mapping(
    mapping_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    mapping = db.get(SlideMapping, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapeamento não encontrado.")
    db.add(
        AuditLog(
            user_id=user.id,
            action="mapping.deleted",
            entity_type="slide_mapping",
            entity_id=mapping.id,
            details={
                "slide_number": mapping.slide_number,
                "target": mapping.target_ref,
            },
        )
    )
    db.delete(mapping)
    db.commit()

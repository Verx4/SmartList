from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import AuditLog, Project, Template, User, UserRole
from app.schemas.contracts import ProtectedSlidesUpdate, TemplateRead
from app.services.storage import persist_file, save_upload

router = APIRouter()


@router.get("", response_model=list[TemplateRead])
def list_templates(
    project_id: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Template]:
    query = select(Template).order_by(Template.created_at.desc())
    if project_id:
        query = query.where(Template.project_id == project_id)
    return list(db.scalars(query))


@router.post("", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
async def upload_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    project_id: str | None = Form(default=None),
    protected_slides: str = Form(default=""),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
) -> Template:
    if project_id and not db.get(Project, project_id):
        raise HTTPException(status_code=404, detail="Obra não encontrada.")
    parsed_slides = sorted(
        {
            int(item.strip())
            for item in protected_slides.split(",")
            if item.strip().isdigit() and int(item.strip()) > 0
        }
    )
    stored = await save_upload(file, "template")
    current_version = db.scalar(
        select(Template.version)
        .where(Template.project_id == project_id)
        .order_by(Template.version.desc())
        .limit(1)
    )
    template = Template(
        project_id=project_id,
        name=name,
        original_filename=stored.original_filename,
        storage_key=stored.storage_key,
        version=(current_version or 0) + 1,
        protected_slides=parsed_slides,
    )
    db.add(template)
    db.flush()
    persist_file(db, stored.storage_key, stored.absolute_path, stored.content_type)
    db.add(
        AuditLog(
            user_id=user.id,
            action="template.uploaded",
            entity_type="template",
            entity_id=template.id,
            details={
                "filename": stored.original_filename,
                "protected_slides": parsed_slides,
            },
        )
    )
    db.commit()
    db.refresh(template)
    return template


@router.put("/{template_id}/protected-slides", response_model=TemplateRead)
def update_protected_slides(
    template_id: str,
    payload: ProtectedSlidesUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN)),
) -> Template:
    template = db.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")
    slides = sorted({slide for slide in payload.protected_slides if slide > 0})
    previous = template.protected_slides
    template.protected_slides = slides
    db.add(
        AuditLog(
            user_id=user.id,
            action="template.protected_slides.updated",
            entity_type="template",
            entity_id=template.id,
            details={"previous": previous, "new": slides},
        )
    )
    db.commit()
    db.refresh(template)
    return template

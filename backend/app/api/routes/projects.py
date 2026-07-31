from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import AuditLog, Project, User, UserRole
from app.schemas.contracts import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter()


@router.get("", response_model=list[ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.name)))


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ENGINEERING)
    ),
) -> Project:
    if db.scalar(select(Project).where(Project.code == payload.code)):
        raise HTTPException(status_code=409, detail="Código de obra já cadastrado.")
    project = Project(**payload.model_dump())
    db.add(project)
    db.flush()
    db.add(
        AuditLog(
            user_id=user.id,
            action="project.created",
            entity_type="project",
            entity_id=project.id,
            details={"code": project.code},
        )
    )
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.ENGINEERING)
    ),
) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Obra não encontrada.")
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(project, field, value)
    db.add(
        AuditLog(
            user_id=user.id,
            action="project.updated",
            entity_type="project",
            entity_id=project.id,
            details={"fields": sorted(changes)},
        )
    )
    db.commit()
    db.refresh(project)
    return project

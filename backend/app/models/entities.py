from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def new_id() -> str:
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ENGINEERING = "engineering"
    VIEWER = "viewer"


class UploadKind(str, enum.Enum):
    EXCEL = "excel"
    TEMPLATE = "template"
    IMAGE = "image"
    PREVISION_EXPORT = "prevision_export"


class GenerationStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    REVIEW = "review"
    COMPLETED = "completed"
    FAILED = "failed"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False), default=UserRole.ENGINEERING, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    generations: Mapped[list[Generation]] = relationship(back_populates="created_by")


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    company: Mapped[str] = mapped_column(String(180), nullable=False)
    client: Mapped[str] = mapped_column(String(180), nullable=False)
    manager: Mapped[str] = mapped_column(String(180), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    expected_end_date: Mapped[date | None] = mapped_column(Date)
    towers: Mapped[int | None] = mapped_column(Integer)
    units: Mapped[int | None] = mapped_column(Integer)
    custom_rules: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    templates: Mapped[list[Template]] = relationship(back_populates="project")
    generations: Mapped[list[Generation]] = relationship(back_populates="project")


class Template(TimestampMixin, Base):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    protected_slides: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    project: Mapped[Project | None] = relationship(back_populates="templates")
    mappings: Mapped[list[SlideMapping]] = relationship(
        back_populates="template", cascade="all, delete-orphan"
    )
    generations: Mapped[list[Generation]] = relationship(back_populates="template")


class SlideMapping(TimestampMixin, Base):
    __tablename__ = "slide_mappings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    template_id: Mapped[str] = mapped_column(
        ForeignKey("templates.id", ondelete="CASCADE"), index=True, nullable=False
    )
    slide_number: Mapped[int] = mapped_column(Integer, nullable=False)
    purpose: Mapped[str] = mapped_column(String(180), nullable=False)
    source_type: Mapped[str] = mapped_column(String(40), default="excel", nullable=False)
    source_ref: Mapped[str | None] = mapped_column(String(255))
    api_field: Mapped[str | None] = mapped_column(String(255))
    target_kind: Mapped[str] = mapped_column(String(40), default="placeholder", nullable=False)
    target_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(40), default="text", nullable=False)
    format_rule: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    requires_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    template: Mapped[Template] = relationship(back_populates="mappings")


class Upload(TimestampMixin, Base):
    __tablename__ = "uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    uploaded_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    kind: Mapped[UploadKind] = mapped_column(Enum(UploadKind, native_enum=False), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    content_type: Mapped[str] = mapped_column(String(160), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    analysis: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)


class Generation(TimestampMixin, Base):
    __tablename__ = "generations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    template_id: Mapped[str] = mapped_column(ForeignKey("templates.id"), nullable=False)
    excel_upload_id: Mapped[str] = mapped_column(ForeignKey("uploads.id"), nullable=False)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    reference_month: Mapped[str] = mapped_column(String(7), index=True, nullable=False)
    status: Mapped[GenerationStatus] = mapped_column(
        Enum(GenerationStatus, native_enum=False),
        default=GenerationStatus.PENDING,
        nullable=False,
    )
    output_storage_key: Mapped[str | None] = mapped_column(String(512))
    report_storage_key: Mapped[str | None] = mapped_column(String(512))
    mapping_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    data_sources: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    warnings: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)

    project: Mapped[Project] = relationship(back_populates="generations")
    template: Mapped[Template] = relationship(back_populates="generations")
    created_by: Mapped[User] = relationship(back_populates="generations")


class Integration(TimestampMixin, Base):
    __tablename__ = "integrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String(80), default="prevision", nullable=False)
    external_project_id: Mapped[str | None] = mapped_column(String(255))
    encrypted_credential: Mapped[str | None] = mapped_column(Text)
    credential_hint: Mapped[str | None] = mapped_column(String(32))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(36))
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class StoredBlob(Base):
    """CÃ³pia persistente dos arquivos para ambientes com disco temporÃ¡rio."""

    __tablename__ = "stored_blobs"

    storage_key: Mapped[str] = mapped_column(String(512), primary_key=True)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    content_type: Mapped[str] = mapped_column(String(160), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

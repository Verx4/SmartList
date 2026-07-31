from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.entities import GenerationStatus, UserRole


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserRead(ORMModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool


class AuthResponse(BaseModel):
    user: UserRead
    token_type: str = "cookie"
    expires_in: int


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    code: str = Field(min_length=2, max_length=80)
    company: str = Field(min_length=2, max_length=180)
    client: str = Field(min_length=2, max_length=180)
    manager: str = Field(min_length=2, max_length=180)
    start_date: date | None = None
    expected_end_date: date | None = None
    towers: int | None = Field(default=None, ge=0)
    units: int | None = Field(default=None, ge=0)
    custom_rules: dict[str, Any] = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    company: str | None = None
    client: str | None = None
    manager: str | None = None
    start_date: date | None = None
    expected_end_date: date | None = None
    towers: int | None = Field(default=None, ge=0)
    units: int | None = Field(default=None, ge=0)
    custom_rules: dict[str, Any] | None = None
    is_active: bool | None = None


class ProjectRead(ORMModel):
    id: str
    name: str
    code: str
    company: str
    client: str
    manager: str
    start_date: date | None
    expected_end_date: date | None
    towers: int | None
    units: int | None
    custom_rules: dict[str, Any]
    is_active: bool
    created_at: datetime


class TemplateRead(ORMModel):
    id: str
    project_id: str | None
    name: str
    original_filename: str
    version: int
    protected_slides: list[int]
    is_active: bool
    created_at: datetime


class ProtectedSlidesUpdate(BaseModel):
    protected_slides: list[int] = Field(default_factory=list)


class SlideMappingCreate(BaseModel):
    slide_number: int = Field(ge=1)
    purpose: str = Field(min_length=2, max_length=180)
    source_type: str = Field(default="excel", pattern="^(excel|manual|prevision)$")
    source_ref: str | None = None
    api_field: str | None = None
    target_kind: str = Field(
        default="placeholder",
        pattern="^(placeholder|shape_name|shape_run|table_cell|image_shape)$",
    )
    target_ref: str = Field(min_length=2, max_length=255)
    content_type: str = Field(
        default="text",
        pattern="^(text|integer|decimal|currency|percentage|date|table|chart|image|description)$",
    )
    format_rule: dict[str, Any] = Field(default_factory=dict)
    requires_review: bool = False


class SlideMappingRead(SlideMappingCreate, ORMModel):
    id: str
    template_id: str
    created_at: datetime


class UploadRead(ORMModel):
    id: str
    project_id: str | None
    kind: str
    original_filename: str
    content_type: str
    size_bytes: int
    sha256: str
    analysis: dict[str, Any]
    created_at: datetime


class SavedExcelRead(BaseModel):
    id: str
    project_id: str | None
    project_name: str
    original_filename: str
    content_type: str
    size_bytes: int
    detected_reference_month: str | None
    created_at: datetime


class GenerationCreate(BaseModel):
    project_id: str
    template_id: str
    excel_upload_id: str
    reference_month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    manual_values: dict[str, Any] = Field(default_factory=dict)
    confirm_warnings: bool = False


class GenerationRead(ORMModel):
    id: str
    project_id: str
    template_id: str
    excel_upload_id: str
    created_by_id: str
    reference_month: str
    status: GenerationStatus
    mapping_version: int
    data_sources: list[str]
    warnings: list[dict[str, Any]]
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class SavedPresentationRead(BaseModel):
    id: str
    project_name: str
    template_name: str
    excel_filename: str
    reference_month: str
    status: GenerationStatus
    warning_count: int
    has_powerpoint: bool
    has_report: bool
    created_at: datetime


class IntegrationRead(ORMModel):
    id: str
    project_id: str
    provider: str
    external_project_id: str | None
    credential_hint: str | None
    is_active: bool
    last_synced_at: datetime | None

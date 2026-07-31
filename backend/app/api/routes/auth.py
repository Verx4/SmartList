import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.entities import User, UserRole
from app.schemas.contracts import AuthResponse, LoginRequest, RegisterRequest, UserRead

router = APIRouter()
settings = get_settings()


def set_auth_cookies(response: Response, user_id: str) -> None:
    response.set_cookie(
        "access_token",
        create_access_token(user_id),
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        create_refresh_token(user_id),
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        path=f"{settings.api_v1_prefix}/auth",
    )


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuário inativo.")
    set_auth_cookies(response, user.id)
    return AuthResponse(
        user=UserRead.model_validate(user),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma conta com este e-mail.",
        )

    # O primeiro cadastro de uma instalaÃ§Ã£o nova administra os modelos.
    # Todos os cadastros seguintes entram com o perfil normal de engenharia.
    first_user = db.scalar(select(User.id).limit(1)) is None

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=UserRole.ADMIN if first_user else UserRole.ENGINEERING,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    set_auth_cookies(response, user.id)
    return AuthResponse(
        user=UserRead.model_validate(user),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=AuthResponse)
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> AuthResponse:
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Token de renovação ausente.")
    try:
        user_id = decode_token(refresh_token, "refresh")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Token de renovação inválido.") from exc
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuário inválido.")
    set_auth_cookies(response, user.id)
    return AuthResponse(
        user=UserRead.model_validate(user),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/logout", status_code=204)
def logout(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path=f"{settings.api_v1_prefix}/auth")


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> User:
    return user

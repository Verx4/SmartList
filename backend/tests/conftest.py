import os
from collections.abc import Generator

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SECRET_KEY"] = "test-secret-key-with-at-least-32-characters"
os.environ["PRIVATE_STORAGE_PATH"] = "./test-private-storage"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine, get_db
from app.core.security import hash_password
from app.main import app
from app.models.entities import User, UserRole


@pytest.fixture(autouse=True)
def clean_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        db.add(
            User(
                name="Admin Teste",
                email="admin@teste.com.br",
                password_hash=hash_password("Admin123!"),
                role=UserRole.ADMIN,
            )
        )
        db.commit()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    def override_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def authenticated_client(client: TestClient) -> TestClient:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@teste.com.br", "password": "Admin123!"},
    )
    assert response.status_code == 200
    return client

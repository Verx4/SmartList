from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_sets_http_only_cookies(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@teste.com.br", "password": "Admin123!"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"
    cookie_header = response.headers.get("set-cookie", "")
    assert "access_token=" in cookie_header
    assert "HttpOnly" in cookie_header


def test_login_rejects_invalid_password(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@teste.com.br", "password": "SenhaErrada!"},
    )
    assert response.status_code == 401


def test_user_can_register_and_login(client: TestClient) -> None:
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Fernanda Teste",
            "email": "fernanda.nova@teste.com.br",
            "password": "MinhaSenha123!",
        },
    )
    assert registration.status_code == 201
    assert registration.json()["user"]["email"] == "fernanda.nova@teste.com.br"
    assert registration.json()["user"]["role"] == "engineering"

    duplicate = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Outra Pessoa",
            "email": "FERNANDA.NOVA@TESTE.COM.BR",
            "password": "OutraSenha123!",
        },
    )
    assert duplicate.status_code == 409

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "fernanda.nova@teste.com.br", "password": "MinhaSenha123!"},
    )
    assert login.status_code == 200


def test_project_crud_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/projects")
    assert response.status_code == 401


def test_create_and_list_project(authenticated_client: TestClient) -> None:
    payload = {
        "name": "FAR Carpina",
        "code": "FAR-CPN-001",
        "company": "Engenharia Horizonte",
        "client": "Grupo Horizonte",
        "manager": "Fernanda Alves",
        "start_date": "2025-02-03",
        "expected_end_date": "2027-06-02",
        "towers": 4,
        "units": 320,
        "custom_rules": {"default_protected_slides": [6, 11]},
    }
    created = authenticated_client.post("/api/v1/projects", json=payload)
    assert created.status_code == 201
    assert created.json()["code"] == "FAR-CPN-001"

    listed = authenticated_client.get("/api/v1/projects")
    assert listed.status_code == 200
    assert listed.json()[0]["name"] == "FAR Carpina"

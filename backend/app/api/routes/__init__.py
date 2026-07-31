from fastapi import APIRouter

from app.api.routes import (
    auth,
    generations,
    health,
    integrations,
    mappings,
    projects,
    templates,
    uploads,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(mappings.router, prefix="/mappings", tags=["mappings"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(
    generations.router, prefix="/generations", tags=["generations"]
)
api_router.include_router(
    integrations.router, prefix="/integrations", tags=["integrations"]
)

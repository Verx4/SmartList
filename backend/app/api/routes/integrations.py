from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.entities import User

router = APIRouter()


@router.get("/prevision/status")
def prevision_status(_: User = Depends(get_current_user)) -> dict:
    return {
        "provider": "prevision",
        "available": False,
        "mode": "decoupled",
        "fallbacks": ["xlsx", "xlsm", "csv", "pdf"],
        "message": (
            "Conector preparado para API oficial. "
            "O MVP continua funcionando por importação manual."
        ),
    }

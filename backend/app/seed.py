from datetime import date

from sqlalchemy import select

from app.core.database import Base, SessionLocal, engine
from app.models.entities import Project


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        project = db.scalar(select(Project).where(Project.code == "FAR-CPN-001"))
        if not project:
            db.add(
                Project(
                    name="FAR Carpina",
                    code="FAR-CPN-001",
                    company="Engenharia Horizonte",
                    client="Grupo Horizonte",
                    manager="Fernanda Alves",
                    start_date=date(2025, 2, 3),
                    expected_end_date=date(2027, 6, 2),
                    towers=4,
                    units=320,
                    custom_rules={
                        "default_protected_slides": [6, 11],
                        "prevision_enabled": False,
                    },
                )
            )
        db.commit()


if __name__ == "__main__":
    seed()

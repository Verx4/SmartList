import json
from datetime import date
from pathlib import Path

from sqlalchemy import select

from app.core.database import Base, SessionLocal, engine
from app.models.entities import Project, SlideMapping, Template


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        project = db.scalar(select(Project).where(Project.code == "FAR-CPN-001"))
        if not project:
            project = Project(
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
            db.add(project)
            db.flush()

        fixture_path = Path(__file__).resolve().parent / "fixtures" / "far_carpina_mapping.json"
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
        templates = db.scalars(select(Template).where(Template.project_id == project.id))
        for template in templates:
            has_mapping = db.scalar(
                select(SlideMapping.id)
                .where(SlideMapping.template_id == template.id)
                .limit(1)
            )
            if has_mapping:
                continue
            for item in fixture["mappings"]:
                db.add(SlideMapping(template_id=template.id, **item))
            template.protected_slides = fixture["protected_slides"]
        db.commit()


if __name__ == "__main__":
    seed()

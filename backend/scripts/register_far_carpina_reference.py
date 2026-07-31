"""Registra o modelo real FAR Carpina sem alterar os arquivos originais."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import uuid
from pathlib import Path

from sqlalchemy import delete, select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.models.entities import Project, SlideMapping, Template
from app.seed import seed
from app.services.storage import persist_file, safe_filename


def copy_private(source: Path) -> tuple[str, Path]:
    settings = get_settings()
    storage_key = (
        f"uploads/template/{uuid.uuid4().hex}/{safe_filename(source.name)}"
    )
    destination = (settings.private_storage_path.resolve() / storage_key).resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    return storage_key, destination


def digest(path: Path) -> str:
    checksum = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            checksum.update(chunk)
    return checksum.hexdigest()


def register(powerpoint_path: Path) -> Template:
    if not powerpoint_path.is_file() or powerpoint_path.suffix.lower() != ".pptx":
        raise SystemExit("Informe um arquivo PowerPoint .pptx válido.")

    fixture_path = (
        Path(__file__).resolve().parents[1]
        / "app"
        / "fixtures"
        / "far_carpina_mapping.json"
    )
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

    Base.metadata.create_all(bind=engine)
    seed()
    with SessionLocal() as db:
        project = db.scalar(select(Project).where(Project.code == "FAR-CPN-001"))
        if project is None:
            raise SystemExit("A obra FAR Carpina não foi encontrada.")

        template = db.scalar(
            select(Template).where(
                Template.project_id == project.id,
                Template.name == fixture["template_name"],
            )
        )
        source_digest = digest(powerpoint_path)
        if template is None:
            storage_key, destination = copy_private(powerpoint_path)
            template = Template(
                project_id=project.id,
                name=fixture["template_name"],
                original_filename=powerpoint_path.name,
                storage_key=storage_key,
                version=int(fixture["mapping_version"]),
                protected_slides=fixture["protected_slides"],
            )
            db.add(template)
            db.flush()
        else:
            current_path = (
                get_settings().private_storage_path.resolve() / template.storage_key
            )
            if not current_path.is_file() or digest(current_path) != source_digest:
                storage_key, destination = copy_private(powerpoint_path)
                template.storage_key = storage_key
            else:
                destination = current_path
            template.original_filename = powerpoint_path.name
            template.version = int(fixture["mapping_version"])
            template.protected_slides = fixture["protected_slides"]

        db.execute(
            delete(SlideMapping).where(SlideMapping.template_id == template.id)
        )
        for item in fixture["mappings"]:
            db.add(SlideMapping(template_id=template.id, **item))
        persist_file(
            db,
            template.storage_key,
            destination,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
        project.custom_rules = {
            **(project.custom_rules or {}),
            "reference_model_sha256": source_digest,
            "mapping_fixture": fixture_path.name,
            "manual_review": fixture["manual_review"],
            "excel_validation": fixture["excel_validation"],
        }
        db.commit()
        db.refresh(template)
        print(
            json.dumps(
                {
                    "template_id": template.id,
                    "project_id": project.id,
                    "stored_copy": str(destination),
                    "source_sha256": source_digest,
                    "mapping_count": len(fixture["mappings"]),
                    "protected_slides": template.protected_slides,
                },
                ensure_ascii=False,
            )
        )
        return template


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--powerpoint", required=True, type=Path)
    args = parser.parse_args()
    register(args.powerpoint.resolve())


if __name__ == "__main__":
    main()

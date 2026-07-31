import json
import os
import posixpath
import re
import tempfile
import zipfile
from datetime import date, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

from app.services.excel import WorkbookReader


def format_value(value: Any, content_type: str, rule: dict[str, Any]) -> str:
    if value is None:
        return "Dado não disponível"
    elif content_type == "percentage":
        decimals = int(rule.get("decimals", 2))
        numeric = float(value)
        if abs(numeric) <= 1 and rule.get("source_is_fraction", True):
            numeric *= 100
        formatted = f"{numeric:.{decimals}f}%".replace(".", ",")
    elif content_type == "currency":
        decimals = int(rule.get("decimals", 2))
        numeric = float(value)
        formatted = f"{abs(numeric):,.{decimals}f}"
        sign = "-" if numeric < 0 else ""
        formatted = f"{sign}R$ {formatted}".replace(",", "_").replace(".", ",").replace("_", ".")
    elif content_type == "date" and isinstance(value, (date, datetime)):
        formatted = value.strftime(rule.get("pattern", "%d/%m/%Y"))
    elif content_type == "integer":
        formatted = str(int(value))
    elif content_type == "decimal":
        decimals = int(rule.get("decimals", 2))
        numeric = float(value)
        if rule.get("grouping", False):
            formatted = f"{numeric:,.{decimals}f}"
            formatted = formatted.replace(",", "_").replace(".", ",").replace("_", ".")
        else:
            formatted = f"{numeric:.{decimals}f}".replace(".", ",")
    else:
        formatted = str(value)
    return f"{rule.get('prefix', '')}{formatted}{rule.get('suffix', '')}"


def replace_token_in_text_frame(text_frame: Any, token: str, new_value: str) -> list[str]:
    old_values: list[str] = []
    for paragraph in text_frame.paragraphs:
        full_text = "".join(run.text for run in paragraph.runs)
        if token not in full_text:
            continue
        old_values.append(token)
        if any(token in run.text for run in paragraph.runs):
            for run in paragraph.runs:
                run.text = run.text.replace(token, new_value)
        elif paragraph.runs:
            replaced = full_text.replace(token, new_value)
            paragraph.runs[0].text = replaced
            for run in paragraph.runs[1:]:
                run.text = ""
    return old_values


def iter_shapes(shapes: Iterable[Any]) -> Iterable[Any]:
    for shape in shapes:
        yield shape
        if (
            getattr(shape, "shape_type", None) == MSO_SHAPE_TYPE.GROUP
            and hasattr(shape, "shapes")
        ):
            yield from iter_shapes(shape.shapes)


def iter_text_shapes(shapes: Iterable[Any]) -> Iterable[Any]:
    for shape in iter_shapes(shapes):
        if getattr(shape, "has_text_frame", False):
            yield shape


def parse_indexed_target(target_ref: str) -> tuple[str, int, int]:
    match = re.fullmatch(r"(.+)\|p(\d+)\|r(\d+)", target_ref)
    if not match:
        raise ValueError("Destino deve usar o formato 'Nome da forma|p1|r1'.")
    return match.group(1), int(match.group(2)), int(match.group(3))


def parse_table_target(target_ref: str) -> tuple[str, int, int]:
    match = re.fullmatch(r"(.+)\|r(\d+)\|c(\d+)", target_ref)
    if not match:
        raise ValueError("Destino deve usar o formato 'Nome da tabela|r1|c1'.")
    return match.group(1), int(match.group(2)), int(match.group(3))


def set_shape_run(
    slide: Any,
    target_ref: str,
    value: str,
    occurrence: int = 1,
) -> tuple[bool, str | None, str | None]:
    shape_name, paragraph_number, run_number = parse_indexed_target(target_ref)
    matches = [
        shape
        for shape in iter_text_shapes(slide.shapes)
        if shape.name == shape_name
    ]
    if occurrence < 1 or occurrence > len(matches):
        return False, None, None
    shape = matches[occurrence - 1]
    paragraphs = shape.text_frame.paragraphs
    if paragraph_number < 1 or paragraph_number > len(paragraphs):
        return False, shape.name, None
    runs = paragraphs[paragraph_number - 1].runs
    if run_number < 1 or run_number > len(runs):
        return False, shape.name, None
    run = runs[run_number - 1]
    previous = run.text
    run.text = value
    return True, shape.name, previous


def set_table_cell(
    slide: Any,
    target_ref: str,
    value: str,
    occurrence: int = 1,
) -> tuple[bool, str | None, str | None]:
    table_name, row_number, column_number = parse_table_target(target_ref)
    matches = [
        shape
        for shape in iter_shapes(slide.shapes)
        if getattr(shape, "has_table", False) and shape.name == table_name
    ]
    if occurrence < 1 or occurrence > len(matches):
        return False, None, None
    shape = matches[occurrence - 1]
    table = shape.table
    if not (1 <= row_number <= len(table.rows)):
        return False, shape.name, None
    if not (1 <= column_number <= len(table.columns)):
        return False, shape.name, None
    cell = table.cell(row_number - 1, column_number - 1)
    previous = cell.text
    if cell.text_frame.paragraphs and cell.text_frame.paragraphs[0].runs:
        first_run = cell.text_frame.paragraphs[0].runs[0]
        first_run.text = value
        for paragraph in cell.text_frame.paragraphs:
            for run in paragraph.runs[1:]:
                run.text = ""
    else:
        cell.text = value
    return True, shape.name, previous


def replace_image_shape(
    slide: Any,
    shape_name: str,
    image_path: Path,
    occurrence: int = 1,
) -> tuple[bool, str | None]:
    matches = [
        shape
        for shape in iter_shapes(slide.shapes)
        if shape.name == shape_name
        and getattr(shape, "shape_type", None) == MSO_SHAPE_TYPE.PICTURE
    ]
    if occurrence < 1 or occurrence > len(matches):
        return False, None
    original = matches[occurrence - 1]
    parent = original._element.getparent()
    index = parent.index(original._element)
    replacement = slide.shapes.add_picture(
        str(image_path),
        original.left,
        original.top,
        original.width,
        original.height,
    )
    replacement.name = original.name
    parent.remove(replacement._element)
    parent.insert(index, replacement._element)
    parent.remove(original._element)
    return True, original.name


_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
_PRESENTATION_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
_OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def _slide_part_names(package: zipfile.ZipFile) -> list[str]:
    from xml.etree import ElementTree

    presentation = ElementTree.fromstring(package.read("ppt/presentation.xml"))
    relationships = ElementTree.fromstring(
        package.read("ppt/_rels/presentation.xml.rels")
    )
    targets = {
        relationship.attrib["Id"]: posixpath.normpath(
            posixpath.join("ppt", relationship.attrib["Target"])
        )
        for relationship in relationships.findall(f"{{{_REL_NS}}}Relationship")
    }
    slide_ids = presentation.find(f"{{{_PRESENTATION_NS}}}sldIdLst")
    if slide_ids is None:
        return []
    return [
        targets[slide_id.attrib[f"{{{_OFFICE_REL_NS}}}id"]]
        for slide_id in slide_ids
    ]


def _relationship_part_name(part_name: str) -> str:
    directory, filename = posixpath.split(part_name)
    return posixpath.join(directory, "_rels", f"{filename}.rels")


def _collect_related_parts(
    package: zipfile.ZipFile,
    part_name: str,
    collected: set[str],
) -> None:
    from xml.etree import ElementTree

    if part_name in collected or part_name not in package.namelist():
        return
    collected.add(part_name)
    rels_name = _relationship_part_name(part_name)
    if rels_name not in package.namelist():
        return
    collected.add(rels_name)
    relationships = ElementTree.fromstring(package.read(rels_name))
    for relationship in relationships.findall(f"{{{_REL_NS}}}Relationship"):
        if relationship.attrib.get("TargetMode") == "External":
            continue
        target = relationship.attrib.get("Target")
        if not target:
            continue
        resolved = posixpath.normpath(
            posixpath.join(posixpath.dirname(part_name), target)
        )
        if resolved.startswith("ppt/"):
            _collect_related_parts(package, resolved, collected)


def restore_protected_slide_parts(
    template_path: Path,
    output_path: Path,
    protected_slides: set[int],
) -> list[dict[str, Any]]:
    if not protected_slides:
        return []
    with zipfile.ZipFile(template_path, "r") as source:
        ordered_slides = _slide_part_names(source)
        protected_parts: set[str] = set()
        slide_parts: dict[int, str] = {}
        for slide_number in sorted(protected_slides):
            if 1 <= slide_number <= len(ordered_slides):
                slide_part = ordered_slides[slide_number - 1]
                slide_parts[slide_number] = slide_part
                _collect_related_parts(source, slide_part, protected_parts)

        handle, temp_name = tempfile.mkstemp(
            prefix="protected-slides-",
            suffix=".pptx",
            dir=output_path.parent,
        )
        os.close(handle)
        temp_path = Path(temp_name)
        try:
            with zipfile.ZipFile(output_path, "r") as generated, zipfile.ZipFile(
                temp_path, "w"
            ) as rebuilt:
                generated_names = set(generated.namelist())
                for info in generated.infolist():
                    payload = (
                        source.read(info.filename)
                        if info.filename in protected_parts
                        else generated.read(info.filename)
                    )
                    rebuilt.writestr(info, payload)
                for name in sorted(protected_parts - generated_names):
                    rebuilt.writestr(source.getinfo(name), source.read(name))
            os.replace(temp_path, output_path)
        finally:
            temp_path.unlink(missing_ok=True)

        return [
            {
                "slide": slide_number,
                "part": part_name,
                "sha256": sha256(source.read(part_name)).hexdigest(),
                "status": "exact_copy",
            }
            for slide_number, part_name in slide_parts.items()
        ]


def generate_presentation(
    template_path: Path,
    excel_path: Path,
    output_path: Path,
    report_path: Path,
    mappings: Iterable[Any],
    protected_slides: set[int],
    manual_values: dict[str, Any],
    reference_month: str | None = None,
    layout_only: bool = False,
) -> dict[str, Any]:
    presentation = Presentation(str(template_path))
    changes: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    mapping_items = list(mappings)
    resolved_inputs: dict[int, tuple[Any, str]] = {}
    source_errors: list[str] = []
    target_errors: list[str] = []
    with WorkbookReader(excel_path) as reader:
        for index, mapping in enumerate(mapping_items):
            if int(mapping.slide_number) in protected_slides:
                continue
            format_rule = mapping.format_rule or {}
            source_rule_type = (format_rule.get("source_rule") or {}).get("type")
            portable = bool(format_rule.get("portable")) or source_rule_type in {
                "month",
                "month_ratio",
                "table_lookup",
            }
            if (
                layout_only
                and mapping.source_type == "excel"
                and not portable
            ):
                resolved_inputs[index] = (None, "campo específico do modelo original")
                warnings.append(
                    {
                        "slide": int(mapping.slide_number),
                        "field": mapping.target_ref,
                        "message": (
                            f"{mapping.purpose}: campo específico da obra do modelo; "
                            "marcado como não disponível para evitar misturar dados."
                        ),
                    }
                )
                continue
            try:
                if mapping.source_type == "manual":
                    raw_value = manual_values.get(mapping.target_ref)
                    resolved_source = "manual"
                elif mapping.source_type == "excel" and mapping.source_ref:
                    raw_value, resolved_source = reader.read(
                        mapping.source_ref,
                        reference_month,
                        (mapping.format_rule or {}).get("source_rule"),
                    )
                else:
                    raw_value = None
                    resolved_source = mapping.source_ref or "origem não informada"
                if raw_value is None and not getattr(mapping, "requires_review", False):
                    raise ValueError("célula sem valor calculado")
                if raw_value is None:
                    warnings.append(
                        {
                            "slide": int(mapping.slide_number),
                            "field": mapping.target_ref,
                            "message": (
                                f"{mapping.purpose}: dado não encontrado; "
                                "o campo foi marcado para revisão."
                            ),
                        }
                    )
                resolved_inputs[index] = (raw_value, resolved_source)
            except Exception as exc:
                if getattr(mapping, "requires_review", False):
                    resolved_inputs[index] = (None, mapping.source_ref or "excel")
                    warnings.append(
                        {
                            "slide": int(mapping.slide_number),
                            "field": mapping.target_ref,
                            "message": f"{mapping.purpose}: {exc}",
                        }
                    )
                else:
                    source_errors.append(f"{mapping.purpose}: {exc}")

    if source_errors:
        details = "; ".join(source_errors[:8])
        if len(source_errors) > 8:
            details += f"; e mais {len(source_errors) - 8} campo(s)."
        raise ValueError(
            "A planilha não contém todos os dados obrigatórios para este modelo. "
            f"{details}"
        )

    for index, mapping in enumerate(mapping_items):
        slide_number = int(mapping.slide_number)
        if slide_number in protected_slides:
            changes.append(
                {
                    "slide": slide_number,
                    "target": mapping.target_ref,
                    "status": "ignored_protected",
                }
            )
            continue
        if slide_number < 1 or slide_number > len(presentation.slides):
            warnings.append(
                {
                    "slide": slide_number,
                    "field": mapping.target_ref,
                    "message": "Slide não encontrado no modelo.",
                }
            )
            continue

        try:
            raw_value, resolved_source = resolved_inputs[index]

            formatted = format_value(
                raw_value, mapping.content_type, mapping.format_rule or {}
            )
            slide = presentation.slides[slide_number - 1]
            updated = False
            previous: str | None = None
            element_name: str | None = None
            occurrence = int((mapping.format_rule or {}).get("shape_occurrence", 1))

            if mapping.target_kind == "placeholder":
                for shape in iter_text_shapes(slide.shapes):
                    old = replace_token_in_text_frame(
                        shape.text_frame, mapping.target_ref, formatted
                    )
                    if old:
                        updated = True
                        changes.append(
                            {
                                "slide": slide_number,
                                "element": shape.name,
                                "target": mapping.target_ref,
                                "previous": mapping.target_ref,
                                "new": formatted,
                                "source": resolved_source,
                                "transformation": mapping.format_rule or {},
                            }
                        )
            elif mapping.target_kind == "shape_name":
                for shape in iter_text_shapes(slide.shapes):
                    if shape.name != mapping.target_ref:
                        continue
                    previous = shape.text
                    if shape.text_frame.paragraphs and shape.text_frame.paragraphs[0].runs:
                        first_run = shape.text_frame.paragraphs[0].runs[0]
                        first_run.text = formatted
                        for paragraph in shape.text_frame.paragraphs:
                            for run in paragraph.runs[1:]:
                                run.text = ""
                    else:
                        shape.text = formatted
                    updated = True
                    changes.append(
                        {
                            "slide": slide_number,
                            "element": shape.name,
                            "target": mapping.target_ref,
                            "previous": previous,
                            "new": formatted,
                            "source": resolved_source,
                            "transformation": mapping.format_rule or {},
                        }
                    )
            elif mapping.target_kind == "shape_run":
                updated, element_name, previous = set_shape_run(
                    slide, mapping.target_ref, formatted, occurrence
                )
            elif mapping.target_kind == "table_cell":
                updated, element_name, previous = set_table_cell(
                    slide, mapping.target_ref, formatted, occurrence
                )
            elif mapping.target_kind == "image_shape":
                if raw_value is None:
                    raise ValueError("Imagem de origem não informada.")
                image_path = Path(str(raw_value)).expanduser().resolve()
                if not image_path.is_file():
                    raise ValueError("Arquivo de imagem de origem não encontrado.")
                updated, element_name = replace_image_shape(
                    slide, mapping.target_ref, image_path, occurrence
                )
                previous = mapping.target_ref

            if updated and mapping.target_kind in {
                "shape_run",
                "table_cell",
                "image_shape",
            }:
                changes.append(
                    {
                        "slide": slide_number,
                        "element": element_name,
                        "target": mapping.target_ref,
                        "previous": previous,
                        "new": (
                            formatted
                            if mapping.target_kind != "image_shape"
                            else image_path.name
                        ),
                        "source": resolved_source,
                        "transformation": mapping.format_rule or {},
                    }
                )

            if not updated:
                issue = {
                    "slide": slide_number,
                    "field": mapping.target_ref,
                    "message": "Elemento de destino não encontrado.",
                }
                warnings.append(issue)
                if not getattr(mapping, "requires_review", False):
                    target_errors.append(f"slide {slide_number}: {mapping.target_ref}")
        except Exception as exc:
            issue = {
                "slide": slide_number,
                "field": mapping.target_ref,
                "message": f"Falha controlada no mapeamento: {exc}",
            }
            warnings.append(issue)
            if not getattr(mapping, "requires_review", False):
                target_errors.append(f"slide {slide_number}: {mapping.target_ref}: {exc}")

    if target_errors:
        details = "; ".join(target_errors[:8])
        raise ValueError(
            "O modelo não pôde ser atualizado com segurança. "
            f"{details}"
        )

    presentation.save(str(output_path))
    protected_verification = restore_protected_slide_parts(
        template_path, output_path, protected_slides
    )
    report = {
        "changed_slides": sorted(
            {item["slide"] for item in changes if item.get("new") is not None}
        ),
        "protected_slides": sorted(protected_slides),
        "protected_slide_verification": protected_verification,
        "changes": changes,
        "warnings": warnings,
        "layout_only": layout_only,
    }
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return report

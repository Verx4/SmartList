import json
import zipfile
from pathlib import Path
from types import SimpleNamespace

from openpyxl import Workbook
from pptx import Presentation

from app.services.powerpoint import format_value, generate_presentation


def test_format_value_groups_large_decimal_and_rounds_currency() -> None:
    assert format_value(
        18_147_865.56,
        "decimal",
        {"decimals": 2, "grouping": True},
    ) == "18.147.865,56"
    assert format_value(
        1_927_597.754,
        "currency",
        {"decimals": 2},
    ) == "R$ 1.927.597,75"


def test_far_carpina_fixture_has_expected_mapping_contract() -> None:
    fixture_path = (
        Path(__file__).resolve().parents[1]
        / "app"
        / "fixtures"
        / "far_carpina_mapping.json"
    )
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

    assert len(fixture["mappings"]) == 31
    assert fixture["protected_slides"] == [6, 11]
    assert fixture["mapping_version"] == 2
    assert fixture["excel_validation"]["required_sheets"]
    dynamic_sources = [
        mapping
        for mapping in fixture["mappings"]
        if (mapping.get("format_rule") or {}).get("source_rule")
    ]
    assert len(dynamic_sources) == 9
    assert not {
        mapping["slide_number"] for mapping in fixture["mappings"]
    }.intersection(fixture["protected_slides"])


def test_generation_replaces_tokens_and_preserves_protected_slide(
    tmp_path: Path,
) -> None:
    excel_path = tmp_path / "dados.xlsx"
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Planejamento"
    sheet["A1"] = 0.1236
    workbook.save(excel_path)

    template_path = tmp_path / "modelo.pptx"
    presentation = Presentation()
    first = presentation.slides.add_slide(presentation.slide_layouts[6])
    box = first.shapes.add_textbox(0, 0, 1_000_000, 500_000)
    box.text = "Realizado: {{PROGRESSO_REALIZADO}}"
    protected = presentation.slides.add_slide(presentation.slide_layouts[6])
    protected_box = protected.shapes.add_textbox(0, 0, 1_000_000, 500_000)
    protected_box.text = "Protegido: {{PROGRESSO_REALIZADO}}"
    presentation.save(template_path)

    mappings = [
        SimpleNamespace(
            slide_number=1,
            source_type="excel",
            source_ref="Planejamento!A1",
            target_kind="placeholder",
            target_ref="{{PROGRESSO_REALIZADO}}",
            content_type="percentage",
            format_rule={"decimals": 2, "source_is_fraction": True},
        ),
        SimpleNamespace(
            slide_number=2,
            source_type="excel",
            source_ref="Planejamento!A1",
            target_kind="placeholder",
            target_ref="{{PROGRESSO_REALIZADO}}",
            content_type="percentage",
            format_rule={"decimals": 2, "source_is_fraction": True},
        ),
    ]
    output_path = tmp_path / "resultado.pptx"
    report_path = tmp_path / "relatorio.json"

    report = generate_presentation(
        template_path,
        excel_path,
        output_path,
        report_path,
        mappings,
        {2},
        {},
    )

    result = Presentation(output_path)
    assert "12,36%" in result.slides[0].shapes[0].text
    assert "{{PROGRESSO_REALIZADO}}" in result.slides[1].shapes[0].text
    assert report["protected_slides"] == [2]
    assert report["protected_slide_verification"][0]["status"] == "exact_copy"
    assert json.loads(report_path.read_text(encoding="utf-8"))["changed_slides"] == [1]
    with zipfile.ZipFile(template_path) as source, zipfile.ZipFile(output_path) as output:
        assert source.read("ppt/slides/slide2.xml") == output.read(
            "ppt/slides/slide2.xml"
        )


def test_generation_updates_one_run_without_losing_formatting(tmp_path: Path) -> None:
    excel_path = tmp_path / "dados.xlsx"
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Curva S"
    sheet["A1"] = 0.1236
    workbook.save(excel_path)

    template_path = tmp_path / "modelo.pptx"
    presentation = Presentation()
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    box = slide.shapes.add_textbox(0, 0, 2_000_000, 500_000)
    box.name = "Indicador"
    paragraph = box.text_frame.paragraphs[0]
    paragraph.add_run().text = "Realizado: "
    value_run = paragraph.add_run()
    value_run.text = "0,00%"
    value_run.font.bold = True
    presentation.save(template_path)

    mapping = SimpleNamespace(
        slide_number=1,
        source_type="excel",
        source_ref="Curva S!A1",
        target_kind="shape_run",
        target_ref="Indicador|p1|r2",
        content_type="percentage",
        format_rule={"decimals": 2, "source_is_fraction": True},
    )
    output_path = tmp_path / "resultado.pptx"
    report_path = tmp_path / "relatorio.json"
    generate_presentation(
        template_path,
        excel_path,
        output_path,
        report_path,
        [mapping],
        set(),
        {},
    )

    result = Presentation(output_path)
    updated = result.slides[0].shapes[0].text_frame.paragraphs[0]
    assert updated.runs[0].text == "Realizado: "
    assert updated.runs[1].text == "12,36%"
    assert updated.runs[1].font.bold is True

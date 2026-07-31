from datetime import date
from pathlib import Path

from openpyxl import Workbook
import pytest

from app.services.excel import (
    WorkbookReader,
    analyze_workbook,
    read_cell,
    validate_reference_month,
    validate_workbook_compatibility,
)


def test_analyze_workbook_detects_sheets_tables_and_formulas(tmp_path: Path) -> None:
    file_path = tmp_path / "obra.xlsx"
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Planejamento"
    sheet.append(["Indicador", "Base", "Realizado"])
    sheet.append(["Progresso", 0.1197, 0.1236])
    sheet["D2"] = "=C2-B2"
    sheet.merge_cells("A4:C4")
    workbook.create_sheet("Financeiro")
    workbook.save(file_path)

    analysis = analyze_workbook(file_path)

    assert analysis["sheet_count"] == 2
    assert [sheet["name"] for sheet in analysis["sheets"]] == [
        "Planejamento",
        "Financeiro",
    ]
    planning = analysis["sheets"][0]
    assert planning["formula_count"] == 1
    assert planning["detected_headers"][:3] == ["Indicador", "Base", "Realizado"]
    assert "A4:C4" in planning["merged_cells"]
    assert read_cell(file_path, "Planejamento!C2") == 0.1236


def test_month_rules_find_reference_in_any_row_and_calculate_ratio(
    tmp_path: Path,
) -> None:
    file_path = tmp_path / "curvas.xlsx"
    workbook = Workbook()
    curve = workbook.active
    curve.title = "Curva S"
    curve["A6"] = date(2026, 6, 30)
    curve["E6"] = 0.1236
    curve["A8"] = date(2026, 8, 31)
    curve["E8"] = 0
    monthly = workbook.create_sheet("Progresso Mensal")
    monthly["A6"] = date(2026, 6, 30)
    monthly["D6"] = 0.016
    monthly["E6"] = 0.0139
    workbook.save(file_path)

    with WorkbookReader(file_path) as reader:
        realized, source = reader.read(
            "Curva S!E8",
            "2026-06",
            {"type": "month", "date_columns": ["A", "B"]},
        )
        ratio, ratio_source = reader.read(
            "Progresso Mensal!N13",
            "2026-06",
            {
                "type": "month_ratio",
                "date_columns": ["A", "B"],
                "numerator_column": "E",
                "denominator_column": "D",
            },
        )

    assert realized == 0.1236
    assert source == "Curva S!E6"
    assert ratio == pytest.approx(0.86875)
    assert ratio_source == "Progresso Mensal!E6/D6"
    assert validate_reference_month(file_path, "2026-06") == []
    assert validate_reference_month(file_path, "2026-08")


def test_workbook_compatibility_rejects_another_project(tmp_path: Path) -> None:
    file_path = tmp_path / "outro-projeto.xlsx"
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Planilha1"
    sheet["C4"] = "FDSMFP"
    workbook.create_sheet("Curva S")
    workbook.create_sheet("Progresso Mensal")
    workbook.create_sheet("Custo")
    workbook.save(file_path)

    issues = validate_workbook_compatibility(
        file_path,
        {
            "excel_validation": {
                "required_sheets": ["Curva S", "Progresso Mensal", "Custo", "Planilha1"],
                "cell_contains": [
                    {
                        "sheet": "Planilha1",
                        "cell": "C4",
                        "any": ["CARPINA", "FAR"],
                        "message": "Obra incorreta.",
                    }
                ],
            }
        },
    )

    assert issues == ["Obra incorreta."]

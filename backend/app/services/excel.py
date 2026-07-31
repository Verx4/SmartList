import re
import unicodedata
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell
from openpyxl.utils.datetime import from_excel


PORTUGUESE_MONTHS = {
    "jan": 1,
    "fev": 2,
    "mar": 3,
    "abr": 4,
    "mai": 5,
    "jun": 6,
    "jul": 7,
    "ago": 8,
    "set": 9,
    "out": 10,
    "nov": 11,
    "dez": 12,
}


def normalize_text(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def shifted_month(reference_month: str, offset: int = 0) -> tuple[int, int]:
    match = re.fullmatch(r"(\d{4})-(0[1-9]|1[0-2])", reference_month)
    if not match:
        raise ValueError(f"Mês de referência inválido: {reference_month}")
    absolute_month = int(match.group(1)) * 12 + int(match.group(2)) - 1 + offset
    year, zero_based_month = divmod(absolute_month, 12)
    return year, zero_based_month + 1


def cell_month(value: Any, workbook: Any) -> tuple[int, int] | None:
    if isinstance(value, datetime):
        return value.year, value.month
    if isinstance(value, date):
        return value.year, value.month
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            converted = from_excel(value, workbook.epoch)
            return converted.year, converted.month
        except (TypeError, ValueError, OverflowError):
            return None
    text = normalize_text(value)
    match = re.search(
        r"\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+(\d{2}|\d{4})\b",
        text,
    )
    if match:
        year = int(match.group(2))
        if year < 100:
            year += 2000
        return year, PORTUGUESE_MONTHS[match.group(1)]
    match = re.search(r"\b(0?[1-9]|1[0-2])\s+(\d{2}|\d{4})\b", text)
    if match:
        year = int(match.group(2))
        if year < 100:
            year += 2000
        return year, int(match.group(1))
    return None


class WorkbookReader:
    def __init__(self, path: Path):
        self.workbook = load_workbook(
            path,
            read_only=False,
            data_only=True,
            keep_vba=False,
        )

    def close(self) -> None:
        self.workbook.close()

    def __enter__(self) -> "WorkbookReader":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    def _find_month_row(
        self,
        worksheet: Any,
        reference_month: str,
        rule: dict[str, Any],
    ) -> int:
        target_month = shifted_month(
            reference_month,
            int(rule.get("month_offset", 0)),
        )
        date_columns = rule.get("date_columns") or ["A", "B"]
        for row in range(1, worksheet.max_row + 1):
            if any(
                cell_month(worksheet[f"{column}{row}"].value, self.workbook)
                == target_month
                for column in date_columns
            ):
                return row
        raise ValueError(
            f"Mês {target_month[1]:02d}/{target_month[0]} não encontrado "
            f"na aba {worksheet.title}."
        )

    def read(
        self,
        source_ref: str,
        reference_month: str | None = None,
        source_rule: dict[str, Any] | None = None,
    ) -> tuple[Any, str]:
        if "!" not in source_ref:
            raise ValueError(f"Referência Excel inválida: {source_ref}")
        sheet_name, coordinate = source_ref.rsplit("!", 1)
        sheet_name = sheet_name.strip("'")
        if sheet_name not in self.workbook.sheetnames:
            raise ValueError(f"Aba obrigatória não encontrada: {sheet_name}")
        worksheet = self.workbook[sheet_name]
        rule = source_rule or {}
        if rule.get("type") == "table_lookup":
            labels = [normalize_text(item) for item in rule.get("labels", [])]
            headers = [normalize_text(item) for item in rule.get("headers", [])]
            header_row = None
            value_column = None
            for row in range(1, min(worksheet.max_row, 20) + 1):
                for column in range(1, worksheet.max_column + 1):
                    value = normalize_text(worksheet.cell(row, column).value)
                    if value and any(header == value or header in value for header in headers):
                        header_row = row
                        value_column = column
                        break
                if value_column is not None:
                    break
            if header_row is None or value_column is None:
                raise ValueError(f"Cabeçalho esperado não encontrado na aba {sheet_name}.")
            for row in range(header_row + 1, worksheet.max_row + 1):
                row_text = " ".join(
                    normalize_text(worksheet.cell(row, column).value)
                    for column in range(1, min(worksheet.max_column, 5) + 1)
                )
                if labels and any(label == row_text or label in row_text for label in labels):
                    value = worksheet.cell(row, value_column).value
                    coordinate = worksheet.cell(row, value_column).coordinate
                    return value, f"{sheet_name}!{coordinate}"
            raise ValueError(f"Linha esperada não encontrada na aba {sheet_name}.")
        if rule.get("type") in {"month", "month_ratio"}:
            if not reference_month:
                raise ValueError("O mês de referência é obrigatório para esta origem.")
            row_number = self._find_month_row(worksheet, reference_month, rule)
            if rule.get("type") == "month_ratio":
                numerator_column = str(rule.get("numerator_column", "E")).upper()
                denominator_column = str(rule.get("denominator_column", "D")).upper()
                numerator = worksheet[f"{numerator_column}{row_number}"].value
                denominator = worksheet[f"{denominator_column}{row_number}"].value
                if not isinstance(numerator, (int, float)) or not isinstance(
                    denominator, (int, float)
                ):
                    raise ValueError("valores mensais inválidos para calcular o índice")
                if abs(float(denominator)) <= 1e-12:
                    raise ValueError("não é possível calcular o índice com divisor zero")
                resolved = (
                    f"{sheet_name}!{numerator_column}{row_number}/"
                    f"{denominator_column}{row_number}"
                )
                return float(numerator) / float(denominator), resolved
            column = re.match(r"[A-Za-z]+", coordinate)
            if not column:
                raise ValueError(f"Coordenada Excel inválida: {coordinate}")
            resolved_coordinate = f"{column.group(0).upper()}{row_number}"
            return worksheet[resolved_coordinate].value, f"{sheet_name}!{resolved_coordinate}"
        return worksheet[coordinate].value, f"{sheet_name}!{coordinate}"


def validate_workbook_compatibility(
    path: Path,
    project_rules: dict[str, Any] | None,
    *,
    strict_identity: bool = True,
) -> list[str]:
    validation = (project_rules or {}).get("excel_validation") or {}
    if not validation:
        return []
    issues: list[str] = []
    with WorkbookReader(path) as reader:
        workbook = reader.workbook
        for sheet_name in validation.get("required_sheets", []):
            if sheet_name not in workbook.sheetnames:
                issues.append(f"Aba obrigatória ausente: {sheet_name}.")
        for check in validation.get("cell_contains", []):
            sheet_name = check.get("sheet")
            coordinate = check.get("cell")
            if not sheet_name or not coordinate or sheet_name not in workbook.sheetnames:
                continue
            actual = normalize_text(workbook[sheet_name][coordinate].value)
            expected = [normalize_text(item) for item in check.get("any", [])]
            if expected and not any(item in actual for item in expected):
                is_identity_check = (
                    check.get("kind") == "identity"
                    or "identificacao da obra" in normalize_text(check.get("message"))
                )
                if is_identity_check and not strict_identity:
                    continue
                issues.append(
                    check.get("message")
                    or f"O conteúdo de {sheet_name}!{coordinate} não corresponde ao modelo selecionado."
                )
    return issues


def detect_project_identity(path: Path) -> dict[str, str] | None:
    """Identifica a obra por conteúdo e, quando disponível, pela sigla do arquivo."""
    with WorkbookReader(path) as reader:
        workbook = reader.workbook
        candidates = (
            ("Relatório - CN", "D5"),
            ("Custo Por Nível", "A3"),
            ("Custo Por Nível (2)", "B3"),
            ("Planilha1", "C4"),
        )
        display_name = ""
        source = ""
        for sheet_name, coordinate in candidates:
            if sheet_name not in workbook.sheetnames:
                continue
            value = str(workbook[sheet_name][coordinate].value or "").strip()
            normalized = normalize_text(value)
            if value and normalized not in {"obra", "total obra"}:
                display_name = re.sub(r"^\s*\d+\s*-\s*", "", value)
                display_name = re.sub(r"\s*\(OBRA\)\s*$", "", display_name, flags=re.I)
                source = f"{sheet_name}!{coordinate}"
                break

    filename = normalize_text(path.stem).replace(" ", "")
    if "fdsmfp" in filename:
        code = "FDSMFP"
    elif "farcarp" in filename or "carpina" in filename:
        code = "FAR-CARPINA"
    else:
        code = ""

    if not display_name and not code:
        return None
    return {
        "code": code,
        "name": display_name or code,
        "source": source or "nome do arquivo",
    }


def detect_reference_month(workbook: Any) -> str | None:
    candidates: list[tuple[int, int]] = []
    for sheet_name in ("Curva S", "Progresso Mensal"):
        if sheet_name not in workbook.sheetnames:
            continue
        worksheet = workbook[sheet_name]
        for row in range(1, worksheet.max_row + 1):
            realized = worksheet[f"E{row}"].value
            if not isinstance(realized, (int, float)) or isinstance(realized, bool):
                continue
            if abs(float(realized)) <= 1e-12:
                continue
            month = cell_month(worksheet[f"A{row}"].value, workbook)
            if month is None:
                month = cell_month(worksheet[f"B{row}"].value, workbook)
            if month is not None:
                candidates.append(month)
    if not candidates:
        return None
    year, month = max(candidates)
    return f"{year:04d}-{month:02d}"


def validate_reference_month(path: Path, reference_month: str) -> list[str]:
    with WorkbookReader(path) as reader:
        detected = detect_reference_month(reader.workbook)
    if detected and detected != reference_month:
        detected_year, detected_month = detected.split("-")
        return [
            (
                f"O Excel contém dados realizados até {detected_month}/{detected_year}, "
                f"mas a apresentação foi solicitada para {reference_month[5:7]}/{reference_month[:4]}."
            )
        ]
    return []


def json_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def analyze_workbook(path: Path) -> dict[str, Any]:
    workbook = load_workbook(path, read_only=False, data_only=False, keep_vba=False)
    values_workbook = load_workbook(
        path, read_only=False, data_only=True, keep_vba=False
    )
    sheets: list[dict[str, Any]] = []

    for worksheet in workbook.worksheets:
        value_sheet = values_workbook[worksheet.title]
        populated: list[dict[str, Any]] = []
        formulas = 0
        first_data_row: int | None = None
        last_data_row = 0
        last_data_column = 0

        for row in worksheet.iter_rows():
            row_has_value = False
            for cell in row:
                if isinstance(cell, MergedCell) or cell.value is None:
                    continue
                row_has_value = True
                last_data_column = max(last_data_column, cell.column)
                if isinstance(cell.value, str) and cell.value.startswith("="):
                    formulas += 1
                if len(populated) < 250:
                    calculated = value_sheet[cell.coordinate].value
                    populated.append(
                        {
                            "cell": cell.coordinate,
                            "value": json_value(cell.value),
                            "calculated_value": json_value(calculated),
                            "number_format": cell.number_format,
                            "data_type": cell.data_type,
                        }
                    )
            if row_has_value:
                first_data_row = first_data_row or row[0].row
                last_data_row = row[0].row

        detected_headers: list[str] = []
        if first_data_row:
            header_values = [
                json_value(cell.value)
                for cell in worksheet[first_data_row]
                if not isinstance(cell, MergedCell) and cell.value is not None
            ]
            if len(header_values) >= 2:
                detected_headers = [str(value) for value in header_values[:30]]

        sheets.append(
            {
                "name": worksheet.title,
                "dimensions": worksheet.calculate_dimension(),
                "first_data_row": first_data_row,
                "last_data_row": last_data_row or None,
                "last_data_column": last_data_column or None,
                "detected_headers": detected_headers,
                "tables": [
                    {"name": table.name, "range": table.ref}
                    for table in worksheet.tables.values()
                ],
                "merged_cells": [str(item) for item in worksheet.merged_cells.ranges],
                "formula_count": formulas,
                "preview": populated,
            }
        )

    detected_reference_month = detect_reference_month(values_workbook)
    workbook.close()
    values_workbook.close()
    return {
        "sheet_count": len(sheets),
        "sheets": sheets,
        "detected_reference_month": detected_reference_month,
        "detected_project": detect_project_identity(path),
    }


def _read_cell_legacy(path: Path, source_ref: str) -> Any:
    if "!" not in source_ref:
        raise ValueError(f"Referência Excel inválida: {source_ref}")
    sheet_name, coordinate = source_ref.rsplit("!", 1)
    sheet_name = sheet_name.strip("'")
    workbook = load_workbook(path, read_only=True, data_only=True, keep_vba=False)
    try:
        return workbook[sheet_name][coordinate].value
    finally:
        workbook.close()


def read_cell(
    path: Path,
    source_ref: str,
    reference_month: str | None = None,
    source_rule: dict[str, Any] | None = None,
) -> Any:
    with WorkbookReader(path) as reader:
        value, _ = reader.read(source_ref, reference_month, source_rule)
        return value

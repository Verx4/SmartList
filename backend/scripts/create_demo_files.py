from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.styles import Font, PatternFill
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[2]
DEMO = ROOT / "demo"
DEMO.mkdir(parents=True, exist_ok=True)


def create_excel() -> None:
    workbook = Workbook()
    planning = workbook.active
    planning.title = "Planejamento"
    headers = ["Indicador", "Base", "Reprogramado", "Realizado"]
    planning.append(headers)
    planning.append(["Acumulado", 0.1197, 0.1197, 0.1236])
    planning.append(["Mensal", 0.0236, 0.0160, 0.0139])
    planning["A5"] = "Última medição"
    planning["B5"] = "2026-06-30"
    planning["A6"] = "Novo término"
    planning["B6"] = "2027-06-02"
    for cell in planning[1]:
        cell.font = Font(color="FFFFFF", bold=True)
        cell.fill = PatternFill("solid", fgColor="0D5C47")
    for row in planning.iter_rows(min_row=2, max_row=3, min_col=2, max_col=4):
        for cell in row:
            cell.number_format = "0.00%"

    chart = LineChart()
    chart.title = "Progresso físico"
    chart.add_data(Reference(planning, min_col=2, max_col=4, min_row=1, max_row=3), titles_from_data=True)
    chart.set_categories(Reference(planning, min_col=1, min_row=2, max_row=3))
    planning.add_chart(chart, "F2")

    financial = workbook.create_sheet("Financeiro")
    financial.append(["Categoria", "Valor"])
    financial.append(["Custo total", 3_135_712.77])
    financial.append(["Receitas", 3_480_000.00])
    financial.append(["Despesas", 2_962_410.50])
    for cell in financial[1]:
        cell.font = Font(color="FFFFFF", bold=True)
        cell.fill = PatternFill("solid", fgColor="0D5C47")
    for cell in financial["B"][1:]:
        cell.number_format = 'R$ #,##0.00'

    workforce = workbook.create_sheet("Mão de obra")
    workforce.append(["Função", "Quantidade"])
    workforce.append(["Engenharia", 8])
    workforce.append(["Produção", 126])
    workforce.append(["Apoio", 18])
    workforce.append(["Total", "=SUM(B2:B4)"])

    workbook.save(DEMO / "far_carpina_dados_demo.xlsx")


def add_title(slide, title: str, subtitle: str) -> None:
    title_box = slide.shapes.add_textbox(Inches(0.65), Inches(0.55), Inches(11.8), Inches(0.7))
    title_box.name = "title"
    title_box.text_frame.paragraphs[0].text = title
    title_box.text_frame.paragraphs[0].runs[0].font.size = Pt(26)
    title_box.text_frame.paragraphs[0].runs[0].font.bold = True
    title_box.text_frame.paragraphs[0].runs[0].font.color.rgb = RGBColor(13, 92, 71)
    subtitle_box = slide.shapes.add_textbox(Inches(0.68), Inches(1.33), Inches(11), Inches(0.4))
    subtitle_box.text = subtitle
    subtitle_box.text_frame.paragraphs[0].runs[0].font.size = Pt(11)
    subtitle_box.text_frame.paragraphs[0].runs[0].font.color.rgb = RGBColor(100, 117, 111)


def create_powerpoint() -> None:
    presentation = Presentation()
    presentation.slide_width = Inches(13.333)
    presentation.slide_height = Inches(7.5)
    for number in range(1, 20):
        slide = presentation.slides.add_slide(presentation.slide_layouts[6])
        add_title(slide, f"FAR Carpina · Slide {number}", "{{MES_REFERENCIA}}")
        body = slide.shapes.add_textbox(Inches(0.7), Inches(2.0), Inches(11.8), Inches(3.6))
        body.name = f"content_slide_{number}"
        if number == 3:
            body.text = "Efetivo total: {{TOTAL_TRABALHADORES}}"
        elif number == 8:
            body.text = "Progresso realizado: {{PROGRESSO_REALIZADO}}\nÚltima medição: {{ULTIMA_MEDICAO}}"
        elif number == 17:
            body.text = "Custo total: {{CUSTO_TOTAL}}"
        elif number in {6, 11}:
            body.text = "SLIDE PROTEGIDO — este conteúdo deve permanecer inalterado."
        else:
            body.text = "Conteúdo fixo do modelo corporativo."
        body.text_frame.paragraphs[0].runs[0].font.size = Pt(20)
        body.text_frame.paragraphs[0].runs[0].font.color.rgb = RGBColor(36, 68, 58)
        footer = slide.shapes.add_textbox(Inches(11.8), Inches(7.0), Inches(0.8), Inches(0.25))
        footer.text = str(number)
        footer.text_frame.paragraphs[0].runs[0].font.size = Pt(8)
    presentation.save(DEMO / "far_carpina_modelo_demo.pptx")


if __name__ == "__main__":
    create_excel()
    create_powerpoint()
    print(f"Arquivos de demonstração criados em {DEMO}")

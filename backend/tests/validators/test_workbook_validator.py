from openpyxl import Workbook

from app.validators.workbook_validator import validate_workbook


def build_workbook(headers: list[str], sheet_name: str = "子项明细") -> Workbook:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_name
    sheet.append(headers)
    return workbook


def test_validate_workbook_reports_missing_required_columns() -> None:
    workbook = build_workbook(["BOM层级", "子项物料编码"])

    report = validate_workbook(workbook)

    assert report.status == "failed"
    assert report.summary.fatal_count == 1
    assert report.errors[0].code == "MISSING_REQUIRED_COLUMNS"


def test_validate_workbook_reports_missing_sheet() -> None:
    workbook = build_workbook(
        [
            "BOM层级",
            "子项物料编码",
            "物料名称",
            "物料属性",
            "实际数量",
            "金额",
        ],
        sheet_name="其他Sheet",
    )

    report = validate_workbook(workbook)

    assert report.status == "failed"
    assert report.errors[0].code == "MISSING_SHEET"

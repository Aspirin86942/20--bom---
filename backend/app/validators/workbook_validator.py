from collections.abc import Iterable

from openpyxl import Workbook

from app.schemas.error_models import ImportErrorItem, ValidationReport


REQUIRED_COLUMNS = {
    "BOM层级",
    "子项物料编码",
    "物料名称",
    "物料属性",
    "实际数量",
    "金额",
}


def _headers_from_sheet(values: Iterable[tuple[object, ...]]) -> list[str]:
    first_row = next(iter(values), ())
    return [str(cell).strip() for cell in first_row if cell is not None]


def validate_workbook(workbook: Workbook) -> ValidationReport:
    sheet_names = workbook.sheetnames
    if "子项明细" not in sheet_names:
        return ValidationReport(
            status="failed",
            summary={"fatal_count": 1, "warning_count": 0},
            errors=[
                ImportErrorItem(
                    severity="fatal",
                    code="MISSING_SHEET",
                    message="缺少子项明细 sheet",
                    action="请确认上传的是固定格式 BOM Excel",
                )
            ],
        )

    sheet = workbook["子项明细"]
    headers = _headers_from_sheet(
        sheet.iter_rows(min_row=1, max_row=1, values_only=True)
    )
    missing_columns = sorted(REQUIRED_COLUMNS.difference(headers))
    if missing_columns:
        return ValidationReport(
            status="failed",
            summary={"fatal_count": 1, "warning_count": 0},
            errors=[
                ImportErrorItem(
                    severity="fatal",
                    code="MISSING_REQUIRED_COLUMNS",
                    field="表头",
                    raw_value=",".join(headers),
                    message=f"缺少必填列: {', '.join(missing_columns)}",
                    action="请补齐必填列后重新导入",
                )
            ],
        )

    return ValidationReport(status="success")

from io import BytesIO

from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet

from app.services.aggregate_service import build_subtree_aggregates
from app.services.parse_service import parse_rows_to_flat_nodes
from app.validators.workbook_validator import validate_workbook


ImportResult = dict[str, object]


def _sheet_headers(sheet: Worksheet) -> list[str]:
    return [str(cell.value).strip() for cell in sheet[1]]


def _sheet_rows(sheet: Worksheet, headers: list[str]) -> list[dict[str, object]]:
    return [
        dict(zip(headers, values))
        for values in sheet.iter_rows(min_row=2, values_only=True)
    ]


def import_dataset(file_obj: BytesIO) -> ImportResult:
    workbook = load_workbook(file_obj, data_only=True)
    validation = validate_workbook(workbook)
    if validation.status == "failed":
        return {
            "status": "failed",
            "summary": validation.summary.model_dump(),
            "errors": [item.model_dump() for item in validation.errors],
        }

    sheet = workbook["子项明细"]
    headers = _sheet_headers(sheet)
    rows = _sheet_rows(sheet, headers)
    flat_rows, parse_errors = parse_rows_to_flat_nodes(rows)
    if parse_errors:
        return {
            "status": "failed",
            "summary": {
                "fatal_count": len(parse_errors),
                "warning_count": 0,
            },
            "errors": parse_errors,
        }

    # 右侧分析区会频繁切换焦点节点，导入时预计算整棵子树统计可以保持交互稳定。
    subtree_aggregates = build_subtree_aggregates(flat_rows)
    return {
        "status": "success",
        "summary": {
            "total_rows": len(rows),
            "valid_rows": len(flat_rows),
            "warning_count": 0,
        },
        "rows": flat_rows,
        "subtree_aggregates": subtree_aggregates,
        "warnings": [],
    }

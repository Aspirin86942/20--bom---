from io import BytesIO
from decimal import Decimal

from openpyxl import Workbook

from app.services.import_service import import_dataset


def build_workbook(rows: list[list[object]]) -> BytesIO:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "子项明细"
    sheet.append(["BOM层级", "子项物料编码", "物料名称", "物料属性", "实际数量", "金额"])
    for row in rows:
        sheet.append(row)

    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


def test_import_dataset_returns_rows_and_subtree_aggregates() -> None:
    result = import_dataset(
        build_workbook(
            [
                ["0", "ROOT", "总成", "虚拟", 1, 0],
                [".1", "A", "主模块", "自制", 1, 10],
                ["..2", "B", "子模块", "外购", 2, 5],
            ]
        )
    )

    assert result["status"] == "success"
    assert result["summary"]["total_rows"] == 3
    assert result["summary"]["valid_rows"] == 2
    assert result["summary"]["warning_count"] == 0
    assert result["subtree_aggregates"]["row_3"]["subtree_amount_sum"] == Decimal("15")
    assert result["subtree_aggregates"]["row_3"]["amount_by_attr"]["自制"] == Decimal("10")
    assert result["subtree_aggregates"]["row_3"]["amount_by_attr"]["外购"] == Decimal("5")
    assert result["warnings"] == []


def test_import_dataset_returns_failed_summary_when_parse_errors_exist() -> None:
    result = import_dataset(
        build_workbook(
            [
                ["0", "ROOT", "总成", "虚拟", 1, 0],
                ["1", "A", "主模块", "自制", 1, 10],
            ]
        )
    )

    assert result["status"] == "failed"
    assert result["summary"]["fatal_count"] == 1
    assert result["summary"]["warning_count"] == 0
    assert result["errors"][0]["code"] == "INVALID_LEVEL"

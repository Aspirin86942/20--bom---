from io import BytesIO
from decimal import Decimal

from openpyxl import Workbook

from app.services.import_service import import_dataset


def build_workbook(rows: list[list[object]]) -> BytesIO:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "子项明细"
    sheet.append([
        "BOM层级", "子项物料编码", "物料名称", "规格型号", "物料属性",
        "BOM版本", "数据状态", "单位", "子项类型", "用量:分子", "用量:分母",
        "币别", "单价", "金额", "税率%", "含税单价", "价税合计",
        "材料单价来源", "供应商", "标准用量", "实际数量"
    ])
    for row in rows:
        # 扩展行数据，补齐缺失的列（原始测试数据只有 6 列）
        extended_row = list(row[:3])  # BOM层级, 子项物料编码, 物料名称
        extended_row.extend([""] * 1)  # 规格型号
        extended_row.append(row[3] if len(row) > 3 else "")  # 物料属性
        extended_row.extend(["", "", "", ""])  # BOM版本, 数据状态, 单位, 子项类型
        extended_row.extend([0, 0])  # 用量:分子, 用量:分母
        extended_row.extend(["", row[6] if len(row) > 6 else Decimal("0")])  # 币别, 单价
        extended_row.append(row[5] if len(row) > 5 else Decimal("0"))  # 金额
        extended_row.extend([Decimal("0"), Decimal("0"), Decimal("0")])  # 税率%, 含税单价, 价税合计
        extended_row.extend(["", "", 0])  # 材料单价来源, 供应商, 标准用量
        extended_row.append(row[4] if len(row) > 4 else 0)  # 实际数量
        sheet.append(extended_row)

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
    assert result["indexes"]["where_used"]["A"] == [["A"]]
    assert result["rows"][0]["path_codes"] == ["A"]
    assert result["rows"][1]["path_codes"] == ["A", "B"]
    assert result["subtree_aggregates"]["row_3"]["subtree_amount_sum"] == Decimal("15")
    assert result["subtree_aggregates"]["row_3"]["amount_by_attr"]["自制"] == Decimal("10")
    assert result["subtree_aggregates"]["row_3"]["amount_by_attr"]["外购"] == Decimal("5")
    assert result["warnings"] == []
    assert result["anomalies"] == []


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


def test_import_dataset_populates_anomalies_for_business_rules() -> None:
    result = import_dataset(
        build_workbook(
            [
                ["0", "ROOT", "总成", "虚拟", 1, 0],
                [".1", "A", "主模块", "", 0, 0],
                ["..2", "B", "子模块", "外购", -1, 5],
            ]
        )
    )

    assert result["status"] == "success"
    assert result["summary"]["warning_count"] == 4
    assert [item["code"] for item in result["anomalies"]] == [
        "MISSING_ATTR",
        "NON_POSITIVE_QTY",
        "MISSING_OR_ZERO_AMOUNT",
        "NON_POSITIVE_QTY",
    ]
    assert result["warnings"] == result["anomalies"]


def test_import_dataset_does_not_flag_rounded_zero_amount_when_unit_price_is_present() -> None:
    result = import_dataset(
        build_workbook(
            [
                ["0", "ROOT", "总成", "虚拟", 1, 0],
                [".1", "Y.C.40050", "贴片电容", "外购", 2, 0, Decimal("0.001858")],
            ]
        )
    )

    assert result["status"] == "success"
    assert result["rows"][0]["amount"] == Decimal("0.003716")
    assert result["summary"]["warning_count"] == 0
    assert result["anomalies"] == []

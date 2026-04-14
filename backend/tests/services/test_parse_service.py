from decimal import Decimal

from app.services.parse_service import parse_rows_to_flat_nodes


def test_parse_rows_to_flat_nodes_builds_parent_links() -> None:
    rows = [
        {"BOM层级": "0", "子项物料编码": "ROOT", "物料名称": "总成", "物料属性": "虚拟", "实际数量": 1, "金额": 0},
        {"BOM层级": ".1", "子项物料编码": "A", "物料名称": "主模块", "物料属性": "自制", "实际数量": 1, "金额": Decimal("10")},
        {"BOM层级": "..2", "子项物料编码": "B", "物料名称": "子模块", "物料属性": "外购", "实际数量": 2, "金额": Decimal("5")},
    ]

    flat_rows, errors = parse_rows_to_flat_nodes(rows)

    assert errors == []
    assert [item["code"] for item in flat_rows] == ["A", "B"]
    assert flat_rows[0]["parent_id"] == "root_2"
    assert flat_rows[1]["parent_code"] == "A"
    assert flat_rows[1]["top_level_code"] == "A"

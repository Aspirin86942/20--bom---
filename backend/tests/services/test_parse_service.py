from decimal import Decimal

from app.services.parse_service import parse_rows_to_flat_nodes


def build_row(
    level: str,
    code: str,
    name: str,
    attr: str = "自制",
    qty: object = 1,
    amount: object = Decimal("0"),
) -> dict[str, object]:
    return {
        "BOM层级": level,
        "子项物料编码": code,
        "物料名称": name,
        "物料属性": attr,
        "实际数量": qty,
        "金额": amount,
    }


def test_parse_rows_to_flat_nodes_builds_parent_links() -> None:
    rows = [
        build_row("0", "ROOT", "总成", attr="虚拟", qty=1, amount=0),
        build_row(".1", "A", "主模块", attr="自制", qty=1, amount=Decimal("10")),
        build_row("..2", "B", "子模块", attr="外购", qty=2, amount=Decimal("5")),
    ]

    flat_rows, errors = parse_rows_to_flat_nodes(rows)

    assert errors == []
    assert [item["code"] for item in flat_rows] == ["A", "B"]
    assert flat_rows[0]["parent_id"] == "root_2"
    assert flat_rows[1]["parent_code"] == "A"
    assert flat_rows[1]["top_level_code"] == "A"
    assert isinstance(flat_rows[0]["qty_actual"], Decimal)
    assert isinstance(flat_rows[1]["amount"], Decimal)


def test_parse_rows_to_flat_nodes_reports_missing_parent() -> None:
    rows = [
        build_row("0", "ROOT", "总成", attr="虚拟", qty=1, amount=0),
        build_row("..2", "B", "子模块", attr="外购", qty=2, amount=Decimal("5")),
    ]

    flat_rows, errors = parse_rows_to_flat_nodes(rows)

    assert flat_rows == []
    assert len(errors) == 1
    assert errors[0]["code"] == "MISSING_PARENT"
    assert errors[0]["row_index"] == 3


def test_parse_rows_to_flat_nodes_reports_invalid_level_text() -> None:
    rows = [
        build_row("0", "ROOT", "总成", attr="虚拟", qty=1, amount=0),
        build_row("1", "A", "主模块", attr="自制", qty=1, amount=Decimal("10")),
    ]

    flat_rows, errors = parse_rows_to_flat_nodes(rows)

    assert flat_rows == []
    assert len(errors) == 1
    assert errors[0]["code"] == "INVALID_LEVEL"
    assert errors[0]["field"] == "BOM层级"


def test_parse_rows_to_flat_nodes_reports_invalid_decimal_value() -> None:
    rows = [
        build_row("0", "ROOT", "总成", attr="虚拟", qty=1, amount=0),
        build_row(".1", "A", "主模块", attr="自制", qty="abc", amount=Decimal("10")),
    ]

    flat_rows, errors = parse_rows_to_flat_nodes(rows)

    assert flat_rows == []
    assert len(errors) == 1
    assert errors[0]["code"] == "INVALID_DECIMAL"
    assert errors[0]["field"] == "实际数量"

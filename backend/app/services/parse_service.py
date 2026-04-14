from decimal import Decimal

from app.utils.level_parser import parse_depth


def _to_decimal(value: object) -> Decimal:
    if value in (None, ""):
        return Decimal("0")
    return Decimal(str(value))


def build_root_context(raw: dict[str, object], row_index: int) -> dict[str, object]:
    return {
        "id": f"root_{row_index}",
        "code": str(raw["子项物料编码"]),
        "name": str(raw["物料名称"]),
        "level": 0,
    }


def parse_rows_to_flat_nodes(rows: list[dict[str, object]]) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    flat_rows: list[dict[str, object]] = []
    errors: list[dict[str, object]] = []
    level_stack: dict[int, dict[str, object]] = {}

    for row_index, raw in enumerate(rows, start=2):
        depth = parse_depth(str(raw["BOM层级"]))

        # 根节点只用来承接 .1，不输出到分析表
        if depth == 0:
            level_stack = {0: build_root_context(raw, row_index)}
            continue

        parent = level_stack.get(depth - 1)
        if parent is None:
            errors.append(
                {
                    "severity": "fatal",
                    "code": "MISSING_PARENT",
                    "row_index": row_index,
                    "field": "BOM层级",
                    "raw_value": str(raw["BOM层级"]),
                    "message": "当前节点缺少父级，无法建立路径",
                    "action": "请修正源 Excel 后重新导入",
                }
            )
            continue

        current = {
            "id": f"row_{row_index}",
            "parent_id": str(parent["id"]),
            "level": depth,
            "sort_index": row_index,
            "bom_level_raw": str(raw["BOM层级"]),
            "top_level_code": str(raw["子项物料编码"]) if depth == 1 else str(level_stack[1]["code"]),
            "top_level_name": str(raw["物料名称"]) if depth == 1 else str(level_stack[1]["name"]),
            "parent_code": str(parent["code"]),
            "parent_name": str(parent["name"]),
            "code": str(raw["子项物料编码"]),
            "name": str(raw["物料名称"]),
            "attr": str(raw["物料属性"]),
            "qty_actual": _to_decimal(raw["实际数量"]),
            "amount": _to_decimal(raw["金额"]),
        }
        flat_rows.append(current)
        level_stack[depth] = current
        level_stack = {k: v for k, v in level_stack.items() if k <= depth}

    return flat_rows, errors

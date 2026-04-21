from decimal import Decimal, InvalidOperation

from app.utils.level_parser import parse_depth


ParseErrorItem = dict[str, object]
FlatRowItem = dict[str, object]


def _append_error(
    errors: list[ParseErrorItem],
    *,
    code: str,
    row_index: int,
    field: str,
    raw_value: object,
    message: str,
    action: str,
) -> None:
    errors.append(
        {
            "severity": "fatal",
            "code": code,
            "row_index": row_index,
            "field": field,
            "raw_value": str(raw_value),
            "message": message,
            "action": action,
        }
    )


def _safe_str(value: object) -> str:
    """安全转换为字符串，None 或空值返回空字符串"""
    if value is None:
        return ""
    return str(value).strip()


def _safe_int(value: object) -> int:
    """安全转换为整数，None 或空值返回 0"""
    if value is None:
        return 0
    normalized = str(value).strip()
    if normalized == "":
        return 0
    try:
        return int(float(normalized))  # 支持 "1.0" 这类格式
    except (ValueError, OverflowError):
        return 0


def _safe_decimal(value: object) -> Decimal:
    """安全转换为 Decimal，None 或空值返回 0，非法值返回 0（不抛出错误）"""
    if value is None:
        return Decimal("0")
    normalized = str(value).strip()
    if normalized == "":
        return Decimal("0")
    try:
        parsed = Decimal(normalized)
        if not parsed.is_finite():
            return Decimal("0")
        return parsed
    except InvalidOperation:
        return Decimal("0")


def _to_decimal(value: object, *, field: str, row_index: int, errors: list[ParseErrorItem]) -> Decimal | None:
    """严格转换为 Decimal，用于关键字段（实际数量、金额），失败时记录错误并返回 None"""
    if value is None:
        return Decimal("0")
    normalized = str(value).strip()
    if normalized == "":
        return Decimal("0")
    try:
        parsed = Decimal(normalized)
    except InvalidOperation:
        _append_error(
            errors,
            code="INVALID_DECIMAL",
            row_index=row_index,
            field=field,
            raw_value=value,
            message=f"{field} 不是合法数值",
            action="请修正源 Excel 后重新导入",
        )
        return None
    if not parsed.is_finite():
        _append_error(
            errors,
            code="INVALID_DECIMAL",
            row_index=row_index,
            field=field,
            raw_value=value,
            message=f"{field} 不是合法数值",
            action="请修正源 Excel 后重新导入",
        )
        return None
    return parsed


def build_root_context(raw: dict[str, object], row_index: int) -> FlatRowItem:
    return {
        "id": f"root_{row_index}",
        "code": str(raw["子项物料编码"]),
        "name": str(raw["物料名称"]),
        "level": 0,
    }


def parse_rows_to_flat_nodes(rows: list[dict[str, object]]) -> tuple[list[FlatRowItem], list[ParseErrorItem]]:
    flat_rows: list[FlatRowItem] = []
    errors: list[ParseErrorItem] = []
    level_stack: dict[int, FlatRowItem] = {}

    for row_index, raw in enumerate(rows, start=2):
        try:
            depth = parse_depth(raw["BOM层级"])
        except ValueError:
            _append_error(
                errors,
                code="INVALID_LEVEL",
                row_index=row_index,
                field="BOM层级",
                raw_value=raw["BOM层级"],
                message="BOM层级 格式非法，必须为 0 或 .1 / ..2 这类层级标记",
                action="请修正源 Excel 后重新导入",
            )
            continue

        # 根节点只用来承接 .1，不输出到分析表
        if depth == 0:
            level_stack = {0: build_root_context(raw, row_index)}
            continue

        parent = level_stack.get(depth - 1)
        if parent is None:
            _append_error(
                errors,
                code="MISSING_PARENT",
                row_index=row_index,
                field="BOM层级",
                raw_value=raw["BOM层级"],
                message="当前节点缺少父级，无法建立路径",
                action="请修正源 Excel 后重新导入",
            )
            continue

        # 数值字段必须先完成结构化校验，避免单个脏单元格直接打断整批解析。
        qty_actual = _to_decimal(raw["实际数量"], field="实际数量", row_index=row_index, errors=errors)
        amount = _to_decimal(raw["金额"], field="金额", row_index=row_index, errors=errors)
        if qty_actual is None or amount is None:
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
            "spec_model": _safe_str(raw["规格型号"]),
            # 空属性需要保留为空字符串，后续异常扫描才能区分“缺失”与“明确填值”。
            "attr": _safe_str(raw["物料属性"]),
            "bom_version": _safe_str(raw["BOM版本"]),
            "data_status": _safe_str(raw["数据状态"]),
            "unit": _safe_str(raw["单位"]),
            "sub_item_type": _safe_str(raw["子项类型"]),
            "qty_numerator": _safe_int(raw["用量:分子"]),
            "qty_denominator": _safe_int(raw["用量:分母"]),
            "currency": _safe_str(raw["币别"]),
            "unit_price": _safe_decimal(raw["单价"]),
            "tax_rate": _safe_decimal(raw["税率%"]),
            "unit_price_with_tax": _safe_decimal(raw["含税单价"]),
            "total_price_with_tax": _safe_decimal(raw["价税合计"]),
            "price_source": _safe_str(raw["材料单价来源"]),
            "supplier": _safe_str(raw["供应商"]),
            "standard_qty": _safe_int(raw["标准用量"]),
            "qty_actual": qty_actual,
            "amount": amount,
        }
        flat_rows.append(current)
        level_stack[depth] = current
        level_stack = {k: v for k, v in level_stack.items() if k <= depth}

    return flat_rows, errors

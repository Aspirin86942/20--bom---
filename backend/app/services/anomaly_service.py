from __future__ import annotations

from decimal import Decimal, InvalidOperation


AnomalyItem = dict[str, object]


def _normalize_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _coerce_decimal(value: object) -> Decimal | None:
    if value is None:
        return None

    normalized = _normalize_text(value)
    if normalized == "":
        return None

    try:
        parsed = Decimal(normalized)
    except (InvalidOperation, ValueError):
        return None

    if not parsed.is_finite():
        return None
    return parsed


def _append_anomaly(
    anomalies: list[AnomalyItem],
    *,
    node_id: str,
    code: str,
    severity: str,
    field: str,
    message: str,
    action: str,
) -> None:
    anomalies.append(
        {
            "id": f"{node_id}:{code}:{field}",
            "severity": severity,
            "code": code,
            "node_id": node_id,
            "field": field,
            "message": message,
            "action": action,
        }
    )


def scan_anomalies(rows: list[dict[str, object]]) -> list[AnomalyItem]:
    """扫描导入后的扁平节点，返回可直接持久化/查询的异常项列表。

    这里不做结构性失败判断，只识别 MVP 规则集中的业务异常：
    - 物料属性缺失
    - 实际数量 <= 0
    - 金额缺失或为 0
    """
    anomalies: list[AnomalyItem] = []

    for row in rows:
        node_id = _normalize_text(row.get("id"))
        if not node_id:
            continue

        attr = _normalize_text(row.get("attr"))
        if not attr:
            _append_anomaly(
                anomalies,
                node_id=node_id,
                code="MISSING_ATTR",
                severity="warning",
                field="attr",
                message="物料属性缺失",
                action="请补充物料属性后重新导入",
            )

        qty_actual = _coerce_decimal(row.get("qty_actual"))
        if qty_actual is None or qty_actual <= 0:
            _append_anomaly(
                anomalies,
                node_id=node_id,
                code="NON_POSITIVE_QTY",
                severity="warning",
                field="qty_actual",
                message="实际数量小于等于 0",
                action="请修正实际数量后重新导入",
            )

        amount = _coerce_decimal(row.get("amount"))
        if amount is None or amount <= 0:
            _append_anomaly(
                anomalies,
                node_id=node_id,
                code="MISSING_OR_ZERO_AMOUNT",
                severity="warning",
                field="amount",
                message="金额缺失或为 0",
                action="请补充金额或修正源数据后重新导入",
            )

    return anomalies

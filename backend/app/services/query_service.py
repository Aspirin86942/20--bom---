from __future__ import annotations

from decimal import Decimal, InvalidOperation

from app.schemas.dataset_models import DatasetQueryParams
from app.schemas.query_models import QuerySnapshot


NumericSortKeys = {"amount", "qty_actual", "qty_numerator", "qty_denominator", "standard_qty", "level", "sort_index"}


def _normalize_text(value: object) -> str:
    return str(value).strip().casefold()


def _row_amount(row: dict[str, object]) -> Decimal | None:
    value = row.get("amount")
    if value is None:
        return None
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None
    return parsed if parsed.is_finite() else None


def _sort_row_value(row: dict[str, object], sort_key: str) -> tuple[int, object]:
    value = row.get(sort_key)
    if value is None:
        return (1, "")
    if sort_key in NumericSortKeys:
        try:
            return (0, Decimal(str(value)))
        except (InvalidOperation, ValueError):
            return (0, Decimal("0"))
    return (0, str(value))


def _sort_rows(rows: list[dict[str, object]], sort_key: str, sort_order: str) -> list[dict[str, object]]:
    reverse = sort_order.lower() == "desc"
    present_rows: list[dict[str, object]] = []
    missing_rows: list[dict[str, object]] = []

    for row in rows:
        if row.get(sort_key) is None:
            missing_rows.append(row)
        else:
            present_rows.append(row)

    present_rows.sort(key=lambda row: _sort_row_value(row, sort_key), reverse=reverse)
    return present_rows + missing_rows


def apply_query_snapshot(
    rows: list[dict[str, object]],
    query: QuerySnapshot | DatasetQueryParams,
) -> list[dict[str, object]]:
    """Apply the dataset query snapshot to raw rows.

    保持这个函数尽量轻量：先做过滤，再做排序，避免把查询规则散落到路由层。
    """
    filtered_rows = list(rows)

    if query.search:
        keyword = _normalize_text(query.search)
        filtered_rows = [
            row
            for row in filtered_rows
            if keyword in _normalize_text(row.get("code"))
            or keyword in _normalize_text(row.get("name"))
            or keyword in _normalize_text(row.get("spec_model"))
            or keyword in _normalize_text(row.get("attr"))
        ]

    if query.material_attr:
        material_attr = _normalize_text(query.material_attr)
        filtered_rows = [row for row in filtered_rows if _normalize_text(row.get("attr")) == material_attr]

    if query.status:
        status_value = _normalize_text(query.status)
        filtered_rows = [row for row in filtered_rows if _normalize_text(row.get("data_status")) == status_value]

    if query.amount_min is not None:
        filtered_rows = [
            row
            for row in filtered_rows
            if (row_amount := _row_amount(row)) is not None and row_amount >= query.amount_min
        ]

    if query.level_min is not None:
        filtered_rows = [
            row for row in filtered_rows if isinstance(row.get("level"), int) and row["level"] >= query.level_min
        ]

    if query.level_max is not None:
        filtered_rows = [
            row for row in filtered_rows if isinstance(row.get("level"), int) and row["level"] <= query.level_max
        ]

    sort_key = query.sort_by or "sort_index"
    return _sort_rows(filtered_rows, sort_key, query.sort_order)
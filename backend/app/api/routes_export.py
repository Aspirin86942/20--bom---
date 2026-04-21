from __future__ import annotations

from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Body, HTTPException, Query, status

from app.core.dataset_store import dataset_store
from app.schemas.query_models import ExportRequest, QuerySnapshot
from app.services.export_service import build_error_report_rows, build_export_rows


router = APIRouter()


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


def _apply_query_snapshot(rows: list[dict[str, object]], query: QuerySnapshot) -> list[dict[str, object]]:
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

    if query.amount_min:
        try:
            min_amount = Decimal(query.amount_min)
        except (InvalidOperation, ValueError):
            min_amount = None
        if min_amount is not None:
            filtered_rows = [
                row
                for row in filtered_rows
                if (row_amount := _row_amount(row)) is not None and row_amount >= min_amount
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
    reverse = query.sort_order.lower() == "desc"

    def _sort_value(row: dict[str, object]) -> tuple[int, object]:
        value = row.get(sort_key)
        if value is None:
            return (1, "")
        if sort_key in {"amount", "qty_actual", "qty_numerator", "qty_denominator", "standard_qty", "level", "sort_index"}:
            try:
                return (0, Decimal(str(value)))
            except (InvalidOperation, ValueError):
                return (0, Decimal("0"))
        return (0, str(value))

    filtered_rows.sort(key=_sort_value, reverse=reverse)
    return filtered_rows


@router.post("/api/datasets/{dataset_id}/export")
def export_dataset(
    dataset_id: str,
    mode: str = Query(default="current_view"),
    payload: ExportRequest | None = Body(default=None),
) -> dict[str, object]:
    request = payload if payload is not None else ExportRequest(mode=mode)

    dataset = dataset_store.get(dataset_id)
    if dataset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "DATASET_NOT_FOUND",
                "message": f"未找到数据集: {dataset_id}",
                "retryable": False,
            },
        )

    if request.mode == "errors":
        return {"rows": build_error_report_rows(dataset.get("errors", []))}  # type: ignore[arg-type]

    rows = _apply_query_snapshot(dataset.get("rows", []), request.query)  # type: ignore[arg-type]
    return {"rows": build_export_rows(rows)}

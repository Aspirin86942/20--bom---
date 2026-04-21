from __future__ import annotations

from decimal import Decimal
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.dataset_store import dataset_store
from app.schemas.dataset_models import DatasetDetailResponse, DatasetQueryParams
from app.schemas.query_models import QuerySnapshot
from app.services.query_service import apply_query_snapshot

router = APIRouter()

def _query_value(query_params: dict[str, str], snake_name: str, camel_name: str, default: str = "") -> str:
    value = query_params.get(snake_name)
    if value is not None:
        return value
    value = query_params.get(camel_name)
    if value is not None:
        return value
    return default

def _select_optional_int(snake_value: int | None, camel_value: int | None) -> int | None:
    if snake_value is not None:
        return snake_value
    return camel_value

def _select_optional_decimal(snake_value: Decimal | None, camel_value: Decimal | None) -> Decimal | None:
    if snake_value is not None:
        return snake_value
    return camel_value

def _parse_dataset_query_params(
    request: Request,
    amount_min: Decimal | None = Query(default=None, alias="amountMin"),
    amount_min_snake: Decimal | None = Query(default=None, alias="amount_min"),
    level_min: int | None = Query(default=None, alias="levelMin"),
    level_min_snake: int | None = Query(default=None, alias="level_min"),
    level_max: int | None = Query(default=None, alias="levelMax"),
    level_max_snake: int | None = Query(default=None, alias="level_max"),
) -> DatasetQueryParams:
    query_params = request.query_params
    return DatasetQueryParams(
        search=_query_value(query_params, "search", "search"),
        material_attr=_query_value(query_params, "material_attr", "materialAttr"),
        amount_min=_select_optional_decimal(amount_min_snake, amount_min),
        level_min=_select_optional_int(level_min_snake, level_min),
        level_max=_select_optional_int(level_max_snake, level_max),
        status=_query_value(query_params, "status", "status"),
        sort_by=_query_value(query_params, "sort_by", "sortBy", default="sort_index"),
        sort_order=_query_value(query_params, "sort_order", "sortOrder", default="asc"),
    )

@router.get("/api/datasets/{dataset_id}", response_model=DatasetDetailResponse)
def get_dataset(
    dataset_id: str,
    _query: DatasetQueryParams = Depends(_parse_dataset_query_params),
) -> DatasetDetailResponse:
    payload = dataset_store.get(dataset_id)
    if payload is None:
        # 返回结构化错误模型，避免 KeyError 泄漏成 500。
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "DATASET_NOT_FOUND",
                "message": f"未找到数据集: {dataset_id}",
                "retryable": False,
            },
        )

    rows = cast(list[dict[str, object]], payload.get("rows", []))
    query = QuerySnapshot.model_validate(_query.model_dump())
    filtered_rows = apply_query_snapshot(rows, query)

    return DatasetDetailResponse(
        dataset_id=dataset_id,
        rows=filtered_rows,
        subtree_aggregates=cast(dict[str, dict[str, object]], payload.get("subtree_aggregates", {})),
        warnings=cast(list[dict[str, object]], payload.get("warnings", [])),
    )

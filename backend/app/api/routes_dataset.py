from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.dataset_store import dataset_store
from app.schemas.dataset_models import DatasetDetailResponse, DatasetQueryParams


router = APIRouter()


def _query_value(query_params: dict[str, str], snake_name: str, camel_name: str, default: str = "") -> str:
    value = query_params.get(snake_name)
    if value is not None:
        return value
    value = query_params.get(camel_name)
    if value is not None:
        return value
    return default


def _query_int(query_params: dict[str, str], snake_name: str, camel_name: str) -> int | None:
    raw_value = _query_value(query_params, snake_name, camel_name, default="")
    if raw_value == "":
        return None
    try:
        return int(raw_value)
    except ValueError:
        return None


def _parse_dataset_query_params(request: Request) -> DatasetQueryParams:
    query_params = request.query_params
    return DatasetQueryParams(
        search=_query_value(query_params, "search", "search"),
        material_attr=_query_value(query_params, "material_attr", "materialAttr"),
        amount_min=_query_value(query_params, "amount_min", "amountMin"),
        level_min=_query_int(query_params, "level_min", "levelMin"),
        level_max=_query_int(query_params, "level_max", "levelMax"),
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

    return DatasetDetailResponse(
        dataset_id=dataset_id,
        rows=payload.get("rows", []),  # type: ignore[arg-type]
        subtree_aggregates=payload.get("subtree_aggregates", {}),  # type: ignore[arg-type]
        warnings=payload.get("warnings", []),  # type: ignore[arg-type]
    )

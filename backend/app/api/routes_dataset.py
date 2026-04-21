from fastapi import APIRouter, HTTPException, status

from app.core.dataset_store import dataset_store
from app.schemas.dataset_models import DatasetDetailResponse


router = APIRouter()


@router.get("/api/datasets/{dataset_id}", response_model=DatasetDetailResponse)
def get_dataset(dataset_id: str) -> DatasetDetailResponse:
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

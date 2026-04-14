from fastapi import APIRouter

from app.core.dataset_store import dataset_store
from app.schemas.dataset_models import DatasetDetailResponse


router = APIRouter()


@router.get("/api/datasets/{dataset_id}", response_model=DatasetDetailResponse)
def get_dataset(dataset_id: str) -> DatasetDetailResponse:
    payload = dataset_store.get(dataset_id)
    return DatasetDetailResponse(
        dataset_id=dataset_id,
        rows=payload.get("rows", []),  # type: ignore[arg-type]
        subtree_aggregates=payload.get("subtree_aggregates", {}),  # type: ignore[arg-type]
        warnings=payload.get("warnings", []),  # type: ignore[arg-type]
    )

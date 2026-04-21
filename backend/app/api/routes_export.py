from fastapi import APIRouter, Body, HTTPException, Query, status

from app.core.dataset_store import dataset_store
from app.schemas.query_models import ExportRequest
from app.services.export_service import build_error_report_rows, build_export_rows
from app.services.query_service import apply_query_snapshot


router = APIRouter()


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

    rows = apply_query_snapshot(dataset.get("rows", []), request.query)  # type: ignore[arg-type]
    return {"rows": build_export_rows(rows)}
from fastapi import APIRouter

from app.core.dataset_store import dataset_store
from app.services.export_service import build_error_report_rows, build_export_rows


router = APIRouter()


@router.post("/api/datasets/{dataset_id}/export")
def export_dataset(dataset_id: str, mode: str = "current_view") -> dict[str, object]:
    payload = dataset_store.get(dataset_id)
    if mode == "errors":
        return {"rows": build_error_report_rows(payload.get("errors", []))}  # type: ignore[arg-type]
    return {"rows": build_export_rows(payload.get("rows", []))}  # type: ignore[arg-type]

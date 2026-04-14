from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, File, UploadFile

from app.core.dataset_store import dataset_store
from app.schemas.dataset_models import ImportResponse
from app.services.import_service import import_dataset


router = APIRouter()


@router.post("/api/import", response_model=ImportResponse)
async def import_bom(file: UploadFile = File(...)) -> ImportResponse:
    result = import_dataset(BytesIO(await file.read()))
    dataset_id = f"ds_{uuid4().hex[:8]}"

    # 导入结果先落到本地内存缓存，后续详情页和导出都复用这一份解析结果。
    dataset_store.save(dataset_id, result)
    return ImportResponse(
        dataset_id=dataset_id,
        status=str(result["status"]),
        summary=result["summary"],  # type: ignore[arg-type]
        errors=result.get("errors", []),  # type: ignore[arg-type]
    )

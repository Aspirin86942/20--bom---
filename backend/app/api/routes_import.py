import logging
from io import BytesIO
from uuid import uuid4
from zipfile import BadZipFile

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from openpyxl.utils.exceptions import InvalidFileException

from app.core.dataset_store import dataset_store
from app.schemas.dataset_models import ImportResponse
from app.services.import_service import import_dataset


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/import", response_model=ImportResponse)
async def import_bom(file: UploadFile = File(...)) -> ImportResponse:
    logger.info(f"开始导入文件: {file.filename}, 大小: {file.size} bytes")

    file_content = await file.read()
    logger.info(f"文件读取完成，开始解析...")

    try:
        result = import_dataset(BytesIO(file_content))
    except (InvalidFileException, BadZipFile, ValueError):
        logger.exception("导入失败：上传文件不是有效的 Excel 工作簿")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_WORKBOOK",
                "message": "上传文件无效或已损坏，请重新导出后再试",
                "retryable": False,
            },
        ) from None
    logger.info(f"解析完成，状态: {result['status']}")

    dataset_id = f"ds_{uuid4().hex[:8]}"

    # 导入结果先落到本地内存缓存，后续详情页和导出都复用这一份解析结果。
    dataset_store.save(dataset_id, result)
    logger.info(f"数据已保存，dataset_id: {dataset_id}")

    return ImportResponse(
        dataset_id=dataset_id,
        status=str(result["status"]),
        summary=result["summary"],  # type: ignore[arg-type]
        errors=result.get("errors", []),  # type: ignore[arg-type]
    )

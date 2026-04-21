import logging

from fastapi import FastAPI

from app.api.routes_dataset import router as dataset_router
from app.api.routes_export import router as export_router
from app.api.routes_import import router as import_router


# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

app = FastAPI(title="BOM Local Analysis Tool")
app.include_router(import_router)
app.include_router(dataset_router)
app.include_router(export_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

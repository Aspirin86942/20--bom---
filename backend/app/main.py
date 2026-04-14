from fastapi import FastAPI

from app.api.routes_dataset import router as dataset_router
from app.api.routes_import import router as import_router


app = FastAPI(title="BOM Local Analysis Tool")
app.include_router(import_router)
app.include_router(dataset_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

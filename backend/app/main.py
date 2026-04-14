from fastapi import FastAPI


app = FastAPI(title="BOM Local Analysis Tool")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

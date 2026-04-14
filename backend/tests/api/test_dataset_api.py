from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.main import app


client = TestClient(app)


def build_file_bytes() -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "子项明细"
    sheet.append(["BOM层级", "子项物料编码", "物料名称", "物料属性", "实际数量", "金额"])
    sheet.append(["0", "ROOT", "总成", "虚拟", 1, 0])
    sheet.append([".1", "A", "主模块", "自制", 1, 10])
    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def test_import_and_fetch_dataset() -> None:
    response = client.post(
        "/api/import",
        files={
            "file": (
                "bom.xlsx",
                build_file_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 200

    dataset_id = response.json()["dataset_id"]
    detail_response = client.get(f"/api/datasets/{dataset_id}")

    assert detail_response.status_code == 200
    assert detail_response.json()["rows"][0]["code"] == "A"

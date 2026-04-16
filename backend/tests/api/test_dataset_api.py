from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.main import app


client = TestClient(app)


def build_file_bytes() -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "子项明细"
    sheet.append([
        "BOM层级", "子项物料编码", "物料名称", "规格型号", "物料属性",
        "BOM版本", "数据状态", "单位", "子项类型", "用量:分子", "用量:分母",
        "币别", "单价", "金额", "税率%", "含税单价", "价税合计",
        "材料单价来源", "供应商", "标准用量", "实际数量"
    ])
    sheet.append(["0", "ROOT", "总成", "", "虚拟", "", "", "", "", 0, 0, "", 0, 0, 0, 0, 0, "", "", 0, 1])
    sheet.append([".1", "A", "主模块", "", "自制", "", "", "", "", 0, 0, "", 0, 10, 0, 0, 0, "", "", 0, 1])
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

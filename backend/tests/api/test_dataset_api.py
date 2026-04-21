from decimal import Decimal
from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.core.dataset_store import dataset_store
from app.main import app
from app.schemas.dataset_models import DatasetQueryParams


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


def test_dataset_query_params_accept_camel_case_aliases() -> None:
    params = DatasetQueryParams.model_validate(
        {
            "search": "主",
            "materialAttr": "自制",
            "amountMin": "10",
            "levelMin": 1,
            "levelMax": 3,
            "sortBy": "code",
            "sortOrder": "desc",
        }
    )

    assert params.search == "主"
    assert params.material_attr == "自制"
    assert params.amount_min == Decimal("10")
    assert params.level_min == 1
    assert params.level_max == 3
    assert params.sort_by == "code"
    assert params.sort_order == "desc"


def test_fetch_dataset_accepts_camel_case_query_params() -> None:
    dataset_id = "camel-query-dataset"
    dataset_store.save(
        dataset_id,
        {
            "rows": [
                {
                    "id": "row_1",
                    "parent_id": "root_1",
                    "level": 1,
                    "code": "A",
                    "name": "主模块",
                    "attr": "自制",
                    "qty_actual": "1",
                    "amount": "10",
                    "sort_index": 2,
                },
                {
                    "id": "row_2",
                    "parent_id": "root_1",
                    "level": 1,
                    "code": "B",
                    "name": "子模块",
                    "attr": "自制",
                    "qty_actual": "1",
                    "amount": "10",
                    "sort_index": 1,
                },
                {
                    "id": "row_3",
                    "parent_id": "root_1",
                    "level": 1,
                    "code": "C",
                    "name": "外部件",
                    "attr": "外购",
                    "qty_actual": "1",
                    "amount": "10",
                    "sort_index": 3,
                },
            ],
            "subtree_aggregates": {},
            "warnings": [],
        },
    )

    response = client.get(
        f"/api/datasets/{dataset_id}",
        params={
            "search": "模块",
            "materialAttr": "自制",
            "sortBy": "code",
            "sortOrder": "desc",
        },
    )

    assert response.status_code == 200
    assert response.json()["dataset_id"] == dataset_id
    assert [row["code"] for row in response.json()["rows"]] == ["B", "A"]


def test_fetch_dataset_rejects_invalid_level_min_query_param() -> None:
    dataset_id = "invalid-level-query-dataset"
    dataset_store.save(
        dataset_id,
        {
            "rows": [
                {
                    "id": "row_1",
                    "parent_id": "root_1",
                    "level": 1,
                    "code": "A",
                    "name": "主模块",
                    "attr": "自制",
                    "qty_actual": "1",
                    "amount": "10",
                    "sort_index": 1,
                }
            ],
            "subtree_aggregates": {},
            "warnings": [],
        },
    )

    response = client.get(
        f"/api/datasets/{dataset_id}",
        params={"levelMin": "abc"},
    )

    assert response.status_code == 422


def test_fetch_dataset_rejects_invalid_amount_min_query_param() -> None:
    dataset_id = "invalid-amount-query-dataset"
    dataset_store.save(
        dataset_id,
        {
            "rows": [
                {
                    "id": "row_1",
                    "parent_id": "root_1",
                    "level": 1,
                    "code": "A",
                    "name": "主模块",
                    "attr": "自制",
                    "qty_actual": "1",
                    "amount": "10",
                    "sort_index": 1,
                }
            ],
            "subtree_aggregates": {},
            "warnings": [],
        },
    )

    response = client.get(
        f"/api/datasets/{dataset_id}",
        params={"amountMin": "abc"},
    )

    assert response.status_code == 422


def test_fetch_dataset_returns_404_error_model_when_dataset_missing() -> None:
    safe_client = TestClient(app, raise_server_exceptions=False)

    response = safe_client.get("/api/datasets/not_exists")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "DATASET_NOT_FOUND"
    assert response.json()["detail"]["retryable"] is False


def test_fetch_dataset_anomalies_supports_severity_filter() -> None:
    dataset_id = "dataset-anomalies"
    dataset_store.save(
        dataset_id,
        {
            "rows": [],
            "subtree_aggregates": {},
            "warnings": [],
            "anomalies": [
                {
                    "id": "row_1:MISSING_ATTR:attr",
                    "severity": "warning",
                    "code": "MISSING_ATTR",
                    "node_id": "row_1",
                    "field": "attr",
                    "message": "物料属性缺失",
                    "action": "请补充物料属性后重新导入",
                },
                {
                    "id": "row_2:NON_POSITIVE_QTY:qty_actual",
                    "severity": "warning",
                    "code": "NON_POSITIVE_QTY",
                    "node_id": "row_2",
                    "field": "qty_actual",
                    "message": "实际数量小于等于 0",
                    "action": "请修正实际数量后重新导入",
                },
            ],
        },
    )

    response = client.get(f"/api/datasets/{dataset_id}/anomalies", params={"severity": "warning"})

    assert response.status_code == 200
    assert response.json() == {
        "dataset_id": dataset_id,
        "anomalies": [
            {
                "id": "row_1:MISSING_ATTR:attr",
                "severity": "warning",
                "code": "MISSING_ATTR",
                "node_id": "row_1",
                "field": "attr",
                "message": "物料属性缺失",
                "action": "请补充物料属性后重新导入",
            },
            {
                "id": "row_2:NON_POSITIVE_QTY:qty_actual",
                "severity": "warning",
                "code": "NON_POSITIVE_QTY",
                "node_id": "row_2",
                "field": "qty_actual",
                "message": "实际数量小于等于 0",
                "action": "请修正实际数量后重新导入",
            },
        ],
    }


def test_fetch_dataset_anomalies_returns_404_when_dataset_missing() -> None:
    safe_client = TestClient(app, raise_server_exceptions=False)

    response = safe_client.get("/api/datasets/not-exists/anomalies")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "DATASET_NOT_FOUND"
    assert response.json()["detail"]["retryable"] is False


def test_fetch_dataset_anomalies_returns_empty_list_for_unknown_severity() -> None:
    dataset_id = "dataset-anomalies-severity-empty"
    dataset_store.save(
        dataset_id,
        {
            "rows": [],
            "subtree_aggregates": {},
            "warnings": [],
            "anomalies": [
                {
                    "id": "row_1:MISSING_ATTR:attr",
                    "severity": "warning",
                    "code": "MISSING_ATTR",
                    "node_id": "row_1",
                    "field": "attr",
                    "message": "物料属性缺失",
                    "action": "请补充物料属性后重新导入",
                }
            ],
        },
    )

    response = client.get(f"/api/datasets/{dataset_id}/anomalies", params={"severity": "fatal"})

    assert response.status_code == 200
    assert response.json() == {"dataset_id": dataset_id, "anomalies": []}


def test_fetch_dataset_anomalies_returns_empty_list_when_dataset_has_no_anomalies() -> None:
    dataset_id = "dataset-anomalies-empty"
    dataset_store.save(
        dataset_id,
        {
            "rows": [],
            "subtree_aggregates": {},
            "warnings": [],
            "anomalies": [],
        },
    )

    response = client.get(f"/api/datasets/{dataset_id}/anomalies")

    assert response.status_code == 200
    assert response.json() == {"dataset_id": dataset_id, "anomalies": []}


def test_fetch_dataset_returns_warnings_matching_anomalies_when_present() -> None:
    dataset_id = "dataset-warnings-from-anomalies"
    dataset_store.save(
        dataset_id,
        {
            "rows": [],
            "subtree_aggregates": {},
            "anomalies": [
                {
                    "id": "row_1:MISSING_ATTR:attr",
                    "severity": "warning",
                    "code": "MISSING_ATTR",
                    "node_id": "row_1",
                    "field": "attr",
                    "message": "物料属性缺失",
                    "action": "请补充物料属性后重新导入",
                }
            ],
        },
    )

    response = client.get(f"/api/datasets/{dataset_id}")

    assert response.status_code == 200
    assert response.json()["warnings"] == response.json()["warnings"]  # smoke check for presence
    assert response.json()["warnings"] == [
        {
            "id": "row_1:MISSING_ATTR:attr",
            "severity": "warning",
            "code": "MISSING_ATTR",
            "node_id": "row_1",
            "field": "attr",
            "message": "物料属性缺失",
            "action": "请补充物料属性后重新导入",
        }
    ]


def test_import_invalid_workbook_returns_400_error_model() -> None:
    safe_client = TestClient(app, raise_server_exceptions=False)

    response = safe_client.post(
        "/api/import",
        files={
            "file": (
                "invalid.xlsx",
                b"not-an-excel-file",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INVALID_WORKBOOK"
    assert response.json()["detail"]["retryable"] is False

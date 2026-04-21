from decimal import Decimal

from fastapi.testclient import TestClient

from app.core.dataset_store import dataset_store
from app.main import app


def test_export_returns_404_when_dataset_missing() -> None:
    safe_client = TestClient(app, raise_server_exceptions=False)

    response = safe_client.post(
        "/api/datasets/not_exists/export",
        json={"mode": "current_view", "query": {}},
    )

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "DATASET_NOT_FOUND"
    assert response.json()["detail"]["message"] == "未找到数据集: not_exists"
    assert response.json()["detail"]["retryable"] is False


def test_export_legacy_query_mode_without_body_still_works() -> None:
    dataset_id = "export-legacy-query-dataset"
    dataset_store.save(
        dataset_id,
        {
            "rows": [
                {
                    "code": "A",
                    "name": "主模块",
                    "spec_model": "X1",
                    "attr": "自制",
                    "qty_actual": Decimal("1"),
                    "amount": Decimal("10"),
                    "sort_index": 1,
                }
            ],
            "errors": [],
        },
    )

    safe_client = TestClient(app, raise_server_exceptions=False)
    response = safe_client.post(f"/api/datasets/{dataset_id}/export", params={"mode": "current_view"})

    assert response.status_code == 200
    assert response.json()["rows"] == [
        {
            "物料编码": "A",
            "物料名称": "主模块",
            "物料属性": "自制",
            "实际数量": "1",
            "金额": "10",
        }
    ]


def test_export_current_view_applies_query_snapshot() -> None:
    dataset_id = "export-filter-dataset"
    dataset_store.save(
        dataset_id,
        {
            "rows": [
                {
                    "code": "A",
                    "name": "主模块",
                    "spec_model": "X1",
                    "attr": "自制",
                    "data_status": "生效",
                    "qty_actual": Decimal("1"),
                    "amount": Decimal("10"),
                    "sort_index": 2,
                },
                {
                    "code": "B",
                    "name": "子模块",
                    "spec_model": "Y2",
                    "attr": "外购",
                    "data_status": "失效",
                    "qty_actual": Decimal("2"),
                    "amount": Decimal("20"),
                    "sort_index": 1,
                },
            ],
            "errors": [],
        },
    )

    safe_client = TestClient(app, raise_server_exceptions=False)
    response = safe_client.post(
        f"/api/datasets/{dataset_id}/export",
        json={
            "mode": "current_view",
            "query": {
                "search": "主",
                "materialAttr": "自制",
                "amountMin": "5",
                "sortBy": "code",
                "sortOrder": "asc",
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["rows"] == [
        {
            "物料编码": "A",
            "物料名称": "主模块",
            "物料属性": "自制",
            "实际数量": "1",
            "金额": "10",
        }
    ]

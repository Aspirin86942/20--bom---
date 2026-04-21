from fastapi.testclient import TestClient

from app.core.dataset_store import dataset_store
from app.main import app


client = TestClient(app)


def test_where_used_returns_paths_for_matching_code() -> None:
    dataset_id = "where-used-dataset"
    dataset_store.save(
        dataset_id,
        {
            "rows": [
                {
                    "id": "row_1",
                    "parent_id": "root_0",
                    "code": "A",
                    "name": "总成A",
                },
                {
                    "id": "row_2",
                    "parent_id": "row_1",
                    "code": "B",
                    "name": "组件B",
                },
            ],
            "indexes": {
                "where_used": {
                    "A": [["A"]],
                    "B": [["A", "B"]],
                }
            },
        },
    )

    response = client.get(f"/api/datasets/{dataset_id}/where-used", params={"code": "B"})

    assert response.status_code == 200
    assert response.json() == {"code": "B", "paths": [["A", "B"]]}


def test_where_used_returns_404_when_dataset_missing() -> None:
    safe_client = TestClient(app, raise_server_exceptions=False)

    response = safe_client.get("/api/datasets/not_exists/where-used", params={"code": "A"})

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "DATASET_NOT_FOUND"
    assert response.json()["detail"]["retryable"] is False


def test_where_used_returns_structured_error_when_code_is_missing() -> None:
    safe_client = TestClient(app, raise_server_exceptions=False)

    dataset_id = "where-used-missing-code"
    dataset_store.save(dataset_id, {"rows": [], "indexes": {}})

    response = safe_client.get(f"/api/datasets/{dataset_id}/where-used")

    assert response.status_code == 400
    assert response.json()["detail"] == {
        "code": "MISSING_QUERY_PARAM",
        "message": "缺少必填参数: code",
        "retryable": False,
    }


def test_where_used_returns_empty_paths_when_indexes_missing() -> None:
    dataset_id = "where-used-no-indexes"
    dataset_store.save(
        dataset_id,
        {
            "rows": [
                {
                    "id": "row_1",
                    "parent_id": "root_0",
                    "code": "A",
                    "name": "总成A",
                }
            ],
        },
    )

    response = client.get(f"/api/datasets/{dataset_id}/where-used", params={"code": "A"})

    assert response.status_code == 200
    assert response.json() == {"code": "A", "paths": []}

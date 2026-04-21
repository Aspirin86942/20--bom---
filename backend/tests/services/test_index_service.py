from app.services.index_service import build_indexes
import pytest


def test_build_indexes_enriches_rows_with_paths_and_where_used() -> None:
    rows = [
        {"id": "row_1", "parent_id": "root_0", "code": "A", "name": "总成A"},
        {"id": "row_2", "parent_id": "row_1", "code": "B", "name": "组件B"},
    ]

    enriched_rows, indexes = build_indexes(rows)

    assert enriched_rows[0]["path_codes"] == ["A"]
    assert enriched_rows[0]["path_names"] == ["总成A"]
    assert enriched_rows[1]["path_codes"] == ["A", "B"]
    assert enriched_rows[1]["path_names"] == ["总成A", "组件B"]
    assert indexes["where_used"]["A"] == [["A"]]
    assert indexes["where_used"]["B"] == [["A", "B"]]


def test_build_indexes_raises_for_invalid_parent_id() -> None:
    rows = [
        {"id": "row_1", "parent_id": "root_0", "code": "A", "name": "总成A"},
        {"id": "row_2", "parent_id": "missing_parent", "code": "B", "name": "组件B"},
    ]

    with pytest.raises(ValueError, match="非法 parent_id"):
        build_indexes(rows)

from app.schemas.query_models import QuerySnapshot
from app.services.query_service import apply_query_snapshot


def test_apply_query_snapshot_filters_by_search_material_attr_and_sorts() -> None:
    rows = [
        {
            "code": "B",
            "name": "子模块",
            "spec_model": "Y2",
            "attr": "自制",
            "sort_index": 2,
        },
        {
            "code": "A",
            "name": "主模块",
            "spec_model": "X1",
            "attr": "自制",
            "sort_index": 1,
        },
        {
            "code": "C",
            "name": "外部件",
            "spec_model": "Z3",
            "attr": "外购",
            "sort_index": 3,
        },
    ]

    query = QuerySnapshot(search="模块", material_attr="自制", sort_by="code", sort_order="desc")

    result = apply_query_snapshot(rows, query)

    assert [row["code"] for row in result] == ["B", "A"]
    assert all(row["attr"] == "自制" for row in result)


def test_apply_query_snapshot_keeps_missing_sort_fields_at_end_in_desc_order() -> None:
    rows = [
        {"code": "A", "sort_index": 1},
        {"name": "缺失编码", "sort_index": 2},
        {"code": "C", "sort_index": 3},
    ]

    query = QuerySnapshot(sort_by="code", sort_order="desc")

    result = apply_query_snapshot(rows, query)

    assert [row.get("code") for row in result] == ["C", "A", None]
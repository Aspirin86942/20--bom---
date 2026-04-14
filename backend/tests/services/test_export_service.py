from app.services.export_service import build_error_report_rows, build_export_rows


def test_build_export_rows_keeps_frontend_columns() -> None:
    rows = [
        {
            "code": "A",
            "name": "主模块",
            "attr": "自制",
            "qty_actual": "1",
            "amount": "10",
        }
    ]

    export_rows = build_export_rows(rows)

    assert export_rows == [
        {
            "物料编码": "A",
            "物料名称": "主模块",
            "物料属性": "自制",
            "实际数量": "1",
            "金额": "10",
        }
    ]


def test_build_error_report_rows_maps_error_fields() -> None:
    errors = [
        {
            "severity": "fatal",
            "code": "LEVEL_JUMP",
            "row_index": 12,
            "field": "BOM层级",
            "raw_value": "...3",
            "message": "层级跳跃",
            "action": "修正后重传",
        }
    ]

    report_rows = build_error_report_rows(errors)

    assert report_rows[0]["错误码"] == "LEVEL_JUMP"
    assert report_rows[0]["行号"] == 12

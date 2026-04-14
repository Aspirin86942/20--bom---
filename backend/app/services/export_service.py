def build_export_rows(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    return [
        {
            "物料编码": row.get("code"),
            "物料名称": row.get("name"),
            "物料属性": row.get("attr"),
            "实际数量": str(row.get("qty_actual")),
            "金额": str(row.get("amount")),
        }
        for row in rows
    ]


def build_error_report_rows(
    errors: list[dict[str, object]],
) -> list[dict[str, object]]:
    return [
        {
            "级别": error.get("severity"),
            "错误码": error.get("code"),
            "行号": error.get("row_index"),
            "字段": error.get("field"),
            "原值": error.get("raw_value"),
            "原因": error.get("message"),
            "处理建议": error.get("action"),
        }
        for error in errors
    ]

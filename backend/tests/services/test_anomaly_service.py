from app.services.anomaly_service import scan_anomalies


def test_scan_anomalies_detects_missing_attr_qty_and_amount_issues() -> None:
    rows = [
        {
            "id": "row_1",
            "attr": "",
            "qty_actual": "1",
            "amount": "10",
        },
        {
            "id": "row_2",
            "attr": "自制",
            "qty_actual": "0",
            "amount": "",
        },
        {
            "id": "row_3",
            "attr": "外购",
            "qty_actual": "-2",
            "amount": "0",
        },
    ]

    anomalies = scan_anomalies(rows)

    assert len(anomalies) == 5
    assert anomalies[0] == {
        "id": "row_1:MISSING_ATTR:attr",
        "severity": "warning",
        "code": "MISSING_ATTR",
        "node_id": "row_1",
        "field": "attr",
        "message": "物料属性缺失",
        "action": "请补充物料属性后重新导入",
    }
    assert anomalies[1]["code"] == "NON_POSITIVE_QTY"
    assert anomalies[1]["node_id"] == "row_2"
    assert anomalies[2]["code"] == "MISSING_OR_ZERO_AMOUNT"
    assert anomalies[2]["node_id"] == "row_2"
    assert anomalies[3]["code"] == "NON_POSITIVE_QTY"
    assert anomalies[3]["node_id"] == "row_3"
    assert anomalies[4]["code"] == "MISSING_OR_ZERO_AMOUNT"
    assert anomalies[4]["node_id"] == "row_3"


def test_scan_anomalies_ignores_valid_rows() -> None:
    rows = [
        {
            "id": "row_1",
            "attr": "自制",
            "qty_actual": "1",
            "amount": "10",
        }
    ]

    assert scan_anomalies(rows) == []


def test_scan_anomalies_treats_attr_none_as_missing() -> None:
    rows = [
        {
            "id": "row_1",
            "attr": None,
            "qty_actual": "1",
            "amount": "10",
        }
    ]

    anomalies = scan_anomalies(rows)

    assert len(anomalies) == 1
    assert anomalies[0]["code"] == "MISSING_ATTR"
    assert anomalies[0]["field"] == "attr"


def test_scan_anomalies_treats_missing_attr_key_as_missing() -> None:
    rows = [
        {
            "id": "row_1",
            "qty_actual": "1",
            "amount": "10",
        }
    ]

    anomalies = scan_anomalies(rows)

    assert len(anomalies) == 1
    assert anomalies[0]["code"] == "MISSING_ATTR"
    assert anomalies[0]["field"] == "attr"


def test_scan_anomalies_treats_negative_amount_as_anomaly() -> None:
    rows = [
        {
            "id": "row_1",
            "attr": "自制",
            "qty_actual": "1",
            "amount": "-0.01",
        }
    ]

    anomalies = scan_anomalies(rows)

    assert len(anomalies) == 1
    assert anomalies[0]["code"] == "MISSING_OR_ZERO_AMOUNT"
    assert anomalies[0]["field"] == "amount"

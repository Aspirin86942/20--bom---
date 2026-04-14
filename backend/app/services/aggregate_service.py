from decimal import Decimal


AggregateItem = dict[str, object]
FlatRowItem = dict[str, object]


def _merge_amount_by_attr(target: dict[str, Decimal], source: dict[str, Decimal]) -> None:
    for attr, amount in source.items():
        target[attr] = target.get(attr, Decimal("0")) + amount


def build_subtree_aggregates(rows: list[FlatRowItem]) -> dict[str, AggregateItem]:
    children_map: dict[str, list[str]] = {}
    row_map: dict[str, FlatRowItem] = {}
    aggregates: dict[str, AggregateItem] = {}

    for row in rows:
        row_id = str(row["id"])
        parent_id = str(row["parent_id"])
        row_map[row_id] = row
        children_map.setdefault(parent_id, []).append(row_id)

    def walk(row_id: str) -> AggregateItem:
        cached = aggregates.get(row_id)
        if cached is not None:
            return cached

        row = row_map[row_id]
        qty_sum = Decimal(str(row["qty_actual"]))
        amount_sum = Decimal(str(row["amount"]))
        row_count = 1
        amount_by_attr: dict[str, Decimal] = {
            str(row["attr"]): Decimal(str(row["amount"]))
        }

        # 分析区会高频读取父项整棵子树的统计，这里一次性递归汇总，避免前端重复计算。
        for child_id in children_map.get(row_id, []):
            child_aggregate = walk(child_id)
            row_count += int(child_aggregate["subtree_row_count"])
            qty_sum += Decimal(str(child_aggregate["subtree_qty_sum"]))
            amount_sum += Decimal(str(child_aggregate["subtree_amount_sum"]))
            _merge_amount_by_attr(
                amount_by_attr,
                child_aggregate["amount_by_attr"],  # type: ignore[arg-type]
            )

        aggregate: AggregateItem = {
            "subtree_row_count": row_count,
            "subtree_qty_sum": qty_sum,
            "subtree_amount_sum": amount_sum,
            "amount_by_attr": amount_by_attr,
        }
        aggregates[row_id] = aggregate
        return aggregate

    for row_id in row_map:
        walk(row_id)

    return aggregates

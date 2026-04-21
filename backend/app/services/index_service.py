from __future__ import annotations


FlatRowItem = dict[str, object]
IndexMap = dict[str, object]


def _is_root_sentinel(parent_id: str) -> bool:
    return parent_id.startswith("root_")


def _build_path(
    row_id: str,
    row_map: dict[str, FlatRowItem],
    cache: dict[str, tuple[list[str], list[str]]],
    active_path: set[str],
) -> tuple[list[str], list[str]]:
    cached = cache.get(row_id)
    if cached is not None:
        return cached

    if row_id in active_path:
        raise ValueError(f"检测到循环 parent_id 链: row_id={row_id}")

    active_path.add(row_id)
    row = row_map[row_id]
    parent_id = str(row.get("parent_id", ""))
    parent = row_map.get(parent_id)

    if parent is None:
        if not _is_root_sentinel(parent_id):
            raise ValueError(
                f"非法 parent_id: row_id={row_id}, parent_id={parent_id}"
            )
        path_codes = [str(row.get("code", ""))]
        path_names = [str(row.get("name", ""))]
    else:
        parent_codes, parent_names = _build_path(parent_id, row_map, cache, active_path)
        path_codes = [*parent_codes, str(row.get("code", ""))]
        path_names = [*parent_names, str(row.get("name", ""))]

    cache[row_id] = (path_codes, path_names)
    active_path.remove(row_id)
    return path_codes, path_names


def build_indexes(rows: list[FlatRowItem]) -> tuple[list[FlatRowItem], IndexMap]:
    """为扁平节点补充路径，并构建基础 where-used 倒排索引。

    路径索引必须依赖稳定的 parent_id 关系，所以这里一次性补齐 path_codes/path_names，
    后续查询和反查都直接读取缓存结果，避免在 API 层重复回溯树结构。
    """
    row_map: dict[str, FlatRowItem] = {str(row["id"]): row for row in rows}
    path_cache: dict[str, tuple[list[str], list[str]]] = {}
    where_used: dict[str, list[list[str]]] = {}
    enriched_rows: list[FlatRowItem] = []
    active_path: set[str] = set()

    for row in rows:
        row_id = str(row["id"])
        path_codes, path_names = _build_path(row_id, row_map, path_cache, active_path)

        enriched_row = dict(row)
        enriched_row["path_codes"] = path_codes
        enriched_row["path_names"] = path_names
        enriched_rows.append(enriched_row)

        code = str(row.get("code", ""))
        where_used.setdefault(code, []).append(path_codes)

    return enriched_rows, {"where_used": where_used}

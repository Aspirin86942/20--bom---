import type { FlatRow } from "../types/dataset";

/**
 * 收集所有匹配节点及其完整子树的 ID
 *
 * @param matchedIds - 匹配的节点 ID 集合
 * @param allRows - 所有行数据
 * @returns 包含匹配节点及其所有子孙节点的 ID 集合
 */
export function collectMatchedSubtrees(
  matchedIds: Set<string>,
  allRows: FlatRow[],
): Set<string> {
  const result = new Set<string>();
  const childrenMap = new Map<string, string[]>();

  // 预构建 parent -> children 索引，避免递归过程中反复全表 filter。
  allRows.forEach((row) => {
    const parentId = String(row.parent_id);
    const childIds = childrenMap.get(parentId) ?? [];
    childIds.push(String(row.id));
    childrenMap.set(parentId, childIds);
  });

  const stack = Array.from(matchedIds);
  while (stack.length > 0) {
    const nodeId = stack.pop() as string;
    if (result.has(nodeId)) {
      continue;
    }
    result.add(nodeId);

    const children = childrenMap.get(nodeId) ?? [];
    children.forEach((childId) => stack.push(childId));
  }

  return result;
}

/**
 * 搜索命中时保留祖先链路和完整子树，避免树表只剩孤立节点。
 */
export function collectSearchContextIds(
  matchedIds: Set<string>,
  allRows: FlatRow[],
): Set<string> {
  const result = new Set<string>();
  const rowMap = new Map<string, FlatRow>();
  const childrenMap = new Map<string, string[]>();

  allRows.forEach((row) => {
    const rowId = String(row.id);
    const parentId = String(row.parent_id);
    rowMap.set(rowId, row);

    const childIds = childrenMap.get(parentId) ?? [];
    childIds.push(rowId);
    childrenMap.set(parentId, childIds);
  });

  const appendDescendants = (startId: string): void => {
    const stack = [startId];
    while (stack.length > 0) {
      const currentId = stack.pop() as string;
      if (result.has(currentId)) {
        continue;
      }
      result.add(currentId);
      const childIds = childrenMap.get(currentId) ?? [];
      childIds.forEach((childId) => stack.push(childId));
    }
  };

  matchedIds.forEach((matchedId) => {
    appendDescendants(matchedId);

    let currentId = matchedId;
    while (true) {
      const currentRow = rowMap.get(currentId);
      if (!currentRow) {
        break;
      }

      result.add(String(currentRow.id));
      const parentId = String(currentRow.parent_id);
      if (!parentId || !rowMap.has(parentId)) {
        break;
      }
      currentId = parentId;
    }
  });

  return result;
}

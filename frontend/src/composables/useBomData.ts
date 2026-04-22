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

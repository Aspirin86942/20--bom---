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
  allRows: FlatRow[]
): Set<string> {
  const result = new Set<string>();
  const rowMap = new Map(allRows.map(r => [r.id, r]));

  /**
   * 递归收集节点及其所有子孙
   * 使用深度优先遍历算法
   */
  function collectSubtree(nodeId: string): void {
    // 避免重复收集
    if (result.has(nodeId)) {
      return;
    }

    result.add(nodeId);

    const node = rowMap.get(nodeId);
    if (!node) {
      return;
    }

    // 收集所有直接子节点，递归处理
    allRows
      .filter(r => r.parent_id === nodeId)
      .forEach(child => collectSubtree(child.id));
  }

  // 对每个匹配节点收集其完整子树
  matchedIds.forEach(id => collectSubtree(id));

  return result;
}

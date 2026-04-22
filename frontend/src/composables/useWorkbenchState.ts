import { reactive } from "vue";

import type {
  ViewMode,
  WorkbenchQuerySnapshot,
  WorkbenchState,
} from "../types/dataset";

export const defaultWorkbenchQuerySnapshot: WorkbenchQuerySnapshot = {
  search: "",
  materialAttr: "",
  amountMin: "",
  sortBy: "sort_index",
  sortOrder: "asc",
};

export function useWorkbenchState() {
  const state = reactive<WorkbenchState>({
    viewMode: "tree",
    expandLevel: 2,
    selectedNodeId: "",
    // 预留给后续查询联动任务使用，当前只维护快照结构。
    querySnapshot: { ...defaultWorkbenchQuerySnapshot },
  });

  function setViewMode(mode: ViewMode): void {
    state.viewMode = mode;
  }

  function setExpandLevel(level: number): void {
    state.expandLevel = level;
  }

  function setSelectedNodeId(nodeId: string): void {
    state.selectedNodeId = nodeId;
  }

  function setQuerySnapshot(snapshot: WorkbenchQuerySnapshot): void {
    state.querySnapshot = { ...snapshot };
  }

  return {
    state,
    setViewMode,
    setExpandLevel,
    setSelectedNodeId,
    setQuerySnapshot,
  };
}

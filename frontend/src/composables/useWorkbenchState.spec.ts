import { expect, test } from "vitest";

import {
  defaultWorkbenchQuerySnapshot,
  useWorkbenchState,
} from "./useWorkbenchState";

test("initializes workbench state and updates view mode", () => {
  const { state, setViewMode } = useWorkbenchState();

  expect(state.viewMode).toBe("tree");
  expect(state.expandLevel).toBe(2);
  expect(state.selectedNodeId).toBe("");
  expect(state.querySnapshot).toEqual(defaultWorkbenchQuerySnapshot);

  setViewMode("table");
  expect(state.viewMode).toBe("table");
});

test("updates expand level and selected node id", () => {
  const { state, setExpandLevel, setSelectedNodeId } = useWorkbenchState();

  setExpandLevel(4);
  setSelectedNodeId("row_42");

  expect(state.expandLevel).toBe(4);
  expect(state.selectedNodeId).toBe("row_42");
});

test("copies query snapshot when updated", () => {
  const { state, setQuerySnapshot } = useWorkbenchState();
  const snapshot = {
    search: "A",
    materialAttr: "外购",
    amountMin: "10",
    sortBy: "code",
    sortOrder: "desc" as const,
  };

  setQuerySnapshot(snapshot);
  snapshot.search = "B";
  snapshot.materialAttr = "自制";

  expect(state.querySnapshot).toEqual({
    search: "A",
    materialAttr: "外购",
    amountMin: "10",
    sortBy: "code",
    sortOrder: "desc",
  });

  state.querySnapshot.amountMin = "20";
  expect(snapshot.amountMin).toBe("10");
});

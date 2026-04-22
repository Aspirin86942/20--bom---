# Web BOM Viewer Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 BOM 本地分析工具升级为“可快速定位问题、理解结构关系、支持影响判断”的网页端工作台，先完成 MVP，并为二期 where-used / 异常中心 / 对比能力打基础。

**Architecture:** 后端在现有导入与聚合链路上新增查询快照、路径索引、导出一致性和异常规则能力；前端引入工作台状态模型（视图模式、查询快照、选中节点），实现树/表/路径多视图、详情侧栏和异常入口。全链路保持“查询口径一致”，即页面展示、状态栏汇总、导出结果一致。

**Tech Stack:** Python 3.10+, FastAPI, openpyxl, Decimal, Vue 3, TypeScript, vxe-table, Vitest, pytest

---

## 文件结构规划

**后端新增文件：**
- `backend/app/schemas/query_models.py`
- `backend/app/services/query_service.py`
- `backend/app/services/index_service.py`
- `backend/app/services/anomaly_service.py`

**后端修改文件：**
- `backend/app/main.py`
- `backend/app/api/routes_dataset.py`
- `backend/app/api/routes_export.py`
- `backend/app/services/import_service.py`
- `backend/app/core/dataset_store.py`
- `backend/app/schemas/dataset_models.py`

**前端新增文件：**
- `frontend/src/composables/useWorkbenchState.ts`
- `frontend/src/components/bom/NodeDetailPanel.vue`
- `frontend/src/components/analysis/AnomalyCenter.vue`

**前端修改文件：**
- `frontend/src/api/dataset.ts`
- `frontend/src/pages/BomWorkbench.vue`
- `frontend/src/components/bom/BomGrid.vue`
- `frontend/src/components/bom/BomGridToolbar.vue`
- `frontend/src/composables/useFilters.ts`
- `frontend/src/composables/useBomData.ts`
- `frontend/src/types/dataset.ts`

**测试文件新增：**
- `backend/tests/services/test_query_service.py`
- `backend/tests/services/test_index_service.py`
- `backend/tests/services/test_anomaly_service.py`
- `backend/tests/api/test_export_api.py`
- `backend/tests/api/test_where_used_api.py`
- `frontend/src/composables/useWorkbenchState.spec.ts`
- `frontend/src/components/bom/NodeDetailPanel.spec.ts`
- `frontend/src/components/analysis/AnomalyCenter.spec.ts`
- `frontend/src/composables/useFilters.integration.spec.ts`

---

### Task 1: 统一查询快照与导出口径

**Files:**
- Create: `backend/app/schemas/query_models.py`
- Modify: `backend/app/api/routes_export.py`
- Modify: `backend/app/api/routes_dataset.py`
- Modify: `backend/app/schemas/dataset_models.py`
- Test: `backend/tests/api/test_export_api.py`

- [ ] **Step 1: 新增查询快照与导出请求模型**

```python
# backend/app/schemas/query_models.py
from pydantic import BaseModel, Field

class QuerySnapshot(BaseModel):
    search: str = ""
    material_attr: str = ""
    amount_min: str = ""
    level_min: int | None = None
    level_max: int | None = None
    status: str = ""
    sort_by: str = "sort_index"
    sort_order: str = "asc"

class ExportRequest(BaseModel):
    mode: str = "current_view"
    query: QuerySnapshot = Field(default_factory=QuerySnapshot)
```

- [ ] **Step 2: 将导出接口改为显式校验 dataset 与 query**

```python
# backend/app/api/routes_export.py (核心片段)
@router.post("/api/datasets/{dataset_id}/export")
def export_dataset(dataset_id: str, payload: ExportRequest) -> dict[str, object]:
    data = dataset_store.get(dataset_id)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "DATASET_NOT_FOUND", "message": f"未找到数据集: {dataset_id}", "retryable": False},
        )
    rows = apply_query_snapshot(data.get("rows", []), payload.query.model_dump())
    if payload.mode == "errors":
        return {"rows": build_error_report_rows(data.get("errors", []))}
    return {"rows": build_export_rows(rows)}
```

- [ ] **Step 3: 为 dataset 查询接口补 query 参数解析入口**

```python
# backend/app/api/routes_dataset.py (核心片段)
@router.get("/api/datasets/{dataset_id}/rows")
def query_dataset_rows(dataset_id: str, search: str = "", material_attr: str = "") -> dict[str, object]:
    data = dataset_store.get(dataset_id)
    if data is None:
        raise HTTPException(status_code=404, detail={"code": "DATASET_NOT_FOUND", "message": "未找到数据集", "retryable": False})
    rows = apply_query_snapshot(data.get("rows", []), {"search": search, "material_attr": material_attr})
    return {"rows": rows}
```

- [ ] **Step 4: 先写失败测试（导出不存在 dataset）**

```python
# backend/tests/api/test_export_api.py
def test_export_returns_404_when_dataset_missing(client):
    resp = client.post("/api/datasets/not_found/export", json={"mode": "current_view", "query": {}})
    assert resp.status_code == 404
    body = resp.json()
    assert body["detail"]["code"] == "DATASET_NOT_FOUND"
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `cd backend && conda run -n test pytest tests/api/test_export_api.py -v`  
Expected: `1 passed`

- [ ] **Step 6: 提交**

```bash
git add backend/app/schemas/query_models.py backend/app/api/routes_export.py backend/app/api/routes_dataset.py backend/app/schemas/dataset_models.py backend/tests/api/test_export_api.py
git commit -m "feat: unify query snapshot and export consistency with dataset validation"
```

---

### Task 2: 落地后端查询服务（搜索/筛选/排序）

**Files:**
- Create: `backend/app/services/query_service.py`
- Test: `backend/tests/services/test_query_service.py`
- Modify: `backend/app/api/routes_dataset.py`

- [ ] **Step 1: 先写查询服务失败测试（组合筛选 + 排序）**

```python
# backend/tests/services/test_query_service.py
def test_apply_query_snapshot_filters_and_sorts():
    rows = [
        {"code": "B", "name": "子件B", "attr": "外购", "amount": "20", "level": 2, "sort_index": 2},
        {"code": "A", "name": "子件A", "attr": "自制", "amount": "10", "level": 1, "sort_index": 1},
    ]
    query = {"search": "子件", "material_attr": "外购", "sort_by": "code", "sort_order": "asc"}
    result = apply_query_snapshot(rows, query)
    assert len(result) == 1
    assert result[0]["code"] == "B"
```

- [ ] **Step 2: 实现最小查询服务**

```python
# backend/app/services/query_service.py
def apply_query_snapshot(rows: list[dict[str, object]], query: dict[str, object]) -> list[dict[str, object]]:
    search = str(query.get("search", "")).strip()
    material_attr = str(query.get("material_attr", "")).strip()
    amount_min = str(query.get("amount_min", "")).strip()
    sort_by = str(query.get("sort_by", "sort_index"))
    sort_order = str(query.get("sort_order", "asc"))

    filtered = rows
    if search:
        s = search.lower()
        filtered = [r for r in filtered if s in str(r.get("code", "")).lower() or s in str(r.get("name", "")).lower()]
    if material_attr:
        filtered = [r for r in filtered if str(r.get("attr", "")) == material_attr]
    if amount_min:
        threshold = float(amount_min)
        filtered = [r for r in filtered if float(r.get("amount", 0) or 0) >= threshold]

    reverse = sort_order == "desc"
    return sorted(filtered, key=lambda x: x.get(sort_by, ""), reverse=reverse)
```

- [ ] **Step 3: 数据查询接口接入该服务**

```python
# backend/app/api/routes_dataset.py (核心片段)
rows = apply_query_snapshot(
    payload.get("rows", []),
    {
        "search": search,
        "material_attr": material_attr,
        "amount_min": amount_min,
        "sort_by": sort_by,
        "sort_order": sort_order,
    },
)
```

- [ ] **Step 4: 运行后端服务层测试**

Run: `cd backend && conda run -n test pytest tests/services/test_query_service.py -v`  
Expected: `1 passed`

- [ ] **Step 5: 提交**

```bash
git add backend/app/services/query_service.py backend/app/api/routes_dataset.py backend/tests/services/test_query_service.py
git commit -m "feat: add backend query service for search filters and sorting"
```

---

### Task 3: 构建路径索引与 where-used 基础

**Files:**
- Create: `backend/app/services/index_service.py`
- Modify: `backend/app/services/import_service.py`
- Modify: `backend/app/api/routes_dataset.py`
- Test: `backend/tests/services/test_index_service.py`
- Test: `backend/tests/api/test_where_used_api.py`

- [ ] **Step 1: 先写索引失败测试（路径与反查）**

```python
# backend/tests/services/test_index_service.py
def test_build_indexes_contains_paths_and_reverse_index():
    rows = [
        {"id": "row_1", "parent_id": "root_0", "code": "A", "name": "总成A"},
        {"id": "row_2", "parent_id": "row_1", "code": "B", "name": "组件B"},
    ]
    enriched, indexes = build_indexes(rows)
    assert enriched[1]["path_codes"] == ["A", "B"]
    assert indexes["where_used"]["B"][0] == ["A", "B"]
```

- [ ] **Step 2: 实现索引构建服务**

```python
# backend/app/services/index_service.py (核心片段)
def build_indexes(rows: list[dict[str, object]]) -> tuple[list[dict[str, object]], dict[str, object]]:
    row_map = {str(r["id"]): r for r in rows}
    children_map: dict[str, list[str]] = {}
    for r in rows:
        children_map.setdefault(str(r["parent_id"]), []).append(str(r["id"]))

    def build_path(row_id: str) -> tuple[list[str], list[str]]:
        path_codes: list[str] = []
        path_names: list[str] = []
        current = row_map.get(row_id)
        while current:
            path_codes.append(str(current.get("code", "")))
            path_names.append(str(current.get("name", "")))
            parent_id = str(current.get("parent_id", ""))
            current = row_map.get(parent_id)
        path_codes.reverse()
        path_names.reverse()
        return path_codes, path_names

    reverse_index: dict[str, list[list[str]]] = {}
    for r in rows:
        rid = str(r["id"])
        path_codes, path_names = build_path(rid)
        r["path_codes"] = path_codes
        r["path_names"] = path_names
        code = str(r.get("code", ""))
        reverse_index.setdefault(code, []).append(path_codes)

    return rows, {"children_map": children_map, "where_used": reverse_index}
```

- [ ] **Step 3: 导入流程落库索引元数据**

```python
# backend/app/services/import_service.py (返回片段)
rows_with_paths, indexes = build_indexes(flat_rows)
return {
    "status": "success",
    "rows": rows_with_paths,
    "indexes": indexes,
    "subtree_aggregates": subtree_aggregates,
    "warnings": [],
    "summary": {...},
}
```

- [ ] **Step 4: 增加 where-used API**

```python
# backend/app/api/routes_dataset.py
@router.get("/api/datasets/{dataset_id}/where-used")
def where_used(dataset_id: str, code: str) -> dict[str, object]:
    payload = dataset_store.get(dataset_id)
    if payload is None:
        raise HTTPException(status_code=404, detail={"code": "DATASET_NOT_FOUND", "message": "未找到数据集", "retryable": False})
    where_used_index = payload.get("indexes", {}).get("where_used", {})
    return {"code": code, "paths": where_used_index.get(code, [])}
```

- [ ] **Step 5: 运行索引与 API 测试**

Run: `cd backend && conda run -n test pytest tests/services/test_index_service.py tests/api/test_where_used_api.py -v`  
Expected: `2 passed`

- [ ] **Step 6: 提交**

```bash
git add backend/app/services/index_service.py backend/app/services/import_service.py backend/app/api/routes_dataset.py backend/tests/services/test_index_service.py backend/tests/api/test_where_used_api.py
git commit -m "feat: add path indexes and where-used api foundation"
```

---

### Task 4: 引入异常规则服务（MVP 规则集）

**Files:**
- Create: `backend/app/services/anomaly_service.py`
- Modify: `backend/app/services/import_service.py`
- Modify: `backend/app/api/routes_dataset.py`
- Test: `backend/tests/services/test_anomaly_service.py`

- [ ] **Step 1: 先写异常规则失败测试**

```python
# backend/tests/services/test_anomaly_service.py
def test_scan_anomalies_detects_missing_attr_and_non_positive_qty():
    rows = [
        {"id": "row_1", "code": "A", "attr": "", "qty_actual": "1", "amount": "10"},
        {"id": "row_2", "code": "B", "attr": "外购", "qty_actual": "0", "amount": "0"},
    ]
    items = scan_anomalies(rows)
    codes = {x["code"] for x in items}
    assert "MISSING_ATTR" in codes
    assert "NON_POSITIVE_QTY" in codes
```

- [ ] **Step 2: 实现异常扫描服务**

```python
# backend/app/services/anomaly_service.py
def scan_anomalies(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    for row in rows:
        row_id = str(row.get("id", ""))
        if str(row.get("attr", "")).strip() == "":
            result.append({"id": f"{row_id}-missing-attr", "severity": "high", "code": "MISSING_ATTR", "node_id": row_id, "field": "attr", "message": "物料属性缺失", "action": "补齐物料属性"})
        if float(row.get("qty_actual", 0) or 0) <= 0:
            result.append({"id": f"{row_id}-non-positive-qty", "severity": "high", "code": "NON_POSITIVE_QTY", "node_id": row_id, "field": "qty_actual", "message": "实际数量小于等于 0", "action": "修正用量"})
        if float(row.get("amount", 0) or 0) == 0:
            result.append({"id": f"{row_id}-missing-amount", "severity": "medium", "code": "MISSING_AMOUNT", "node_id": row_id, "field": "amount", "message": "金额缺失或为 0", "action": "补齐成本来源"})
    return result
```

- [ ] **Step 3: 导入阶段写入 anomalies 并提供查询接口**

```python
# backend/app/services/import_service.py (片段)
anomalies = scan_anomalies(rows_with_paths)
...
"anomalies": anomalies,
```

```python
# backend/app/api/routes_dataset.py
@router.get("/api/datasets/{dataset_id}/anomalies")
def get_anomalies(dataset_id: str, severity: str = "") -> dict[str, object]:
    payload = dataset_store.get(dataset_id)
    if payload is None:
        raise HTTPException(status_code=404, detail={"code": "DATASET_NOT_FOUND", "message": "未找到数据集", "retryable": False})
    items = payload.get("anomalies", [])
    if severity:
        items = [x for x in items if str(x.get("severity")) == severity]
    return {"items": items, "count": len(items)}
```

- [ ] **Step 4: 运行异常规则测试**

Run: `cd backend && conda run -n test pytest tests/services/test_anomaly_service.py -v`  
Expected: `1 passed`

- [ ] **Step 5: 提交**

```bash
git add backend/app/services/anomaly_service.py backend/app/services/import_service.py backend/app/api/routes_dataset.py backend/tests/services/test_anomaly_service.py
git commit -m "feat: add anomaly scanning service and anomalies api"
```

---

### Task 5: 前端工作台状态模型（视图 + 查询快照）

**Files:**
- Create: `frontend/src/composables/useWorkbenchState.ts`
- Modify: `frontend/src/pages/BomWorkbench.vue`
- Modify: `frontend/src/types/dataset.ts`
- Test: `frontend/src/composables/useWorkbenchState.spec.ts`

- [ ] **Step 1: 先写失败测试（默认状态与状态更新）**

```typescript
// frontend/src/composables/useWorkbenchState.spec.ts
import { useWorkbenchState } from "./useWorkbenchState";

test("initializes workbench state and updates view mode", () => {
  const { state, setViewMode } = useWorkbenchState();
  expect(state.viewMode).toBe("tree");
  setViewMode("table");
  expect(state.viewMode).toBe("table");
});
```

- [ ] **Step 2: 实现状态 composable**

```typescript
// frontend/src/composables/useWorkbenchState.ts
import { reactive } from "vue";

export type ViewMode = "tree" | "table" | "path";

export function useWorkbenchState() {
  const state = reactive({
    viewMode: "tree" as ViewMode,
    expandLevel: 2,
    selectedNodeId: "",
    querySnapshot: {
      search: "",
      materialAttr: "",
      amountMin: "",
      sortBy: "sort_index",
      sortOrder: "asc",
    },
  });

  function setViewMode(mode: ViewMode): void {
    state.viewMode = mode;
  }

  return { state, setViewMode };
}
```

- [ ] **Step 3: 页面接入统一状态模型**

```typescript
// frontend/src/pages/BomWorkbench.vue (片段)
const { state: workbenchState, setViewMode } = useWorkbenchState();
```

- [ ] **Step 4: 运行前端单测**

Run: `cd frontend && npm run test -- src/composables/useWorkbenchState.spec.ts`  
Expected: `1 passed`

- [ ] **Step 5: 提交**

```bash
git add frontend/src/composables/useWorkbenchState.ts frontend/src/composables/useWorkbenchState.spec.ts frontend/src/pages/BomWorkbench.vue frontend/src/types/dataset.ts
git commit -m "feat: add workbench state model for view mode and query snapshot"
```

---

### Task 6: 前端查询联动与导出口径一致

**Files:**
- Modify: `frontend/src/api/dataset.ts`
- Modify: `frontend/src/composables/useFilters.ts`
- Modify: `frontend/src/pages/BomWorkbench.vue`
- Test: `frontend/src/composables/useFilters.integration.spec.ts`

- [ ] **Step 1: 先写集成测试（查询快照驱动过滤）**

```typescript
// frontend/src/composables/useFilters.integration.spec.ts
test("applies search, attr and amount filters from snapshot", () => {
  const rows = ref([
    { code: "A", name: "主件", attr: "自制", amount: "100" },
    { code: "B", name: "子件", attr: "外购", amount: "50" },
  ] as Array<Record<string, unknown>>);
  const { filters, filteredRows } = useFilters(rows);
  filters.search = "子";
  filters.materialAttr = "外购";
  filters.amountMin = "40";
  expect(filteredRows.value).toHaveLength(1);
  expect(filteredRows.value[0].code).toBe("B");
});
```

- [ ] **Step 2: 扩展 API 层支持 query 快照**

```typescript
// frontend/src/api/dataset.ts (核心片段)
export function exportDataset(datasetId: string, mode = "current_view", query: Record<string, unknown> = {}) {
  return requestJson<{ rows: Array<Record<string, unknown>> }>(
    `/api/datasets/${datasetId}/export`,
    { method: "POST", body: JSON.stringify({ mode, query }), headers: { "Content-Type": "application/json" } },
  );
}
```

- [ ] **Step 3: 页面导出改为传递当前筛选快照**

```typescript
// frontend/src/pages/BomWorkbench.vue (片段)
await exportDataset(state.datasetId, "current_view", {
  search: filters.search,
  material_attr: filters.materialAttr,
  amount_min: filters.amountMin,
});
```

- [ ] **Step 4: 运行前端测试**

Run: `cd frontend && npm run test -- src/composables/useFilters.integration.spec.ts`  
Expected: `1 passed`

- [ ] **Step 5: 提交**

```bash
git add frontend/src/api/dataset.ts frontend/src/composables/useFilters.ts frontend/src/pages/BomWorkbench.vue frontend/src/composables/useFilters.integration.spec.ts
git commit -m "feat: align frontend filtering and export with query snapshot"
```

---

### Task 7: 节点详情侧栏与异常中心入口

**Files:**
- Create: `frontend/src/components/bom/NodeDetailPanel.vue`
- Create: `frontend/src/components/analysis/AnomalyCenter.vue`
- Modify: `frontend/src/pages/BomWorkbench.vue`
- Test: `frontend/src/components/bom/NodeDetailPanel.spec.ts`
- Test: `frontend/src/components/analysis/AnomalyCenter.spec.ts`

- [ ] **Step 1: 先写详情面板失败测试**

```typescript
// frontend/src/components/bom/NodeDetailPanel.spec.ts
import { render, screen } from "@testing-library/vue";
import NodeDetailPanel from "./NodeDetailPanel.vue";

test("renders node details", () => {
  render(NodeDetailPanel, { props: { node: { code: "A001", name: "主件A", bom_version: "V1" } } });
  expect(screen.getByText("A001")).toBeInTheDocument();
  expect(screen.getByText("主件A")).toBeInTheDocument();
});
```

- [ ] **Step 2: 实现节点详情组件**

```vue
<!-- frontend/src/components/bom/NodeDetailPanel.vue -->
<template>
  <aside class="node-detail">
    <h3>节点详情</h3>
    <div v-if="node">
      <p>料号：{{ node.code }}</p>
      <p>名称：{{ node.name }}</p>
      <p>规格：{{ node.spec_model }}</p>
      <p>版本：{{ node.bom_version }}</p>
      <p>单位：{{ node.unit }}</p>
      <p>用量：{{ node.qty_actual }}</p>
      <p>金额：{{ node.amount }}</p>
      <p>状态：{{ node.data_status }}</p>
    </div>
    <p v-else>请选择节点</p>
  </aside>
</template>
<script setup lang="ts">
defineProps<{ node: Record<string, unknown> | null }>();
</script>
```

- [ ] **Step 3: 实现异常中心组件**

```vue
<!-- frontend/src/components/analysis/AnomalyCenter.vue -->
<template>
  <section class="anomaly-center">
    <h3>异常中心</h3>
    <p>异常总数：{{ items.length }}</p>
    <ul>
      <li v-for="item in items" :key="String(item.id)">
        {{ item.code }} - {{ item.message }}
      </li>
    </ul>
  </section>
</template>
<script setup lang="ts">
defineProps<{ items: Array<Record<string, unknown>> }>();
</script>
```

- [ ] **Step 4: 页面接入详情与异常面板**

```vue
<!-- frontend/src/pages/BomWorkbench.vue (片段) -->
<NodeDetailPanel :node="focusRow" />
<AnomalyCenter :items="state.anomalies ?? []" />
```

- [ ] **Step 5: 运行组件测试**

Run: `cd frontend && npm run test -- src/components/bom/NodeDetailPanel.spec.ts src/components/analysis/AnomalyCenter.spec.ts`  
Expected: `2 passed`

- [ ] **Step 6: 提交**

```bash
git add frontend/src/components/bom/NodeDetailPanel.vue frontend/src/components/analysis/AnomalyCenter.vue frontend/src/pages/BomWorkbench.vue frontend/src/components/bom/NodeDetailPanel.spec.ts frontend/src/components/analysis/AnomalyCenter.spec.ts
git commit -m "feat: add node detail panel and anomaly center entry"
```

---

### Task 8: 搜索展开性能优化（children_map）

**Files:**
- Modify: `frontend/src/composables/useBomData.ts`
- Modify: `frontend/src/components/bom/BomGrid.vue`
- Test: `frontend/src/composables/useBomData.spec.ts`

- [ ] **Step 1: 先写性能导向测试（不改变行为）**

```typescript
// frontend/src/composables/useBomData.spec.ts (新增用例核心)
it("collects subtree ids correctly with prebuilt children map", () => {
  const matched = new Set(["1"]);
  const result = collectMatchedSubtrees(matched, testRows);
  expect(result.has("1")).toBe(true);
  expect(result.has("2")).toBe(true);
  expect(result.has("3")).toBe(true);
});
```

- [ ] **Step 2: 改用 children_map + 非递归栈遍历**

```typescript
// frontend/src/composables/useBomData.ts (核心片段)
const childrenMap = new Map<string, string[]>();
allRows.forEach((row) => {
  const pid = String(row.parent_id);
  const list = childrenMap.get(pid) ?? [];
  list.push(String(row.id));
  childrenMap.set(pid, list);
});

const stack = [...matchedIds];
while (stack.length > 0) {
  const id = stack.pop() as string;
  if (result.has(id)) continue;
  result.add(id);
  const children = childrenMap.get(id) ?? [];
  children.forEach((childId) => stack.push(childId));
}
```

- [ ] **Step 3: BomGrid 中删除逐节点 `find` 全表扫描**

```typescript
// frontend/src/components/bom/BomGrid.vue (核心片段)
const rowMap = new Map(props.flatRows.map((r) => [String(r.id), r]));
...
const row = rowMap.get(id);
if (row && gridRef.value?.setTreeExpand) {
  gridRef.value.setTreeExpand(row as Record<string, unknown>, true);
}
```

- [ ] **Step 4: 运行相关测试**

Run: `cd frontend && npm run test -- src/composables/useBomData.spec.ts src/pages/BomWorkbench.flow.spec.ts`  
Expected: `all passed`

- [ ] **Step 5: 提交**

```bash
git add frontend/src/composables/useBomData.ts frontend/src/components/bom/BomGrid.vue frontend/src/composables/useBomData.spec.ts
git commit -m "perf: optimize bom search expansion with children map indexing"
```

---

### Task 9: 端到端验证与文档同步

**Files:**
- Modify: `docs/superpowers/specs/2026-04-21-web-bom-viewer-upgrade-prd.md`
- Modify: `README`（如仓库已有）

- [ ] **Step 1: 运行后端全量测试**

Run: `cd backend && conda run -n test pytest -q`  
Expected: `all passed`

- [ ] **Step 2: 运行前端全量测试**

Run: `cd frontend && npm run test`  
Expected: `all passed`

- [ ] **Step 3: 运行前端构建验证**

Run: `cd frontend && npm run build`  
Expected: `build successfully`

- [ ] **Step 4: 更新 PRD 的“已落地能力”状态**

```markdown
## 实施状态（更新）
- [x] 查询快照与导出口径一致
- [x] 路径与 where-used 基础
- [x] 异常中心 MVP
- [x] 节点详情面板
- [x] 搜索展开性能优化
```

- [ ] **Step 5: 提交**

```bash
git add docs/superpowers/specs/2026-04-21-web-bom-viewer-upgrade-prd.md
git commit -m "docs: sync prd implementation status after mvp upgrade tasks"
```

---

## 计划自检（Spec Coverage）

1. PRD 中的 MVP 能力已覆盖：
- 树/表基础视图与查询一致性
- 强搜索与定位基础
- 节点详情侧栏
- 导出口径一致

2. PRD 中的二期基础已覆盖：
- where-used 索引与 API
- 异常中心规则引擎入口

3. 暂未纳入本计划的能力（需后续单独计划）：
- 版本 A/B 字段级对比完整链路
- 关系图可视化模式
- ERP/PDM/MES 对接

---

## 风险与执行守则

1. 所有金额字段继续使用 `Decimal`，前端仅做显示格式化。
2. 禁止把“导出当前结果”实现成“导出全量数据”。
3. 任何新接口返回错误必须带 `code/message/retryable`。
4. 先补测试再实现，避免回归。

---

## 伪代码草案

### 目标

把“导入 -> 查询 -> 结构定位 -> 异常识别 -> 导出一致性”闭环固化到代码中。

### 输入

- `input_payload`：导入文件或查询快照
- `runtime_context`：`request_id`、`dataset_id`
- `dependencies`：解析器、索引器、查询服务、规则引擎、导出服务

### 输出

- `success_result`：结构化业务结果
- `retry_result`：可恢复失败
- `error_result`：不可恢复失败

### 伪代码草案

```python
def handle_workbench_request(input_payload, runtime_context, dependencies):
    if not input_payload:
        return build_error_result(
            error_code="INVALID_INPUT",
            message="请求参数不能为空",
            retryable=False,
        )

    try:
        if input_payload.action == "import":
            rows, parse_errors = dependencies.parser.parse(input_payload.file)
            if has_fatal(parse_errors):
                return build_error_result(
                    error_code="INVALID_WORKBOOK",
                    message="BOM 文件解析失败",
                    retryable=False,
                    details=parse_errors,
                )

            indexed_rows, indexes = dependencies.indexer.build_indexes(rows)
            anomalies = dependencies.anomaly.scan(indexed_rows)
            aggregates = dependencies.aggregate.build(indexed_rows)
            dataset_id = dependencies.store.save_dataset(
                indexed_rows, indexes, anomalies, aggregates
            )

            return build_success_result(
                dataset_id=dataset_id,
                summary=build_import_summary(indexed_rows, anomalies),
            )

        if input_payload.action == "query":
            dataset = dependencies.store.get_dataset(input_payload.dataset_id)
            if not dataset:
                return build_error_result(
                    error_code="DATASET_NOT_FOUND",
                    message="数据集不存在",
                    retryable=False,
                )

            rows = dependencies.query.apply(
                dataset.rows, input_payload.query_snapshot
            )

            return build_success_result(
                rows=rows,
                aggregates=dataset.aggregates,
                anomalies=dataset.anomalies,
            )

        if input_payload.action == "export":
            dataset = dependencies.store.get_dataset(input_payload.dataset_id)
            if not dataset:
                return build_error_result(
                    error_code="DATASET_NOT_FOUND",
                    message="数据集不存在",
                    retryable=False,
                )

            rows = dependencies.query.apply(
                dataset.rows, input_payload.query_snapshot
            )

            # 为什么先复用查询再导出：确保页面看到与导出内容严格一致
            exported = dependencies.exporter.build(rows, mode=input_payload.mode)
            return build_success_result(rows=exported)

        return build_error_result(
            error_code="UNSUPPORTED_ACTION",
            message="不支持的动作类型",
            retryable=False,
        )

    except TimeoutError:
        return build_retry_result(
            error_code="UPSTREAM_TIMEOUT",
            message="上游超时，请稍后重试",
            retryable=True,
        )
    except Exception:
        return build_error_result(
            error_code="INTERNAL_ERROR",
            message="系统内部错误",
            retryable=False,
        )
```


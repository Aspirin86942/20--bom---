# BOM 表格增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强 BOM 表格功能，支持 21 列完整显示、智能树形交互、搜索自动展开和单选标签筛选器

**Architecture:** 后端扩展解析逻辑支持所有列字段，前端配置 vxe-table 显示完整列并固定关键列，修改 useFilters 实现搜索时递归展开子树，改造工具栏筛选器为单选标签

**Tech Stack:** Python 3.10+, FastAPI, openpyxl, Vue 3, TypeScript, vxe-table, Element Plus

---

## 文件结构规划

**后端修改文件：**
- `backend/app/validators/workbook_validator.py` - 扩展必填列定义
- `backend/app/services/parse_service.py` - 扩展解析逻辑，支持所有 21 列
- `backend/app/schemas/dataset_models.py` - 扩展响应模型

**前端修改文件：**
- `frontend/src/types/dataset.ts` - 扩展 TypeScript 类型定义
- `frontend/src/components/bom/BomGrid.vue` - 添加所有列配置，实现行点击展开
- `frontend/src/composables/useFilters.ts` - 添加搜索匹配子树收集逻辑
- `frontend/src/pages/BomWorkbench.vue` - 添加搜索自动展开监听
- `frontend/src/components/bom/BomGridToolbar.vue` - 改造物料属性筛选器为单选标签

**测试文件：**
- `backend/tests/services/test_parse_service.py` - 测试新增列解析
- `frontend/src/composables/useFilters.spec.ts` - 测试搜索展开逻辑

---

## Task 1: 后端扩展必填列定义

**Files:**
- Modify: `backend/app/validators/workbook_validator.py`
- Test: `backend/tests/validators/test_workbook_validator.py`

- [ ] **Step 1: 扩展 REQUIRED_COLUMNS 集合**

修改 `backend/app/validators/workbook_validator.py`，将 `REQUIRED_COLUMNS` 从 6 列扩展到 21 列：

```python
REQUIRED_COLUMNS = {
    "BOM层级",
    "子项物料编码",
    "物料名称",
    "规格型号",
    "物料属性",
    "BOM版本",
    "数据状态",
    "单位",
    "子项类型",
    "用量:分子",
    "用量:分母",
    "币别",
    "单价",
    "金额",
    "税率%",
    "含税单价",
    "价税合计",
    "材料单价来源",
    "供应商",
    "标准用量",
    "实际数量",
}
```

- [ ] **Step 2: 运行后端测试验证**

```bash
cd backend
conda run -n test pytest tests/validators/test_workbook_validator.py -v
```

预期：测试通过（现有测试应该仍然有效）

- [ ] **Step 3: 提交更改**

```bash
git add backend/app/validators/workbook_validator.py
git commit -m "feat: extend required columns to 21 fields for BOM table"
```

---

## Task 2: 后端扩展解析逻辑

**Files:**
- Modify: `backend/app/services/parse_service.py`
- Test: `backend/tests/services/test_parse_service.py`

- [ ] **Step 1: 扩展 parse_rows_to_flat_nodes 函数**

修改 `backend/app/services/parse_service.py` 中的 `parse_rows_to_flat_nodes()` 函数，在构建 `current` 字典时添加所有新字段。

找到这段代码（约第 119-134 行）：

```python
current = {
    "id": f"row_{row_index}",
    "parent_id": str(parent["id"]),
    "level": depth,
    "sort_index": row_index,
    "bom_level_raw": str(raw["BOM层级"]),
    "top_level_code": str(raw["子项物料编码"]) if depth == 1 else str(level_stack[1]["code"]),
    "top_level_name": str(raw["物料名称"]) if depth == 1 else str(level_stack[1]["name"]),
    "parent_code": str(parent["code"]),
    "parent_name": str(parent["name"]),
    "code": str(raw["子项物料编码"]),
    "name": str(raw["物料名称"]),
    "attr": str(raw["物料属性"]),
    "qty_actual": qty_actual,
    "amount": amount,
}
```

替换为：

```python
current = {
    "id": f"row_{row_index}",
    "parent_id": str(parent["id"]),
    "level": depth,
    "sort_index": row_index,
    "bom_level_raw": str(raw["BOM层级"]),
    "code": str(raw["子项物料编码"]),
    "name": str(raw["物料名称"]),
    "spec": str(raw.get("规格型号", "")),
    "attr": str(raw["物料属性"]),
    "bom_version": str(raw.get("BOM版本", "")),
    "data_status": str(raw.get("数据状态", "")),
    "unit": str(raw.get("单位", "")),
    "item_type": str(raw.get("子项类型", "")),
    "qty_numerator": _to_decimal(raw.get("用量:分子"), field="用量:分子", row_index=row_index, errors=errors) or Decimal("0"),
    "qty_denominator": _to_decimal(raw.get("用量:分母"), field="用量:分母", row_index=row_index, errors=errors) or Decimal("0"),
    "currency": str(raw.get("币别", "")),
    "unit_price": _to_decimal(raw.get("单价"), field="单价", row_index=row_index, errors=errors) or Decimal("0"),
    "amount": amount,
    "tax_rate": _to_decimal(raw.get("税率%"), field="税率%", row_index=row_index, errors=errors) or Decimal("0"),
    "unit_price_with_tax": _to_decimal(raw.get("含税单价"), field="含税单价", row_index=row_index, errors=errors) or Decimal("0"),
    "amount_with_tax": _to_decimal(raw.get("价税合计"), field="价税合计", row_index=row_index, errors=errors) or Decimal("0"),
    "price_source": str(raw.get("材料单价来源", "")),
    "supplier": str(raw.get("供应商", "")),
    "standard_qty": _to_decimal(raw.get("标准用量"), field="标准用量", row_index=row_index, errors=errors) or Decimal("0"),
    "qty_actual": qty_actual,
    # 保留原有字段用于兼容
    "top_level_code": str(raw["子项物料编码"]) if depth == 1 else str(level_stack[1]["code"]),
    "top_level_name": str(raw["物料名称"]) if depth == 1 else str(level_stack[1]["name"]),
    "parent_code": str(parent["code"]),
    "parent_name": str(parent["name"]),
}
```

- [ ] **Step 2: 运行后端测试验证解析逻辑**

```bash
cd backend
conda run -n test pytest tests/services/test_parse_service.py -v
```

预期：所有测试通过

- [ ] **Step 3: 提交更改**

```bash
git add backend/app/services/parse_service.py
git commit -m "feat: parse all 21 columns in BOM data"
```

---

## Task 3: 前端扩展类型定义

**Files:**
- Modify: `frontend/src/types/dataset.ts`

- [ ] **Step 1: 扩展 BomRow 接口**

修改 `frontend/src/types/dataset.ts`，找到 `BomRow` 接口（如果不存在则创建），添加所有新字段：

```typescript
export interface BomRow {
  id: string;
  parent_id?: string;
  level: number;
  sort_index: number;
  bom_level_raw: string;
  code: string;
  name: string;
  spec: string;
  attr: string;
  bom_version: string;
  data_status: string;
  unit: string;
  item_type: string;
  qty_numerator: number;
  qty_denominator: number;
  currency: string;
  unit_price: number;
  amount: number;
  tax_rate: number;
  unit_price_with_tax: number;
  amount_with_tax: number;
  price_source: string;
  supplier: string;
  standard_qty: number;
  qty_actual: number;
  // 保留的兼容字段
  top_level_code: string;
  top_level_name: string;
  parent_code: string;
  parent_name: string;
}
```

- [ ] **Step 2: 运行前端类型检查**

```bash
cd frontend
npx tsc --noEmit
```

预期：无类型错误

- [ ] **Step 3: 提交更改**

```bash
git add frontend/src/types/dataset.ts
git commit -m "feat: extend BomRow type definition with all 21 fields"
```

---

## Task 4: 前端扩展表格列配置

**Files:**
- Modify: `frontend/src/components/bom/BomGrid.vue`

- [ ] **Step 1: 添加所有列定义和固定列配置**

修改 `frontend/src/components/bom/BomGrid.vue` 的 `<template>` 部分，替换 vxe-table 配置：

```vue
<template>
  <div class="bom-grid-container">
    <vxe-table
      ref="gridRef"
      :data="rows"
      :row-config="{ keyField: 'id' }"
      :checkbox-config="{ highlight: true }"
      :tree-config="{ transform: true, rowField: 'id', parentField: 'parent_id' }"
      :scroll-x="{ enabled: true, gt: 0 }"
      :scroll-y="{ enabled: true, gt: 20 }"
      @cell-click="handleCellClick"
      @checkbox-change="emitSelection"
      @checkbox-all="emitSelection"
    >
      <!-- 固定列 -->
      <vxe-column type="checkbox" width="56" fixed="left" />
      <vxe-column
        field="name"
        title="物料名称"
        tree-node
        fixed="left"
        min-width="200"
      />
      <vxe-column field="code" title="物料编码" fixed="left" width="150" />
      <vxe-column field="bom_level_raw" title="BOM层级" fixed="left" width="100" />
      
      <!-- 可滚动列 -->
      <vxe-column field="spec" title="规格型号" width="150" />
      <vxe-column field="attr" title="物料属性" width="100" />
      <vxe-column field="bom_version" title="BOM版本" width="120" />
      <vxe-column field="data_status" title="数据状态" width="100" />
      <vxe-column field="unit" title="单位" width="80" />
      <vxe-column field="item_type" title="子项类型" width="100" />
      <vxe-column field="qty_numerator" title="用量:分子" width="100" />
      <vxe-column field="qty_denominator" title="用量:分母" width="100" />
      <vxe-column field="currency" title="币别" width="80" />
      <vxe-column field="unit_price" title="单价" width="100" />
      <vxe-column field="amount" title="金额" width="120" />
      <vxe-column field="tax_rate" title="税率%" width="100" />
      <vxe-column field="unit_price_with_tax" title="含税单价" width="120" />
      <vxe-column field="amount_with_tax" title="价税合计" width="120" />
      <vxe-column field="price_source" title="材料单价来源" width="150" />
      <vxe-column field="supplier" title="供应商" width="150" />
      <vxe-column field="standard_qty" title="标准用量" width="100" />
      <vxe-column field="qty_actual" title="实际数量" width="100" />
    </vxe-table>
  </div>
</template>
```

- [ ] **Step 2: 添加行点击展开逻辑**

在 `<script setup>` 部分，修改 `@cell-click` 的处理函数。找到现有的 emit 部分，添加 `handleCellClick` 函数：

```typescript
const gridRef = ref<{
  setAllTreeExpand?: (expanded: boolean) => void;
  toggleTreeExpand?: (row: Record<string, unknown>) => void;
  getCheckboxRecords?: () => Array<Record<string, unknown>>;
} | null>(null);

function handleCellClick({ row }: { row: Record<string, unknown> }): void {
  // 发射焦点行事件（保持原有功能）
  emit("focus-row", row);
  
  // 展开/折叠当前行的直接子项（只展开一层）
  if (gridRef.value?.toggleTreeExpand) {
    gridRef.value.toggleTreeExpand(row);
  }
}
```

- [ ] **Step 3: 运行前端开发服务器验证**

```bash
cd frontend
npm run dev
```

在浏览器中测试：
1. 上传 BOM Excel 文件
2. 验证所有 21 列都显示
3. 验证前 4 列固定在左侧
4. 验证横向滚动正常
5. 验证点击行能展开/折叠一层子项

- [ ] **Step 4: 提交更改**

```bash
git add frontend/src/components/bom/BomGrid.vue
git commit -m "feat: add all 21 columns with fixed columns and row click expand"
```

---


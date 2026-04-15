# BOM 表格增强设计文档

## 概述

**目标**：增强 BOM 表格功能，包括完整列显示、改进的树形交互、智能搜索展开和优化的筛选器。

**范围**：
- 后端：扩展解析逻辑，支持所有 20+ 列字段
- 前端：显示完整列、固定关键列、优化交互逻辑
- 筛选器：物料属性改为单选标签
- 搜索：匹配时自动展开完整子树

## 需求详情

### 1. 树形展开交互
- **行为**：点击物料行时，只展开该行的直接子项（一层）
- **目的**：让用户逐层探索 BOM 结构，避免一次性展开过多内容
- **实现**：使用 vxe-table 的 `toggleTreeExpand()` 方法

### 2. 搜索展开行为
- **行为**：搜索匹配时，自动展开所有匹配项及其完整子树（递归）
- **目的**：让用户看到搜索结果的完整上下文
- **实现**：收集匹配节点的所有子孙节点 ID，过滤并自动展开

### 3. 完整列显示
**当前列**（6列）：
- 物料名称、物料编码、物料属性、实际数量、金额

**目标列**（21列）：
1. BOM层级
2. 子项物料编码
3. 物料名称
4. 规格型号
5. 物料属性
6. BOM版本
7. 数据状态
8. 单位
9. 子项类型
10. 用量:分子
11. 用量:分母
12. 币别
13. 单价
14. 金额
15. 税率%
16. 含税单价
17. 价税合计
18. 材料单价来源
19. 供应商
20. 标准用量
21. 实际数量

**固定列**（左侧固定，不随横向滚动）：
- 复选框
- 物料名称（树形节点）
- 物料编码
- BOM层级

### 4. 物料属性筛选器
- **当前**：多选下拉框
- **目标**：单选标签组（全部、自制、外购、委外）
- **行为**：
  - 点击标签选中该属性
  - 再次点击取消选择，显示全部
  - 不支持多选

### 5. 滚动条
- **横向滚动**：列数多时自动启用
- **纵向滚动**：行数多时自动启用

## 架构设计

### 数据流

```
Excel 文件
  ↓
后端解析（parse_service.py）
  ↓ 解析所有 21 列
扁平化数据结构（包含所有字段）
  ↓
前端接收（useDataset.ts）
  ↓
过滤逻辑（useFilters.ts）
  ↓ 搜索 + 属性筛选 + 金额筛选
  ↓ 收集匹配节点的子树
显示层（BomGrid.vue）
  ↓ 配置 21 列 + 固定列
  ↓ 监听行点击 + 自动展开
用户交互
```

### 组件职责

**后端**：
- `workbook_validator.py`：验证 Excel 包含所有必需列
- `parse_service.py`：解析所有 21 列字段，转换为扁平化结构
- `dataset_models.py`：定义包含所有字段的响应模型

**前端**：
- `BomGrid.vue`：显示表格，配置列定义和固定列，处理行点击展开
- `BomGridToolbar.vue`：工具栏，包含搜索框、标签筛选器、操作按钮
- `useFilters.ts`：过滤逻辑，包含搜索匹配和子树收集
- `BomWorkbench.vue`：页面容器，监听搜索变化并触发自动展开
- `types/dataset.ts`：TypeScript 类型定义

## 详细设计

### 第一部分：后端数据扩展

#### 1.1 扩展必填列定义

文件：`backend/app/validators/workbook_validator.py`

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

#### 1.2 扩展解析逻辑

文件：`backend/app/services/parse_service.py`

在 `parse_rows_to_flat_nodes()` 函数中，扩展 `current` 字典：

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
    "qty_numerator": _to_decimal(raw.get("用量:分子"), field="用量:分子", row_index=row_index, errors=errors),
    "qty_denominator": _to_decimal(raw.get("用量:分母"), field="用量:分母", row_index=row_index, errors=errors),
    "currency": str(raw.get("币别", "")),
    "unit_price": _to_decimal(raw.get("单价"), field="单价", row_index=row_index, errors=errors),
    "amount": amount,
    "tax_rate": _to_decimal(raw.get("税率%"), field="税率%", row_index=row_index, errors=errors),
    "unit_price_with_tax": _to_decimal(raw.get("含税单价"), field="含税单价", row_index=row_index, errors=errors),
    "amount_with_tax": _to_decimal(raw.get("价税合计"), field="价税合计", row_index=row_index, errors=errors),
    "price_source": str(raw.get("材料单价来源", "")),
    "supplier": str(raw.get("供应商", "")),
    "standard_qty": _to_decimal(raw.get("标准用量"), field="标准用量", row_index=row_index, errors=errors),
    "qty_actual": qty_actual,
    # 保留原有字段用于兼容
    "top_level_code": str(raw["子项物料编码"]) if depth == 1 else str(level_stack[1]["code"]),
    "top_level_name": str(raw["物料名称"]) if depth == 1 else str(level_stack[1]["name"]),
    "parent_code": str(parent["code"]),
    "parent_name": str(parent["name"]),
}
```

**设计考虑**：
- 使用 `raw.get()` 处理可能缺失的列，提供空字符串默认值
- 数值字段统一使用 `_to_decimal()` 处理，保持精度
- 保留原有字段确保向后兼容

#### 1.3 更新响应模型

文件：`backend/app/schemas/dataset_models.py`

```python
from pydantic import BaseModel
from decimal import Decimal

class BomRowResponse(BaseModel):
    id: str
    parent_id: str | None = None
    level: int
    sort_index: int
    bom_level_raw: str
    code: str
    name: str
    spec: str
    attr: str
    bom_version: str
    data_status: str
    unit: str
    item_type: str
    qty_numerator: Decimal
    qty_denominator: Decimal
    currency: str
    unit_price: Decimal
    amount: Decimal
    tax_rate: Decimal
    unit_price_with_tax: Decimal
    amount_with_tax: Decimal
    price_source: str
    supplier: str
    standard_qty: Decimal
    qty_actual: Decimal
    top_level_code: str
    top_level_name: str
    parent_code: str
    parent_name: str
```

### 第二部分：前端表格列配置

#### 2.1 扩展 BomGrid 列定义

文件：`frontend/src/components/bom/BomGrid.vue`

模板部分：

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

脚本部分：

```typescript
<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  rows: Array<Record<string, unknown>>;
  expandAll?: boolean;
}>();

const emit = defineEmits<{
  "focus-row": [row: Record<string, unknown>];
  "selection-change": [rows: Array<Record<string, unknown>>];
}>();

const gridRef = ref<{
  setAllTreeExpand?: (expanded: boolean) => void;
  toggleTreeExpand?: (row: Record<string, unknown>) => void;
  getCheckboxRecords?: () => Array<Record<string, unknown>>;
} | null>(null);

watch(
  () => props.expandAll,
  (value) => {
    if (value === undefined || !gridRef.value?.setAllTreeExpand) {
      return;
    }
    gridRef.value.setAllTreeExpand(value);
  },
);

function handleCellClick({ row }: { row: Record<string, unknown> }): void {
  // 发射焦点行事件（保持原有功能）
  emit("focus-row", row);
  
  // 展开/折叠当前行的直接子项（只展开一层）
  if (gridRef.value?.toggleTreeExpand) {
    gridRef.value.toggleTreeExpand(row);
  }
}

function emitSelection(): void {
  emit("selection-change", gridRef.value?.getCheckboxRecords?.() ?? []);
}
</script>
```

**设计考虑**：
- 前 4 列使用 `fixed="left"` 固定
- 滚动配置：`gt: 0` 总是启用横向滚动，`gt: 20` 超过 20 行启用纵向滚动
- `handleCellClick` 使用 `toggleTreeExpand()` 实现点击展开/折叠一层

### 第三部分：搜索展开逻辑

#### 3.1 修改搜索过滤逻辑

文件：`frontend/src/composables/useFilters.ts`

```typescript
import { computed, reactive, Ref } from "vue";

export function useFilters(rows: Ref<Array<Record<string, unknown>>>) {
  const filters = reactive({
    search: "",
    attrs: [] as string[],
    amountMin: "",
  });

  // 收集某个节点的所有子孙节点ID
  function collectDescendantIds(
    nodeId: string,
    allRows: Array<Record<string, unknown>>
  ): Set<string> {
    const descendants = new Set<string>();
    const children = allRows.filter(r => r.parent_id === nodeId);
    
    for (const child of children) {
      descendants.add(String(child.id));
      // 递归收集子孙
      const childDescendants = collectDescendantIds(String(child.id), allRows);
      childDescendants.forEach(id => descendants.add(id));
    }
    
    return descendants;
  }

  // 搜索匹配的节点ID集合（包含其所有子孙）
  const matchedNodeIds = computed(() => {
    if (!filters.search.trim()) {
      return new Set<string>();
    }

    const matched = new Set<string>();
    const searchLower = filters.search.toLowerCase();
    
    for (const row of rows.value) {
      const code = String(row.code || "").toLowerCase();
      const name = String(row.name || "").toLowerCase();
      
      if (code.includes(searchLower) || name.includes(searchLower)) {
        // 匹配的节点本身
        matched.add(String(row.id));
        // 该节点的所有子孙
        const descendants = collectDescendantIds(String(row.id), rows.value);
        descendants.forEach(id => matched.add(id));
      }
    }
    
    return matched;
  });

  const filteredRows = computed(() => {
    let result = rows.value;

    // 物料属性筛选
    if (filters.attrs.length > 0) {
      result = result.filter(row => 
        filters.attrs.includes(String(row.attr))
      );
    }

    // 金额筛选
    if (filters.amountMin) {
      const minAmount = parseFloat(filters.amountMin);
      if (!isNaN(minAmount)) {
        result = result.filter(row => {
          const amount = parseFloat(String(row.amount || 0));
          return amount >= minAmount;
        });
      }
    }

    // 搜索筛选（显示匹配节点及其子孙）
    if (matchedNodeIds.value.size > 0) {
      result = result.filter(row => 
        matchedNodeIds.value.has(String(row.id))
      );
    }

    return result;
  });

  return { filters, filteredRows, matchedNodeIds };
}
```

#### 3.2 在 BomWorkbench 中应用展开逻辑

文件：`frontend/src/pages/BomWorkbench.vue`

在 `<script setup>` 中添加：

```typescript
import { computed, ref, watch } from "vue";

const { filters, filteredRows, matchedNodeIds } = useFilters(rowsRef);
const bomGridRef = ref<InstanceType<typeof BomGrid> | null>(null);

// 监听搜索匹配结果，自动展开匹配的节点
watch(matchedNodeIds, (newMatched) => {
  if (newMatched.size > 0 && bomGridRef.value?.gridRef) {
    // 展开所有匹配的节点
    const grid = bomGridRef.value.gridRef;
    filteredRows.value.forEach(row => {
      if (newMatched.has(String(row.id)) && grid.setTreeExpand) {
        grid.setTreeExpand(row, true);
      }
    });
  }
});
```

在模板中添加 ref：

```vue
<BomGrid
  ref="bomGridRef"
  :rows="filteredRows"
  :expand-all="expanded"
  @focus-row="focusRow = $event"
  @selection-change="selectedRows = $event"
/>
```

**设计考虑**：
- 使用 `Set` 存储匹配节点 ID，提高查找性能
- 递归收集子孙节点，确保完整子树可见
- 监听 `matchedNodeIds` 变化，自动调用 `setTreeExpand()` 展开

### 第四部分：物料属性筛选器改造

#### 4.1 修改工具栏组件

文件：`frontend/src/components/bom/BomGridToolbar.vue`

模板部分：

```vue
<template>
  <div class="toolbar">
    <label>
      <span>搜索</span>
      <input
        type="text"
        :value="search"
        aria-label="搜索编码/名称"
        placeholder="搜索编码/名称"
        @input="emitSearchChange"
      />
    </label>
    
    <!-- 物料属性：改为单选标签 -->
    <div class="filter-group">
      <span class="filter-label">物料属性</span>
      <div class="tag-group">
        <button
          type="button"
          :class="['tag', { active: attrs.length === 0 }]"
          @click="emit('update:attrs', [])"
        >
          全部
        </button>
        <button
          type="button"
          :class="['tag', { active: attrs.includes('自制') }]"
          @click="toggleAttr('自制')"
        >
          自制
        </button>
        <button
          type="button"
          :class="['tag', { active: attrs.includes('外购') }]"
          @click="toggleAttr('外购')"
        >
          外购
        </button>
        <button
          type="button"
          :class="['tag', { active: attrs.includes('委外') }]"
          @click="toggleAttr('委外')"
        >
          委外
        </button>
      </div>
    </div>
    
    <label>
      <span>金额下限</span>
      <input
        type="text"
        :value="amountMin"
        aria-label="金额下限"
        inputmode="decimal"
        placeholder="金额下限"
        @input="emitAmountMinChange"
      />
    </label>
    
    <button type="button" @click="emit('expand-all')">全部展开</button>
    <button type="button" @click="emit('collapse-all')">全部折叠</button>
    <button type="button" @click="emit('export-current')">
      导出当前结果
    </button>
  </div>
</template>
```

脚本部分：

```typescript
<script setup lang="ts">
defineProps<{
  search: string;
  attrs: string[];
  amountMin: string;
}>();

const emit = defineEmits<{
  "update:search": [value: string];
  "update:attrs": [value: string[]];
  "update:amount-min": [value: string];
  "expand-all": [];
  "collapse-all": [];
  "export-current": [];
}>();

function emitSearchChange(event: Event): void {
  emit("update:search", (event.target as HTMLInputElement).value);
}

function emitAmountMinChange(event: Event): void {
  emit("update:amount-min", (event.target as HTMLInputElement).value);
}

// 单选逻辑：点击已选中的标签则取消选择（显示全部）
function toggleAttr(attr: string): void {
  if (attrs.includes(attr)) {
    emit("update:attrs", []);
  } else {
    emit("update:attrs", [attr]);
  }
}
</script>
```

样式部分（新增）：

```vue
<style scoped>
/* 原有样式保持不变 */

/* 新增：筛选器组样式 */
.filter-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.filter-label {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.tag-group {
  display: flex;
  gap: var(--spacing-xs);
}

.tag {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--color-bg-base);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.tag:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tag.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
</style>
```

**设计考虑**：
- 使用按钮标签代替下拉框，交互更直观
- 单选逻辑：点击已选中的标签会取消选择
- "全部"标签在 `attrs.length === 0` 时高亮
- 使用绿色主题色表示选中状态

### 第五部分：类型定义

#### 5.1 扩展 TypeScript 类型

文件：`frontend/src/types/dataset.ts`

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

export interface DatasetState {
  datasetId: string;
  rows: BomRow[];
  subtreeAggregates: Record<string, SubtreeAggregate>;
  errors: ImportError[];
  warnings: Warning[];
  loading: boolean;
}
```

## 测试策略

### 后端测试
1. **列解析测试**：验证所有 21 列都能正确解析
2. **缺失列处理**：验证可选列缺失时使用默认值
3. **数值转换测试**：验证 Decimal 转换的正确性

### 前端测试
1. **列显示测试**：验证所有 21 列都能正确显示
2. **固定列测试**：验证前 4 列在滚动时保持固定
3. **行点击测试**：验证点击行只展开一层子项
4. **搜索展开测试**：验证搜索匹配时递归展开子树
5. **标签筛选测试**：验证单选逻辑和取消选择
6. **滚动条测试**：验证横向和纵向滚动正常工作

### 集成测试
1. 上传包含所有列的 Excel 文件
2. 验证数据正确显示
3. 测试搜索 + 筛选 + 展开的组合场景
4. 验证导出功能包含所有列

## 错误处理

### 后端
- Excel 缺少必需列：返回明确的错误信息，列出缺失的列名
- 数值字段格式错误：记录错误行号和字段名，继续解析其他行
- 空值处理：数值字段默认为 0，文本字段默认为空字符串

### 前端
- 数据加载失败：显示错误提示，允许重新上传
- 搜索无匹配：显示"无匹配结果"提示
- 滚动性能：使用 vxe-table 的虚拟滚动优化大数据集

## 性能考虑

1. **虚拟滚动**：vxe-table 自动启用虚拟滚动，处理大数据集
2. **搜索优化**：使用 `Set` 存储匹配节点 ID，O(1) 查找
3. **递归优化**：子树收集使用深度优先遍历，避免重复计算
4. **响应式优化**：使用 `computed` 缓存过滤结果

## 向后兼容

- 保留原有字段（`top_level_code`、`parent_code` 等）
- 原有 API 接口不变
- 前端组件接口保持兼容
- 旧的 Excel 文件（只包含 6 列）仍可正常导入，新列显示为空

## 实施顺序

1. 后端扩展（解析逻辑 + 响应模型）
2. 前端类型定义
3. 前端列配置
4. 行点击展开逻辑
5. 搜索展开逻辑
6. 筛选器改造
7. 测试和验证

## 验收标准

- ✅ 显示所有 21 列
- ✅ 前 4 列固定在左侧
- ✅ 点击行展开一层子项
- ✅ 搜索时自动展开匹配项的完整子树
- ✅ 物料属性单选标签工作正常
- ✅ 横向和纵向滚动条正常工作
- ✅ 所有测试通过
- ✅ 性能良好（1000+ 行数据流畅滚动）

<template>
  <div class="bom-grid-container">
    <vxe-table
      ref="gridRef"
      :data="rows"
      :row-config="{ keyField: 'id' }"
      :checkbox-config="{ highlight: true }"
      :tree-config="{
        transform: true,
        rowField: 'id',
        parentField: 'parent_id',
      }"
      @cell-click="({ row }) => $emit('focus-row', row)"
      @checkbox-change="emitSelection"
      @checkbox-all="emitSelection"
    >
      <vxe-column type="checkbox" width="56" fixed="left" />
      <vxe-column
        field="name"
        title="物料名称"
        tree-node
        fixed="left"
        min-width="260"
      />
      <vxe-column field="code" title="物料编码" fixed="left" width="180" />
      <vxe-column
        field="level_display"
        title="BOM层级"
        fixed="left"
        width="100"
      />
      <vxe-column field="attr" title="物料属性" width="120" />
      <vxe-column field="spec_model" title="规格型号" width="150" />
      <vxe-column field="bom_version" title="BOM版本" width="120" />
      <vxe-column field="data_status" title="数据状态" width="100" />
      <vxe-column field="unit" title="单位" width="80" />
      <vxe-column field="sub_item_type" title="子项类型" width="100" />
      <vxe-column
        field="qty_numerator"
        title="用量:分子"
        width="100"
        align="right"
      />
      <vxe-column
        field="qty_denominator"
        title="用量:分母"
        width="100"
        align="right"
      />
      <vxe-column
        field="qty_actual"
        title="实际数量"
        width="120"
        align="right"
      />
      <vxe-column field="currency" title="币别" width="80" />
      <vxe-column field="unit_price" title="单价" width="120" align="right" />
      <vxe-column field="tax_rate" title="税率%" width="100" align="right" />
      <vxe-column
        field="unit_price_with_tax"
        title="含税单价"
        width="120"
        align="right"
      />
      <vxe-column
        field="total_price_with_tax"
        title="价税合计"
        width="120"
        align="right"
      />
      <vxe-column field="amount" title="金额" width="120" align="right" />
      <vxe-column field="price_source" title="材料单价来源" width="150" />
      <vxe-column field="supplier" title="供应商" width="150" />
      <vxe-column
        field="standard_qty"
        title="标准用量"
        width="100"
        align="right"
      />
    </vxe-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { FlatRow } from "../../types/dataset";
import { collectMatchedSubtrees } from "../../composables/useBomData";

const props = defineProps<{
  rows: Array<Record<string, unknown>>;
  flatRows: FlatRow[];
  expandAll?: boolean;
}>();
const emit = defineEmits<{
  "focus-row": [row: Record<string, unknown>];
  "selection-change": [rows: Array<Record<string, unknown>>];
}>();
const gridRef = ref<{
  setAllTreeExpand?: (expanded: boolean) => void;
  setTreeExpand?: (row: Record<string, unknown>, expanded: boolean) => void;
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

// 监听搜索结果变化，自动展开匹配节点的完整子树
// 只在搜索过滤时触发（filteredRows < flatRows），避免初始加载时卡顿
watch(
  () => props.rows,
  (newFiltered) => {
    if (!gridRef.value) return;

    // 如果过滤后的行数等于总行数，说明没有搜索过滤，跳过展开逻辑
    if (newFiltered.length === props.flatRows.length) {
      console.log("[BomGrid] 无搜索过滤，跳过自动展开");
      return;
    }

    console.log("[BomGrid] 检测到搜索过滤，开始自动展开匹配节点...");

    // 收集所有匹配节点的 ID
    const matchedIds = new Set(newFiltered.map((r) => String(r.id)));

    // 收集匹配节点及其完整子树
    const toExpand = collectMatchedSubtrees(matchedIds, props.flatRows);
    console.log(`[BomGrid] 需要展开 ${toExpand.size} 个节点`);
    const rowMap = new Map(
      props.flatRows.map((row) => [row.id, row as Record<string, unknown>]),
    );

    // 性能优化：如果需要展开的节点过多（>500），使用全部展开而不是逐个展开
    if (toExpand.size > 500) {
      console.log("[BomGrid] 节点数量过多，使用全部展开模式");
      if (gridRef.value?.setAllTreeExpand) {
        gridRef.value.setAllTreeExpand(true);
      }
    } else {
      // 批量展开：使用 requestAnimationFrame 分批处理，避免阻塞 UI
      const expandArray = Array.from(toExpand);
      const batchSize = 50;
      let index = 0;

      const expandBatch = () => {
        const end = Math.min(index + batchSize, expandArray.length);
        for (let i = index; i < end; i++) {
          const id = expandArray[i];
          const row = rowMap.get(id);
          if (row && gridRef.value?.setTreeExpand) {
            gridRef.value.setTreeExpand(row, true);
          }
        }
        index = end;

        if (index < expandArray.length) {
          requestAnimationFrame(expandBatch);
        } else {
          console.log("[BomGrid] 自动展开完成");
        }
      };

      requestAnimationFrame(expandBatch);
    }
  },
  { flush: "post" },
);

function emitSelection(): void {
  emit("selection-change", gridRef.value?.getCheckboxRecords?.() ?? []);
}
</script>

<style scoped>
.bom-grid-container {
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.bom-grid-container :deep(.vxe-table) {
  flex: 1;
}
</style>

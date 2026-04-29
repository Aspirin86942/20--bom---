<template>
  <div class="bom-grid-container">
    <vxe-table
      ref="gridRef"
      :data="rows"
      height="100%"
      :row-config="{ keyField: 'id' }"
      :checkbox-config="{ highlight: true }"
      :tree-config="treeConfig"
      :virtual-y-config="virtualYConfig"
      show-overflow="title"
      @cell-click="({ row }) => $emit('focus-row', row)"
      @checkbox-change="emitSelection"
      @checkbox-all="emitSelection"
    >
      <vxe-column type="checkbox" width="56" fixed="left" />
      <vxe-column
        field="name"
        title="物料名称"
        :tree-node="isTreeMode"
        fixed="left"
        min-width="260"
      >
        <template #default="{ row }">
          <span class="highlight-cell">
            <template
              v-for="(segment, index) in getHighlightSegments(row.name)"
              :key="`${String(row.id)}-name-${index}`"
            >
              <mark v-if="segment.matched" class="search-highlight">
                {{ segment.text }}
              </mark>
              <span v-else>{{ segment.text }}</span>
            </template>
          </span>
        </template>
      </vxe-column>
      <vxe-column field="code" title="物料编码" fixed="left" width="180">
        <template #default="{ row }">
          <span class="highlight-cell">
            <template
              v-for="(segment, index) in getHighlightSegments(row.code)"
              :key="`${String(row.id)}-code-${index}`"
            >
              <mark v-if="segment.matched" class="search-highlight">
                {{ segment.text }}
              </mark>
              <span v-else>{{ segment.text }}</span>
            </template>
          </span>
        </template>
      </vxe-column>
      <vxe-column
        field="bom_level_raw"
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
import { computed, ref, watch } from "vue";
import type { FlatRow } from "../../types/dataset";
import { collectMatchedSubtrees } from "../../composables/useBomData";
import {
  type BomGridDisplayMode,
  shouldAutoExpandFilteredRows,
} from "../../composables/useGridDisplayMode";

type HighlightSegment = {
  text: string;
  matched: boolean;
};

const props = defineProps<{
  rows: Array<Record<string, unknown>>;
  flatRows: FlatRow[];
  expandAll?: boolean;
  displayMode?: BomGridDisplayMode;
  search?: string;
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
const isTreeMode = computed(() => (props.displayMode ?? "tree") === "tree");
const treeConfig = computed(() =>
  isTreeMode.value
    ? {
        transform: true,
        rowField: "id",
        parentField: "parent_id",
      }
    : undefined,
);
const virtualYConfig = {
  enabled: true,
  gt: 80,
  oSize: 20,
  preSize: 10,
  scrollToTopOnChange: true,
};

function buildHighlightSegments(
  value: unknown,
  keyword: string,
): HighlightSegment[] {
  const text = String(value ?? "");
  if (!keyword) {
    return [{ text, matched: false }];
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  let matchIndex = text.indexOf(keyword, cursor);

  if (matchIndex === -1) {
    return [{ text, matched: false }];
  }

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      segments.push({
        text: text.slice(cursor, matchIndex),
        matched: false,
      });
    }

    segments.push({
      text: text.slice(matchIndex, matchIndex + keyword.length),
      matched: true,
    });
    cursor = matchIndex + keyword.length;
    matchIndex = text.indexOf(keyword, cursor);
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      matched: false,
    });
  }

  return segments;
}

function getHighlightSegments(value: unknown): HighlightSegment[] {
  return buildHighlightSegments(value, props.search ?? "");
}

watch(
  () => props.expandAll,
  (value) => {
    if (!isTreeMode.value) {
      return;
    }
    if (value === undefined || !gridRef.value?.setAllTreeExpand) {
      return;
    }
    gridRef.value.setAllTreeExpand(value);
  },
);

// 只在搜索定位时自动展开匹配节点的完整子树；属性/金额筛选走平铺列表，避免展开风暴。
watch(
  () => props.rows,
  (newFiltered) => {
    if (!gridRef.value) return;

    if (!shouldAutoExpandFilteredRows(props.displayMode ?? "tree", props.search ?? "")) {
      console.log("[BomGrid] 非搜索定位场景，跳过自动展开");
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

.highlight-cell {
  display: inline;
}

.search-highlight {
  background-color: #ffe58f;
  border-radius: 3px;
  color: inherit;
  padding: 0 1px;
}
</style>

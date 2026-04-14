<template>
  <div class="bom-grid-container">
    <vxe-table
      ref="gridRef"
      :data="rows"
      :row-config="{ keyField: 'id' }"
      :checkbox-config="{ highlight: true }"
      :tree-config="{ transform: true, rowField: 'id', parentField: 'parent_id' }"
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
      <vxe-column field="attr" title="物料属性" width="120" />
      <vxe-column field="qty_actual" title="实际数量" width="120" />
      <vxe-column field="amount" title="金额" width="120" />
    </vxe-table>
  </div>
</template>

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

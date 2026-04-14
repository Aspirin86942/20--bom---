<template>
  <aside class="analysis-panel">
    <h2>分析区</h2>
    <label>
      <input
        :checked="includeCollapsedDescendants"
        aria-label="包含折叠子项"
        type="checkbox"
        @change="
          $emit(
            'update:includeCollapsedDescendants',
            ($event.target as HTMLInputElement).checked,
          )
        "
      />
      包含折叠子项
    </label>
    <SummaryCards :summary="currentSummary" title="当前范围汇总" />
    <SummaryCards :summary="focusSummary" title="焦点节点汇总" />
    <SelectionSummary :summary="selectionSummary" />
    <AttrBreakdown :breakdown="amountByAttr" />
  </aside>
</template>

<script setup lang="ts">
import AttrBreakdown from "./AttrBreakdown.vue";
import SelectionSummary from "./SelectionSummary.vue";
import SummaryCards from "./SummaryCards.vue";


defineProps<{
  currentSummary: Record<string, unknown>;
  focusSummary: Record<string, unknown>;
  selectionSummary: Record<string, unknown>;
  amountByAttr: Record<string, unknown>;
  includeCollapsedDescendants: boolean;
}>();
defineEmits<{
  "update:includeCollapsedDescendants": [value: boolean];
}>();
</script>

<style scoped>
.analysis-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  height: 100%;
  overflow-y: auto;
}

.analysis-panel h2 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-xxl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.analysis-panel label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--color-bg-container);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.3s;
}

.analysis-panel label:hover {
  background-color: var(--color-primary-lighter);
}

.analysis-panel input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
</style>

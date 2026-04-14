<template>
  <aside class="analysis-panel">
    <h2>分析区</h2>
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
}>();
</script>

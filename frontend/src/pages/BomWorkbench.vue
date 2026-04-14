<template>
  <section class="workbench">
    <UploadPanel @select="importFile" />
    <ErrorDrawer :errors="state.errors.length ? state.errors : state.warnings" />
    <BomGridToolbar
      :search="filters.search"
      @update:search="filters.search = $event"
      @export-current="handleExport"
      @expand-all="expanded = true"
      @collapse-all="expanded = false"
    />
    <div class="layout">
      <BomGrid
        :rows="filteredRows"
        :expand-all="expanded"
        @focus-row="focusRow = $event"
        @selection-change="selectedRows = $event"
      />
      <AnalysisPanel
        :current-summary="currentSummary"
        :focus-summary="focusSummary"
        :selection-summary="selectionSummary"
        :amount-by-attr="
          focusRow
            ? state.subtreeAggregates[String(focusRow.id)]?.amount_by_attr ?? {}
            : {}
        "
      />
    </div>
    <BomGridStatusBar
      :row-count="currentSummary.rowCount"
      :qty-sum="currentSummary.qtySum"
      :amount-sum="currentSummary.amountSum"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import { exportDataset } from "../api/dataset";
import AnalysisPanel from "../components/analysis/AnalysisPanel.vue";
import BomGrid from "../components/bom/BomGrid.vue";
import BomGridStatusBar from "../components/bom/BomGridStatusBar.vue";
import BomGridToolbar from "../components/bom/BomGridToolbar.vue";
import ErrorDrawer from "../components/common/ErrorDrawer.vue";
import UploadPanel from "../components/upload/UploadPanel.vue";
import { useAnalysis } from "../composables/useAnalysis";
import { useDataset } from "../composables/useDataset";
import { useFilters } from "../composables/useFilters";
import { useSelection } from "../composables/useSelection";


const { state, importFile } = useDataset();
const rowsRef = computed(() => state.rows as Array<Record<string, unknown>>);
const aggregatesRef = computed(() => state.subtreeAggregates);
const { filters, filteredRows } = useFilters(rowsRef);
const { focusRow, selectedRows, selectionSummary } = useSelection();
const includeCollapsedDescendants = ref(false);
const visibleRowsRef = computed(
  () => filteredRows.value as Array<Record<string, unknown>>,
);
const { currentSummary, focusSummary } = useAnalysis(
  visibleRowsRef,
  aggregatesRef,
  focusRow,
  includeCollapsedDescendants,
);
const expanded = ref(true);


async function handleExport(): Promise<void> {
  if (!state.datasetId) {
    return;
  }

  await exportDataset(state.datasetId);
}
</script>

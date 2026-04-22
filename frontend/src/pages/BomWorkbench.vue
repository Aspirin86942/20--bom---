<template>
  <section class="workbench">
    <UploadPanel @select="handleImportFile" />
    <ErrorDrawer
      :errors="state.errors.length ? state.errors : state.warnings"
    />
    <BomGridToolbar
      :search="filters.search"
      :material-attr="filters.materialAttr"
      :amount-min="filters.amountMin"
      @update:search="filters.search = $event"
      @update:material-attr="filters.materialAttr = $event"
      @update:amount-min="filters.amountMin = $event"
      @export-current="handleExport"
      @expand-all="expanded = true"
      @collapse-all="expanded = false"
    />
    <div class="layout">
      <BomGrid
        :rows="filteredRows"
        :flat-rows="rowsRef"
        :expand-all="expanded"
        @focus-row="handleFocusRow"
        @selection-change="selectedRows = $event"
      />
      <div class="side-panels">
        <AnalysisPanel
          :current-summary="currentSummary"
          :focus-summary="focusSummary"
          :selection-summary="selectionSummary"
          :include-collapsed-descendants="includeCollapsedDescendants"
          :amount-by-attr="
            focusRow
              ? (state.subtreeAggregates[String(focusRow.id)]?.amount_by_attr ??
                {})
              : {}
          "
          @update:include-collapsed-descendants="
            includeCollapsedDescendants = $event
          "
        />
        <NodeDetailPanel :node="focusNode" />
        <AnomalyCenter :items="anomalyItems" />
      </div>
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
import AnomalyCenter from "../components/analysis/AnomalyCenter.vue";
import AnalysisPanel from "../components/analysis/AnalysisPanel.vue";
import BomGrid from "../components/bom/BomGrid.vue";
import BomGridStatusBar from "../components/bom/BomGridStatusBar.vue";
import BomGridToolbar from "../components/bom/BomGridToolbar.vue";
import NodeDetailPanel from "../components/bom/NodeDetailPanel.vue";
import ErrorDrawer from "../components/common/ErrorDrawer.vue";
import UploadPanel from "../components/upload/UploadPanel.vue";
import { useAnalysis } from "../composables/useAnalysis";
import { useDataset } from "../composables/useDataset";
import { useFilters } from "../composables/useFilters";
import { useSelection } from "../composables/useSelection";
import {
  defaultWorkbenchQuerySnapshot,
  useWorkbenchState,
} from "../composables/useWorkbenchState";

const { state, importFile } = useDataset();
const { setSelectedNodeId, setViewMode, setExpandLevel, setQuerySnapshot } =
  useWorkbenchState();
const rowsRef = computed(() => state.rows as Array<Record<string, unknown>>);
const aggregatesRef = computed(() => state.subtreeAggregates);
const { filters, filteredRows, buildQuerySnapshot, buildExportQuery } =
  useFilters(rowsRef);
const { focusRow, selectedRows, selectionSummary } = useSelection();
const focusNode = computed<Record<string, unknown> | null>(
  () => focusRow.value as Record<string, unknown> | null,
);
const anomalyItems = computed<Array<Record<string, unknown>>>(() => {
  return (state.warnings as Array<Record<string, unknown>>) ?? [];
});
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

function resetWorkbenchUiState(): void {
  filters.search = "";
  filters.materialAttr = "";
  filters.amountMin = "";
  focusRow.value = null;
  selectedRows.value = [];
  includeCollapsedDescendants.value = false;
  expanded.value = true;
  setSelectedNodeId("");
  setViewMode("tree");
  setExpandLevel(2);
  setQuerySnapshot(defaultWorkbenchQuerySnapshot);
}

function handleFocusRow(row: Record<string, unknown> | null): void {
  focusRow.value = row;
  setSelectedNodeId(String(row?.id ?? ""));
}

async function handleImportFile(file: File): Promise<void> {
  await importFile(file);

  // 仅在导入成功后清空旧上下文，失败时保留现有筛选和焦点。
  if (!state.datasetId) {
    return;
  }

  resetWorkbenchUiState();
}

async function handleExport(): Promise<void> {
  if (!state.datasetId) {
    return;
  }

  const querySnapshot = buildQuerySnapshot();
  setQuerySnapshot(querySnapshot);

  await exportDataset(
    state.datasetId,
    "current_view",
    buildExportQuery(querySnapshot),
  );
}
</script>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  background-color: var(--color-bg-container);
}

.layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: var(--spacing-md);
  flex: 1;
  min-height: 0;
}

.side-panels {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-height: 0;
}

@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <section class="workbench" data-testid="workbench">
    <UploadPanel :compact="Boolean(state.datasetId)" @select="handleImportFile" />
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
    <div class="layout" data-testid="workbench-layout">
      <BomGrid
        :rows="filteredRows"
        :flat-rows="rowsRef"
        :expand-all="expanded"
        :display-mode="gridDisplayMode"
        :search="filters.search"
        @focus-row="handleFocusRow"
        @selection-change="selectedRows = $event"
      />
      <div class="side-panels" data-testid="side-panels">
        <NodeDetailPanel :node="focusNode" />
        <AnomalyCenter :items="anomalyItems" />
      </div>
    </div>
    <BomGridStatusBar
      :current-summary="currentSummary"
      :focus-summary="focusSummary"
      :selection-summary="selectionSummary"
      :amount-by-attr="focusAmountByAttr"
      :include-collapsed-descendants="includeCollapsedDescendants"
      @update:include-collapsed-descendants="
        includeCollapsedDescendants = $event
      "
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import { exportDataset } from "../api/dataset";
import AnomalyCenter from "../components/analysis/AnomalyCenter.vue";
import BomGrid from "../components/bom/BomGrid.vue";
import BomGridStatusBar from "../components/bom/BomGridStatusBar.vue";
import BomGridToolbar from "../components/bom/BomGridToolbar.vue";
import NodeDetailPanel from "../components/bom/NodeDetailPanel.vue";
import ErrorDrawer from "../components/common/ErrorDrawer.vue";
import UploadPanel from "../components/upload/UploadPanel.vue";
import { useAnalysis } from "../composables/useAnalysis";
import { useDataset } from "../composables/useDataset";
import { useFilters } from "../composables/useFilters";
import { resolveBomGridDisplayMode } from "../composables/useGridDisplayMode";
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
const gridDisplayMode = computed(() => resolveBomGridDisplayMode(filters));
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
const focusAmountByAttr = computed<Record<string, string>>(() => {
  if (!focusRow.value) {
    return {};
  }

  return (
    state.subtreeAggregates[String(focusRow.value.id)]?.amount_by_attr ?? {}
  ) as Record<string, string>;
});
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
  height: 100vh;
  min-height: 0;
  box-sizing: border-box;
  padding: clamp(12px, 1.2vw, 20px);
  gap: var(--spacing-sm);
  background-color: var(--color-bg-container);
  overflow: hidden;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  gap: var(--spacing-sm);
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.side-panels {
  display: grid;
  grid-template-rows: minmax(140px, 170px) minmax(120px, 1fr);
  gap: var(--spacing-sm);
  min-height: 0;
  overflow: hidden;
}

:deep(.status-bar) {
  flex: 0 0 auto;
}

@media (max-width: 1200px) {
  .workbench {
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }

  .layout {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .side-panels {
    grid-template-rows: none;
    overflow: visible;
  }
}
</style>

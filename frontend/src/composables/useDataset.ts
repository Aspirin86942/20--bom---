import { reactive } from "vue";

import { fetchDataset, importDataset } from "../api/dataset";
import type { DatasetState } from "../types/dataset";


export function useDataset() {
  const state = reactive<DatasetState>({
    datasetId: "",
    rows: [],
    subtreeAggregates: {},
    errors: [],
    warnings: [],
    loading: false,
  });

  async function importFile(file: File): Promise<void> {
    state.loading = true;

    try {
      const importResult = await importDataset(file);
      state.errors = importResult.errors;
      if (importResult.status !== "success") {
        return;
      }

      const detail = await fetchDataset(importResult.dataset_id);
      state.datasetId = detail.dataset_id;
      state.rows = detail.rows as DatasetState["rows"];
      state.subtreeAggregates =
        detail.subtree_aggregates as DatasetState["subtreeAggregates"];
      state.warnings = detail.warnings as DatasetState["warnings"];
    } finally {
      state.loading = false;
    }
  }

  return { state, importFile };
}

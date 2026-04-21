import { reactive } from "vue";

import { fetchDataset, importDataset } from "../api/dataset";
import type { RequestJsonError } from "../api/http";
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
    console.log("[useDataset] 开始导入文件:", file.name, "大小:", file.size);
    state.loading = true;

    try {
      console.log("[useDataset] 调用 importDataset API...");
      const importResult = await importDataset(file);
      console.log("[useDataset] 导入结果:", importResult);

      state.errors = importResult.errors;
      if (importResult.status !== "success") {
        console.warn("[useDataset] 导入失败，状态:", importResult.status);
        state.datasetId = "";
        state.rows = [];
        state.subtreeAggregates = {};
        state.warnings = [];
        return;
      }

      console.log("[useDataset] 导入成功，dataset_id:", importResult.dataset_id);
      console.log("[useDataset] 获取数据集详情...");

      const detail = await fetchDataset(importResult.dataset_id);
      console.log("[useDataset] 数据集详情:", {
        dataset_id: detail.dataset_id,
        rows_count: detail.rows.length,
        aggregates_count: Object.keys(detail.subtree_aggregates).length,
      });

      state.datasetId = detail.dataset_id;
      state.rows = detail.rows as DatasetState["rows"];
      state.subtreeAggregates =
        detail.subtree_aggregates as DatasetState["subtreeAggregates"];
      state.warnings = detail.warnings as DatasetState["warnings"];

      console.log("[useDataset] 数据加载完成");
    } catch (error) {
      console.error("[useDataset] 导入过程出错:", error);
      const requestError = error as RequestJsonError;
      state.datasetId = "";
      state.rows = [];
      state.subtreeAggregates = {};
      state.warnings = [];
      state.errors = [
        {
          severity: "fatal",
          code: requestError.code ?? "IMPORT_REQUEST_FAILED",
          message: requestError.message ?? "导入失败，请稍后重试",
          retryable: requestError.retryable ?? false,
          action: "请检查文件内容或确认后端服务状态后重试",
        },
      ];
    } finally {
      state.loading = false;
    }
  }

  return { state, importFile };
}

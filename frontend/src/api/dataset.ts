import { requestJson } from "./http";

export type ExportMode = "current_view" | "errors";

export interface ExportQueryPayload {
  search?: string;
  materialAttr?: string;
  amountMin?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function importDataset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return requestJson<{
    dataset_id: string;
    status: string;
    summary: Record<string, number>;
    errors: Array<Record<string, unknown>>;
  }>("/api/import", {
    method: "POST",
    body: formData,
  });
}

export function fetchDataset(datasetId: string) {
  return requestJson<{
    dataset_id: string;
    rows: Array<Record<string, unknown>>;
    subtree_aggregates: Record<string, Record<string, unknown>>;
    warnings: Array<Record<string, unknown>>;
  }>(`/api/datasets/${datasetId}`);
}

export function exportDataset(
  datasetId: string,
  mode: ExportMode = "current_view",
  query: ExportQueryPayload = {},
) {
  return requestJson<{ rows: Array<Record<string, unknown>> }>(
    `/api/datasets/${datasetId}/export`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, query }),
    },
  );
}

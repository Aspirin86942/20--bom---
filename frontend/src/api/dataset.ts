import { requestJson } from "./http";


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


export function exportDataset(datasetId: string, mode = "current_view") {
  return requestJson<{ rows: Array<Record<string, unknown>> }>(
    `/api/datasets/${datasetId}/export?mode=${mode}`,
    {
      method: "POST",
    },
  );
}

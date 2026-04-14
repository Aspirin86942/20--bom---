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
    rows: unknown[];
    subtree_aggregates: Record<string, unknown>;
    warnings: unknown[];
  }>(`/api/datasets/${datasetId}`);
}

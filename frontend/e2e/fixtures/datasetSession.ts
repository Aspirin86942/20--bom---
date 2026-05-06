export type DatasetSession = {
  datasetId: string;
};

export function createDatasetSession(): DatasetSession {
  return { datasetId: "" };
}

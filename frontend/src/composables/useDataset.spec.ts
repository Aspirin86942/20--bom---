import { vi } from "vitest";

import { fetchDataset, importDataset } from "../api/dataset";
import { useDataset } from "./useDataset";

vi.mock("../api/dataset", () => ({
  importDataset: vi.fn(),
  fetchDataset: vi.fn(),
}));

const mockedImportDataset = vi.mocked(importDataset);
const mockedFetchDataset = vi.mocked(fetchDataset);

afterEach(() => {
  vi.clearAllMocks();
});

test("loads dataset after successful import", async () => {
  mockedImportDataset.mockResolvedValueOnce({
    dataset_id: "ds_001",
    status: "success",
    summary: { total_rows: 3, valid_rows: 2, warning_count: 1 },
    errors: [],
  });
  mockedFetchDataset.mockResolvedValueOnce({
    dataset_id: "ds_001",
    rows: [{ id: "row_3", code: "A" }],
    subtree_aggregates: {},
    warnings: [{ code: "AMOUNT_EMPTY" }],
  });

  const { state, importFile } = useDataset();
  const file = new File(["demo"], "bom.xlsx");

  await importFile(file);

  expect(state.datasetId).toBe("ds_001");
  expect(state.rows).toHaveLength(1);
  expect(state.warnings).toHaveLength(1);
});

test("stores user-visible error when import request fails", async () => {
  mockedImportDataset.mockRejectedValueOnce(
    new Error("Request failed: 400 - INVALID_WORKBOOK"),
  );

  const { state, importFile } = useDataset();
  const file = new File(["bad"], "bad.xlsx");

  await importFile(file);

  expect(state.loading).toBe(false);
  expect(state.datasetId).toBe("");
  expect(state.rows).toHaveLength(0);
  expect(state.errors).toHaveLength(1);
  expect(state.errors[0].code).toBe("IMPORT_REQUEST_FAILED");
});

test("keeps previous dataset context when second import request fails", async () => {
  mockedImportDataset
    .mockResolvedValueOnce({
      dataset_id: "ds_001",
      status: "success",
      summary: { total_rows: 3, valid_rows: 2, warning_count: 1 },
      errors: [],
    })
    .mockRejectedValueOnce(
      new Error("Request failed: 503 - SERVICE_UNAVAILABLE"),
    );
  mockedFetchDataset.mockResolvedValueOnce({
    dataset_id: "ds_001",
    rows: [{ id: "row_3", code: "A" }],
    subtree_aggregates: { row_3: { subtree_row_count: 1 } },
    warnings: [{ code: "AMOUNT_EMPTY" }],
  });

  const { state, importFile } = useDataset();

  await importFile(new File(["ok"], "ok.xlsx"));
  await importFile(new File(["bad"], "bad.xlsx"));

  expect(state.datasetId).toBe("ds_001");
  expect(state.rows).toEqual([{ id: "row_3", code: "A" }]);
  expect(state.subtreeAggregates).toEqual({ row_3: { subtree_row_count: 1 } });
  expect(state.warnings).toEqual([{ code: "AMOUNT_EMPTY" }]);
  expect(state.errors).toHaveLength(1);
  expect(state.errors[0].code).toBe("IMPORT_REQUEST_FAILED");
});

test("keeps previous dataset context when import response is non-success", async () => {
  mockedImportDataset
    .mockResolvedValueOnce({
      dataset_id: "ds_001",
      status: "success",
      summary: { total_rows: 3, valid_rows: 2, warning_count: 0 },
      errors: [],
    })
    .mockResolvedValueOnce({
      dataset_id: "ds_002",
      status: "error",
      summary: { total_rows: 0, valid_rows: 0, warning_count: 0 },
      errors: [{ code: "INVALID_WORKBOOK", message: "工作簿格式错误" }],
    });
  mockedFetchDataset.mockResolvedValueOnce({
    dataset_id: "ds_001",
    rows: [{ id: "row_3", code: "A" }],
    subtree_aggregates: {},
    warnings: [],
  });

  const { state, importFile } = useDataset();

  await importFile(new File(["ok"], "ok.xlsx"));
  await importFile(new File(["bad"], "bad.xlsx"));

  expect(state.datasetId).toBe("ds_001");
  expect(state.rows).toEqual([{ id: "row_3", code: "A" }]);
  expect(state.errors).toEqual([
    { code: "INVALID_WORKBOOK", message: "工作簿格式错误" },
  ]);
  expect(mockedFetchDataset).toHaveBeenCalledTimes(1);
});

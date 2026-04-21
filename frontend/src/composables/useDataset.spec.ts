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
    mockedImportDataset.mockRejectedValueOnce(new Error("Request failed: 400 - INVALID_WORKBOOK"));

    const { state, importFile } = useDataset();
    const file = new File(["bad"], "bad.xlsx");

    await importFile(file);

    expect(state.loading).toBe(false);
    expect(state.datasetId).toBe("");
    expect(state.rows).toHaveLength(0);
    expect(state.errors).toHaveLength(1);
    expect(state.errors[0].code).toBe("IMPORT_REQUEST_FAILED");
});

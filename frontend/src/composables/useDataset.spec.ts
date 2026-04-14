import { vi } from "vitest";

import { useDataset } from "./useDataset";


vi.mock("../api/dataset", () => ({
    importDataset: vi.fn().mockResolvedValue({
        dataset_id: "ds_001",
        status: "success",
        summary: { total_rows: 3, valid_rows: 2, warning_count: 1 },
        errors: [],
    }),
    fetchDataset: vi.fn().mockResolvedValue({
        dataset_id: "ds_001",
        rows: [{ id: "row_3", code: "A" }],
        subtree_aggregates: {},
        warnings: [{ code: "AMOUNT_EMPTY" }],
    }),
}));


test("loads dataset after successful import", async () => {
    const { state, importFile } = useDataset();
    const file = new File(["demo"], "bom.xlsx");

    await importFile(file);

    expect(state.datasetId).toBe("ds_001");
    expect(state.rows).toHaveLength(1);
    expect(state.warnings).toHaveLength(1);
});

import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import BomWorkbench from "./BomWorkbench.vue";


vi.mock("../api/dataset", () => ({
    importDataset: vi.fn().mockResolvedValue({
        dataset_id: "ds_001",
        status: "success",
        summary: { total_rows: 3, valid_rows: 2, warning_count: 1 },
        errors: [],
    }),
    fetchDataset: vi.fn().mockResolvedValue({
        dataset_id: "ds_001",
        rows: [
            {
                id: "row_3",
                parent_id: "root_2",
                code: "A",
                name: "主模块",
                attr: "自制",
                qty_actual: "1",
                amount: "10",
            },
        ],
        subtree_aggregates: {},
        warnings: [{ code: "AMOUNT_EMPTY", message: "金额为空" }],
    }),
    exportDataset: vi.fn().mockResolvedValue({ rows: [] }),
}));


test("loads rows and keeps warning panel visible after import", async () => {
    render(BomWorkbench);
    const input = screen.getByLabelText("上传 Excel");

    await userEvent.upload(input, new File(["demo"], "bom.xlsx"));

    expect(await screen.findByText("主模块")).toBeInTheDocument();
    expect(screen.getByText("导入提示")).toBeInTheDocument();
});

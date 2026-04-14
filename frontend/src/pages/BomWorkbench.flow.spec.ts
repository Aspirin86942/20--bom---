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
            {
                id: "row_4",
                parent_id: "row_3",
                code: "B",
                name: "子模块",
                attr: "外购",
                qty_actual: "2",
                amount: "5",
            },
        ],
        subtree_aggregates: {
            row_3: {
                subtree_row_count: 2,
                subtree_qty_sum: "3",
                subtree_amount_sum: "15",
                amount_by_attr: { 自制: "10", 外购: "5" },
            },
        },
        warnings: [{ code: "AMOUNT_EMPTY", message: "金额为空" }],
    }),
    exportDataset: vi.fn().mockResolvedValue({ rows: [] }),
}));


test("loads rows and keeps warning panel visible after import", async () => {
    render(BomWorkbench);
    const input = screen.getByLabelText("上传 Excel").querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, new File(["demo"], "bom.xlsx"));

    expect(await screen.findByText("主模块")).toBeInTheDocument();
    expect(screen.getByText("导入提示")).toBeInTheDocument();
});


test("filters rows by attr and amount from toolbar", async () => {
    render(BomWorkbench);

    const input = screen.getByLabelText("上传 Excel").querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(
        input,
        new File(["demo"], "bom.xlsx"),
    );

    await userEvent.selectOptions(screen.getByLabelText("物料属性筛选"), "外购");
    await userEvent.clear(screen.getByLabelText("金额下限"));
    await userEvent.type(screen.getByLabelText("金额下限"), "4");

    expect(await screen.findByText("子模块")).toBeInTheDocument();
    expect(screen.queryByText("主模块")).not.toBeInTheDocument();
});

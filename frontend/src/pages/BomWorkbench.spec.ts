import { render, screen } from "@testing-library/vue";

import BomWorkbench from "./BomWorkbench.vue";


test("renders upload action and analysis panel placeholder", async () => {
    render(BomWorkbench);

    expect(screen.getByRole("button", { name: /点击或拖拽 Excel 文件到此处/ })).toBeInTheDocument();
    expect(screen.getByText("分析区")).toBeInTheDocument();
});

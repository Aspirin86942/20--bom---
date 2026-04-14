import { render, screen } from "@testing-library/vue";

import BomWorkbench from "./BomWorkbench.vue";


test("renders upload action and analysis panel placeholder", async () => {
    render(BomWorkbench);

    expect(screen.getByRole("button", { name: "上传 Excel" })).toBeInTheDocument();
    expect(screen.getByText("分析区")).toBeInTheDocument();
});

import { render, screen } from "@testing-library/vue";

import BomWorkbench from "./BomWorkbench.vue";


test("renders upload action and bottom summary bar without analysis panel", async () => {
    render(BomWorkbench);

    expect(screen.getByRole("button", { name: /点击或拖拽 Excel 文件到此处/ })).toBeInTheDocument();
    expect(screen.queryByText("分析区")).not.toBeInTheDocument();
    expect(screen.getByText("当前范围汇总")).toBeInTheDocument();
    expect(screen.getByText("焦点节点汇总")).toBeInTheDocument();
    expect(screen.getByText("框选结果汇总")).toBeInTheDocument();
    expect(screen.getByText("属性分布")).toBeInTheDocument();
});

test("renders stable hooks for desktop e2e tests", () => {
    const { container } = render(BomWorkbench);

    expect(screen.getByTestId("workbench")).toBeInTheDocument();
    expect(screen.getByTestId("upload-panel")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-search")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-amount-min")).toBeInTheDocument();
    expect(screen.getByTestId("export-current-button")).toBeInTheDocument();
    expect(screen.getByTestId("bom-grid")).toBeInTheDocument();
    expect(screen.getByTestId("side-panels")).toBeInTheDocument();
    expect(screen.getByTestId("node-detail-panel")).toBeInTheDocument();
    expect(screen.getByTestId("anomaly-center")).toBeInTheDocument();
    expect(container.querySelector('[data-testid="error-drawer"]')).toBeNull();
});

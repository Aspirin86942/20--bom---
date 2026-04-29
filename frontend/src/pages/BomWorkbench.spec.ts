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

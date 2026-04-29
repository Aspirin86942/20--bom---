import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";

import BomGridStatusBar from "./BomGridStatusBar.vue";


test("renders current, focus, selection summaries and attr breakdown in the bottom bar", () => {
    render(BomGridStatusBar, {
        props: {
            currentSummary: { rowCount: 1634, qtySum: "5440.14", amountSum: "1301763.98" },
            focusSummary: { rowCount: 90, qtySum: "340.07", amountSum: "1496.20" },
            selectionSummary: { rowCount: 3, qtySum: "6.00", amountSum: "88.00" },
            amountByAttr: { 自制: "599.63", 委外: "595.41", 外购: "301.16" },
            includeCollapsedDescendants: false,
        },
    });

    expect(screen.getByText("当前范围汇总")).toBeInTheDocument();
    expect(screen.getByText("焦点节点汇总")).toBeInTheDocument();
    expect(screen.getByText("框选结果汇总")).toBeInTheDocument();
    expect(screen.getByText("属性分布")).toBeInTheDocument();
    expect(screen.getByText("自制")).toBeInTheDocument();
    expect(screen.getByText("599.63")).toBeInTheDocument();
});

test("emits include-collapsed toggle from the bottom summary bar", async () => {
    const { emitted } = render(BomGridStatusBar, {
        props: {
            currentSummary: { rowCount: 1, qtySum: "1.00", amountSum: "10.00" },
            focusSummary: { rowCount: 0, qtySum: "0.00", amountSum: "0.00" },
            selectionSummary: { rowCount: 0, qtySum: "0.00", amountSum: "0.00" },
            amountByAttr: {},
            includeCollapsedDescendants: false,
        },
    });

    await userEvent.click(screen.getByLabelText("包含折叠子项"));

    expect(emitted()["update:includeCollapsedDescendants"]?.[0]).toEqual([true]);
});

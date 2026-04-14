import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";

import AnalysisPanel from "./AnalysisPanel.vue";


test("emits include-collapsed toggle from analysis panel", async () => {
    const { emitted } = render(AnalysisPanel, {
        props: {
            currentSummary: { rowCount: 1, qtySum: "1.00", amountSum: "10.00" },
            focusSummary: { rowCount: 2, qtySum: "3.00", amountSum: "15.00" },
            selectionSummary: { rowCount: 0, qtySum: "0.00", amountSum: "0.00" },
            amountByAttr: { 自制: "10.00" },
            includeCollapsedDescendants: false,
        },
    });

    await userEvent.click(screen.getByLabelText("包含折叠子项"));

    expect(emitted()["update:includeCollapsedDescendants"]?.[0]).toEqual([true]);
});

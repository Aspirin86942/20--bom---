import { ref } from "vue";

import { useAnalysis } from "./useAnalysis";


test("summarizes visible rows and focus subtree separately", () => {
    const rows = ref([
        {
            id: "row_3",
            parent_id: "root_2",
            level: 1,
            code: "A",
            attr: "自制",
            qty_actual: "1",
            amount: "10",
        },
    ]);
    const subtreeAggregates = ref({
        row_3: {
            subtree_row_count: 2,
            subtree_qty_sum: "3",
            subtree_amount_sum: "15",
            amount_by_attr: { 自制: "10", 外购: "5" },
        },
    });
    const includeCollapsedDescendants = ref(false);

    const { currentSummary, focusSummary } = useAnalysis(
        rows,
        subtreeAggregates,
        ref(rows.value[0]),
        includeCollapsedDescendants,
    );

    expect(currentSummary.value.amountSum).toBe("10.00");
    expect(focusSummary.value.amountSum).toBe("10.00");

    includeCollapsedDescendants.value = true;

    expect(focusSummary.value.amountSum).toBe("15.00");
});

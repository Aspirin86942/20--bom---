import { ref } from "vue";

import { useFilters } from "./useFilters";


test("filters rows by search, attr and amount", () => {
    const rows = [
        { code: "A", name: "主模块", attr: "自制", level: 1, amount: "10" },
        { code: "B", name: "子模块", attr: "外购", level: 2, amount: "5" },
    ];
    const { filters, filteredRows } = useFilters(ref(rows as never[]));

    filters.search = "子模";
    filters.attrs = ["外购"];
    filters.amountMin = "4";

    expect(filteredRows.value).toHaveLength(1);
    expect(filteredRows.value[0].code).toBe("B");
});

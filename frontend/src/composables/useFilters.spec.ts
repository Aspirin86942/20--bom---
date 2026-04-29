import { ref } from "vue";

import { useFilters } from "./useFilters";


test("filters rows by search, attr and amount", () => {
    const rows = [
        { code: "A", name: "主模块", attr: "自制", level: 1, amount: "10" },
        { code: "B", name: "子模块", attr: "外购", level: 2, amount: "5" },
    ];
    const { filters, filteredRows } = useFilters(ref(rows as never[]));

    filters.search = "子模";
    filters.materialAttr = "外购";
    filters.amountMin = "4";

    expect(filteredRows.value).toHaveLength(1);
    expect(filteredRows.value[0].code).toBe("B");
});

test("keeps ancestors and descendants when search is the only active filter", () => {
    const rows = [
        {
            id: "row_1",
            parent_id: "root_2",
            code: "A",
            name: "父节点",
            attr: "自制",
            level: 1,
            amount: "10",
        },
        {
            id: "row_2",
            parent_id: "row_1",
            code: "B",
            name: "目标项目",
            attr: "外购",
            level: 2,
            amount: "5",
        },
        {
            id: "row_3",
            parent_id: "row_2",
            code: "C",
            name: "目标项目-子项",
            attr: "外购",
            level: 3,
            amount: "2",
        },
    ];
    const { filters, filteredRows } = useFilters(ref(rows as never[]));

    filters.search = "目标项目";

    expect(filteredRows.value.map((row) => row.code)).toEqual(["A", "B", "C"]);
});

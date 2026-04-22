import { ref } from "vue";

import { useFilters } from "./useFilters";

test("applies search attr and amount filters from query snapshot", () => {
  const rows = ref([
    { code: "A", name: "主件", attr: "自制", amount: "100" },
    { code: "B", name: "子件", attr: "外购", amount: "50" },
    { code: "C", name: "外购低额", attr: "外购", amount: "10" },
  ] as Array<Record<string, unknown>>);
  const {
    applyQuerySnapshot,
    buildExportQuery,
    buildQuerySnapshot,
    filteredRows,
  } = useFilters(rows);

  applyQuerySnapshot({
    search: "子",
    materialAttr: "外购",
    amountMin: "40",
  });

  const snapshot = buildQuerySnapshot();
  expect(snapshot).toEqual({
    search: "子",
    materialAttr: "外购",
    amountMin: "40",
    sortBy: "sort_index",
    sortOrder: "asc",
  });

  expect(filteredRows.value).toHaveLength(1);
  expect(filteredRows.value[0].code).toBe("B");
  expect(buildExportQuery(snapshot)).toEqual({
    search: "子",
    materialAttr: "外购",
    amountMin: "40",
    sortBy: "sort_index",
    sortOrder: "asc",
  });
});

test("ignores invalid amountMin while keeping query payload stable", () => {
  const rows = ref([
    { code: "A", name: "主件", attr: "自制", amount: "100" },
    { code: "B", name: "子件", attr: "外购", amount: "50" },
  ] as Array<Record<string, unknown>>);
  const {
    applyQuerySnapshot,
    buildExportQuery,
    buildQuerySnapshot,
    filteredRows,
  } = useFilters(rows);

  applyQuerySnapshot({
    search: "件",
    amountMin: "bad-number",
  });

  const snapshot = buildQuerySnapshot();
  expect(snapshot.amountMin).toBe("");
  expect(filteredRows.value).toHaveLength(2);
  expect(buildExportQuery(snapshot)).toEqual({
    search: "件",
    materialAttr: "",
    sortBy: "sort_index",
    sortOrder: "asc",
  });
});

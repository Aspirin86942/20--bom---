import { computed, reactive, type Ref } from "vue";


export function useFilters(rows: Ref<Array<Record<string, unknown>>>) {
  const filters = reactive({
    search: "",
    materialAttr: "", // 空字符串表示"全部"
    amountMin: "",
  });

  const filteredRows = computed(() =>
    rows.value.filter((row) => {
      const matchesSearch =
        !filters.search ||
        String(row.code).includes(filters.search) ||
        String(row.name).includes(filters.search);
      // 物料属性筛选（空字符串表示显示全部）
      const matchesAttr =
        !filters.materialAttr || String(row.attr) === filters.materialAttr;
      const matchesAmount =
        !filters.amountMin || Number(row.amount) >= Number(filters.amountMin);

      return matchesSearch && matchesAttr && matchesAmount;
    }),
  );

  return { filters, filteredRows };
}

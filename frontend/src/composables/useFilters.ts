import { computed, reactive, type Ref } from "vue";


export function useFilters(rows: Ref<Array<Record<string, unknown>>>) {
  const filters = reactive({
    search: "",
    attrs: [] as string[],
    amountMin: "",
  });

  const filteredRows = computed(() =>
    rows.value.filter((row) => {
      const matchesSearch =
        !filters.search ||
        String(row.code).includes(filters.search) ||
        String(row.name).includes(filters.search);
      const matchesAttr =
        filters.attrs.length === 0 || filters.attrs.includes(String(row.attr));
      const matchesAmount =
        !filters.amountMin || Number(row.amount) >= Number(filters.amountMin);

      return matchesSearch && matchesAttr && matchesAmount;
    }),
  );

  return { filters, filteredRows };
}

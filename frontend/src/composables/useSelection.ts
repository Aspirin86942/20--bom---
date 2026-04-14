import { computed, ref } from "vue";


export function useSelection() {
  const focusRow = ref<Record<string, unknown> | null>(null);
  const selectedRows = ref<Array<Record<string, unknown>>>([]);

  const selectionSummary = computed(() => {
    const qtySum = selectedRows.value.reduce(
      (sum, row) => sum + Number(row.qty_actual ?? 0),
      0,
    );
    const amountSum = selectedRows.value.reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );

    return {
      rowCount: selectedRows.value.length,
      qtySum: qtySum.toFixed(2),
      amountSum: amountSum.toFixed(2),
    };
  });

  return { focusRow, selectedRows, selectionSummary };
}

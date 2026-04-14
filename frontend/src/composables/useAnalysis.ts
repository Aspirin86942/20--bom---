import { computed, type Ref } from "vue";


function summarizeRows(rows: Array<Record<string, unknown>>) {
  const qtySum = rows.reduce((sum, row) => sum + Number(row.qty_actual ?? 0), 0);
  const amountSum = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return {
    rowCount: rows.length,
    qtySum: qtySum.toFixed(2),
    amountSum: amountSum.toFixed(2),
  };
}


function sliceVisibleSubtree(
  rows: Array<Record<string, unknown>>,
  focusId: string,
) {
  const startIndex = rows.findIndex((row) => String(row.id) === focusId);
  if (startIndex === -1) {
    return [];
  }

  const focusLevel = Number(rows[startIndex].level ?? 0);
  const result = [rows[startIndex]];
  for (let index = startIndex + 1; index < rows.length; index += 1) {
    const currentLevel = Number(rows[index].level ?? 0);
    if (currentLevel <= focusLevel) {
      break;
    }
    result.push(rows[index]);
  }

  return result;
}


export function useAnalysis(
  visibleRows: Ref<Array<Record<string, unknown>>>,
  subtreeAggregates: Ref<Record<string, Record<string, unknown>>>,
  focusRow: Ref<Record<string, unknown> | null>,
  includeCollapsedDescendants: Ref<boolean>,
) {
  const currentSummary = computed(() => summarizeRows(visibleRows.value));

  const focusSummary = computed(() => {
    if (!focusRow.value) {
      return currentSummary.value;
    }

    if (!includeCollapsedDescendants.value) {
      return summarizeRows(
        sliceVisibleSubtree(visibleRows.value, String(focusRow.value.id)),
      );
    }

    const aggregate = subtreeAggregates.value[String(focusRow.value.id)];
    return {
      rowCount: Number(aggregate?.subtree_row_count ?? 1),
      qtySum: Number(
        aggregate?.subtree_qty_sum ?? focusRow.value.qty_actual ?? "0",
      ).toFixed(2),
      amountSum: Number(
        aggregate?.subtree_amount_sum ?? focusRow.value.amount ?? "0",
      ).toFixed(2),
    };
  });

  return { currentSummary, focusSummary };
}

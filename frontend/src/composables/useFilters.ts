import { computed, reactive, type Ref } from "vue";

import type { ExportQueryPayload } from "../api/dataset";
import { collectSearchContextIds } from "./useBomData";
import type { WorkbenchQuerySnapshot } from "../types/dataset";

function normalizeAmountMin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? trimmed : "";
}

export function useFilters(rows: Ref<Array<Record<string, unknown>>>) {
  const filters = reactive({
    search: "",
    materialAttr: "", // 空字符串表示"全部"
    amountMin: "",
  });

  const normalizedAmountMin = computed(() =>
    normalizeAmountMin(filters.amountMin),
  );
  const parsedAmountMin = computed<number | null>(() => {
    if (!normalizedAmountMin.value) {
      return null;
    }
    return Number(normalizedAmountMin.value);
  });
  const isSearchTreeMode = computed(
    () =>
      filters.search.trim() !== "" &&
      filters.materialAttr.trim() === "" &&
      parsedAmountMin.value === null,
  );

  const filteredRows = computed(() => {
    const searchMatchedRows = rows.value.filter((row) => {
      const matchesSearch =
        !filters.search ||
        String(row.code).includes(filters.search) ||
        String(row.name).includes(filters.search);
      return matchesSearch;
    });

    // 只有纯搜索树模式才补上下文；属性/金额筛选仍保持“只看命中行”的平铺口径。
    const searchScopedRows =
      isSearchTreeMode.value &&
      searchMatchedRows.every(
        (row) => row.id !== undefined && row.parent_id !== undefined,
      )
        ? (() => {
            const contextIds = collectSearchContextIds(
              new Set(searchMatchedRows.map((row) => String(row.id))),
              rows.value as Array<{
                id: string;
                parent_id: string;
              }> & Array<Record<string, unknown>>,
            );
            return rows.value.filter((row) => contextIds.has(String(row.id)));
          })()
        : searchMatchedRows;

    return searchScopedRows.filter((row) => {
      // 物料属性筛选（空字符串表示显示全部）
      const matchesAttr =
        !filters.materialAttr || String(row.attr) === filters.materialAttr;
      const matchesAmount =
        parsedAmountMin.value === null ||
        Number(row.amount ?? 0) >= parsedAmountMin.value;

      return matchesAttr && matchesAmount;
    });
  });

  function buildQuerySnapshot(): WorkbenchQuerySnapshot {
    return {
      search: filters.search.trim(),
      materialAttr: filters.materialAttr.trim(),
      amountMin: normalizedAmountMin.value,
      sortBy: "sort_index",
      sortOrder: "asc",
    };
  }

  function applyQuerySnapshot(snapshot: Partial<WorkbenchQuerySnapshot>): void {
    if (typeof snapshot.search === "string") {
      filters.search = snapshot.search;
    }
    if (typeof snapshot.materialAttr === "string") {
      filters.materialAttr = snapshot.materialAttr;
    }
    if (typeof snapshot.amountMin === "string") {
      filters.amountMin = snapshot.amountMin;
    }
  }

  function buildExportQuery(
    snapshot: WorkbenchQuerySnapshot = buildQuerySnapshot(),
  ): ExportQueryPayload {
    const query: ExportQueryPayload = {
      search: snapshot.search,
      materialAttr: snapshot.materialAttr,
      sortBy: snapshot.sortBy,
      sortOrder: snapshot.sortOrder,
    };
    if (snapshot.amountMin) {
      query.amountMin = snapshot.amountMin;
    }
    return query;
  }

  return {
    filters,
    filteredRows,
    buildQuerySnapshot,
    applyQuerySnapshot,
    buildExportQuery,
  };
}

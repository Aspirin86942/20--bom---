export type BomGridDisplayMode = "tree" | "flat";

type GridDisplayFilters = {
  materialAttr: string;
  amountMin: string;
};

export function resolveBomGridDisplayMode(
  filters: GridDisplayFilters,
): BomGridDisplayMode {
  if (filters.materialAttr.trim() || filters.amountMin.trim()) {
    return "flat";
  }

  return "tree";
}

export function shouldAutoExpandFilteredRows(
  displayMode: BomGridDisplayMode,
  search: string,
): boolean {
  return displayMode === "tree" && search.trim() !== "";
}

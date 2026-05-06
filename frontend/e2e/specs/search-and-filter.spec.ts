import { test, expect } from "../fixtures/bomTest";

function parseAmount(value: unknown): number {
  const normalized = String(value ?? "")
    .replaceAll(",", "")
    .trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`无法解析 amount 数值: ${String(value)}`);
  }
  return parsed;
}

function exportRowAmount(row: Record<string, unknown>): number {
  return parseAmount(row["金额"]);
}

test.describe("搜索和筛选回归", () => {
  test("@regression 搜索电阻后当前业务行数减少且大于 0", async ({
    bomWorkbench,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    const totalRows = await bomWorkbench.currentRowCount();
    await bomWorkbench.search("电阻");

    await expect
      .poll(() => bomWorkbench.currentRowCount(), { timeout: 10000 })
      .toBeLessThan(totalRows);
    expect(await bomWorkbench.currentRowCount()).toBeGreaterThan(0);
  });

  test("@regression 搜索命中节点时保留父级和子级上下文", async ({
    bomWorkbench,
    page,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.search("B.WW.T0019AA");

    await expect
      .poll(() => bomWorkbench.currentRowCount(), { timeout: 10000 })
      .toBeGreaterThan(2);
    await expect(page.getByText("C.T.D0005AA")).toBeVisible();
    await expect(page.getByText("B.WW.T0019AA")).toBeVisible();
    await expect(page.getByText("B.P.C0001AA")).toBeVisible();
  });

  test("@regression 物料属性和金额下限可以组合筛选", async ({
    bomWorkbench,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.filterMaterialAttr("外购");
    const attrFilteredRows = await bomWorkbench.currentRowCount();
    const attrFilteredExportRows = await bomWorkbench.exportCurrentView({
      materialAttr: "外购",
      sortBy: "sort_index",
      sortOrder: "asc",
    });
    const attrAmounts = attrFilteredExportRows
      .map((row) => exportRowAmount(row))
      .sort((left, right) => left - right);
    const amountThreshold = [...new Set(attrAmounts)].find((candidate) => {
      const filteredCount = attrFilteredExportRows.filter(
        (row) => exportRowAmount(row) >= candidate,
      ).length;
      return filteredCount > 0 && filteredCount < attrFilteredRows;
    });

    expect(amountThreshold).toBeDefined();
    const expectedCombinedRows = attrFilteredExportRows.filter(
      (row) => exportRowAmount(row) >= Number(amountThreshold),
    );

    expect(expectedCombinedRows.length).toBeGreaterThan(0);
    expect(expectedCombinedRows.length).toBeLessThan(attrFilteredRows);

    await bomWorkbench.setAmountMin(String(amountThreshold));

    await expect
      .poll(() => bomWorkbench.currentRowCount(), { timeout: 10000 })
      .toBeLessThan(attrFilteredRows);

    const combinedRowCount = await bomWorkbench.currentRowCount();
    expect(combinedRowCount).toBeGreaterThan(0);

    const combinedExportRows = await bomWorkbench.exportCurrentView({
      materialAttr: "外购",
      amountMin: String(amountThreshold),
      sortBy: "sort_index",
      sortOrder: "asc",
    });
    expect(combinedExportRows).toHaveLength(combinedRowCount);
    for (const row of combinedExportRows) {
      expect(exportRowAmount(row)).toBeGreaterThanOrEqual(Number(amountThreshold));
    }
  });
});

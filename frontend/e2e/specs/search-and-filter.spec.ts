import { test, expect } from "../fixtures/bomTest";

test.describe("搜索和筛选回归", () => {
  test("@regression 搜索电阻后当前业务行数减少且大于 0", async ({
    bomWorkbench,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    const totalRows = await bomWorkbench.currentRowCount();
    await bomWorkbench.search("电阻");

    await expect.poll(() => bomWorkbench.currentRowCount()).toBeLessThan(totalRows);
    expect(await bomWorkbench.currentRowCount()).toBeGreaterThan(0);
  });

  test("@regression 搜索命中节点时保留父级和子级上下文", async ({
    bomWorkbench,
    page,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.search("B.WW.T0019AA");

    await expect.poll(() => bomWorkbench.currentRowCount()).toBeGreaterThan(2);
    await expect(page.getByText("C.T.D0005AA")).toBeVisible();
    await expect(page.getByText("B.WW.T0019AA")).toBeVisible();
    await expect(page.getByText("B.P.C0001AA")).toBeVisible();
  });

  test("@regression 物料属性和金额下限可以组合筛选", async ({
    bomWorkbench,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    const totalRows = await bomWorkbench.currentRowCount();
    await bomWorkbench.filterMaterialAttr("外购");
    await bomWorkbench.setAmountMin("1");

    await expect
      .poll(() => bomWorkbench.currentRowCount())
      .toBeLessThanOrEqual(totalRows);
    expect(await bomWorkbench.currentRowCount()).toBeGreaterThan(0);
  });
});

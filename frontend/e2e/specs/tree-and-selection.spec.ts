import { test, expect } from "../fixtures/bomTest";

test.describe("树操作和焦点分析", () => {
  test("@regression 全部折叠和全部展开会改变可滚动树范围", async ({
    bomWorkbench,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.collapseAll();
    const collapsedHeight = await bomWorkbench.gridScrollHeight();

    await bomWorkbench.expandAll();
    await expect
      .poll(() => bomWorkbench.gridScrollHeight())
      .toBeGreaterThan(collapsedHeight);

    const expandedHeight = await bomWorkbench.gridScrollHeight();

    await bomWorkbench.collapseAll();
    await expect
      .poll(() => bomWorkbench.gridScrollHeight())
      .toBeLessThan(expandedHeight);
  });

  test("@regression 点击首行后焦点汇总和属性分布更新", async ({
    bomWorkbench,
    page,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await expect(page.getByTestId("status-focus-row-count")).toHaveText("0");
    await bomWorkbench.focusFirstRow();
    await expect(page.getByTestId("status-focus-row-count")).not.toHaveText("0");
    await expect(page.getByTestId("status-attr-entry").first()).toBeVisible();
  });
});

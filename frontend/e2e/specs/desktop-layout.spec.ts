import { test, expect } from "../fixtures/bomTest";

test.describe("桌面布局完整性", () => {
  test("@layout 1600x900 下计算区和分析区完整可见", async ({
    bomWorkbench,
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.expectCalculationAreaComplete();
    await bomWorkbench.expectAnalysisAreaAccessible();
    await bomWorkbench.expectDesktopLayoutNotClipped();

    await expect(page.getByTestId("status-current-row-count")).not.toHaveText("0");
  });

  test("@layout 1600x900 聚焦节点后分析区和属性分布仍完整可见", async ({
    bomWorkbench,
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.focusFirstRow();

    await expect(page.getByTestId("status-focus-row-count")).not.toHaveText("0");
    await expect(page.getByTestId("status-attr-entry").first()).toBeVisible();
    await bomWorkbench.expectCalculationAreaComplete();
    await bomWorkbench.expectAnalysisAreaAccessible();
  });

  test("@layout 1366x768 下计算区和分析区可访问且不被静默裁切", async ({
    bomWorkbench,
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.expectCalculationAreaComplete();
    await bomWorkbench.expectAnalysisAreaAccessible();
    await bomWorkbench.expectDesktopLayoutNotClipped();
  });
});

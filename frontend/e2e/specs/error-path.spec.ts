import { test, expect } from "../fixtures/bomTest";

test.describe("导入异常路径", () => {
  test("@error 非 .xlsx 文件由前端拦截且不发起导入请求", async ({
    bomWorkbench,
    page,
  }) => {
    let importRequestCount = 0;
    await page.route("**/api/import", async (route) => {
      importRequestCount += 1;
      await route.continue();
    });

    await bomWorkbench.open();
    await bomWorkbench.importClientRejectedFile();

    await expect(page.getByText("仅支持 .xlsx 格式的 Excel 文件")).toBeVisible();
    expect(importRequestCount).toBe(0);
  });

  test("@error 损坏的 .xlsx 显示 INVALID_WORKBOOK", async ({
    bomWorkbench,
    page,
  }) => {
    await bomWorkbench.open();
    await bomWorkbench.importBrokenWorkbook();

    await expect(page.getByTestId("error-drawer")).toBeVisible();
    await expect(page.getByText("INVALID_WORKBOOK")).toBeVisible();
    await expect(
      page.getByText("上传文件无效或已损坏，请重新导出后再试"),
    ).toBeVisible();
  });

  test("@error 后端 500 时保留已有数据上下文", async ({ bomWorkbench, page }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.search("B.WW.T0019AA");
    await expect
      .poll(() => bomWorkbench.currentRowCount(), { timeout: 10000 })
      .toBeGreaterThan(2);

    const rowCountBeforeFailure = await bomWorkbench.currentRowCount();
    const searchInput = page.getByTestId("toolbar-search");

    await expect(searchInput).toHaveValue("B.WW.T0019AA");
    await expect(page.getByText("C.T.D0005AA")).toBeVisible();
    await expect(page.getByText("B.WW.T0019AA")).toBeVisible();
    await expect(page.getByText("B.P.C0001AA")).toBeVisible();

    await page.route("**/api/import", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          detail: {
            code: "IMPORT_REQUEST_FAILED",
            message: "模拟导入失败",
            retryable: true,
          },
        }),
      });
    });

    await bomWorkbench.importValidWorkbookExpectingFailure();

    await expect(page.getByTestId("error-drawer")).toBeVisible();
    await expect(page.getByText("模拟导入失败")).toBeVisible();
    await expect(searchInput).toHaveValue("B.WW.T0019AA");
    await expect
      .poll(() => bomWorkbench.currentRowCount(), { timeout: 10000 })
      .toBe(rowCountBeforeFailure);
    await expect(page.getByText("C.T.D0005AA")).toBeVisible();
    await expect(page.getByText("B.WW.T0019AA")).toBeVisible();
    await expect(page.getByText("B.P.C0001AA")).toBeVisible();
  });
});

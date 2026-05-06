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

    const rowCountBeforeFailure = await bomWorkbench.currentRowCount();

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
    await expect.poll(() => bomWorkbench.currentRowCount()).toBe(rowCountBeforeFailure);
  });
});

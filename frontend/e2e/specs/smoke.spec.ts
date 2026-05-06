import { test, expect } from "../fixtures/bomTest";

test("@smoke 上传真实 Excel 后工作台可用", async ({
  bomWorkbench,
  page,
}) => {
  await bomWorkbench.open();
  await bomWorkbench.importValidWorkbook();
  await bomWorkbench.expectSummaryReady();
  await expect(page.getByTestId("status-current-row-count")).not.toHaveText("0");
  await expect(page.getByTestId("bom-grid")).toBeVisible();
});

import { test, expect } from "../fixtures/bomTest";

test.describe("导出口径", () => {
  test("@api 当前视图导出返回关键业务字段", async ({ bomWorkbench }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    const rows = await bomWorkbench.exportCurrentView({
      search: "",
      materialAttr: "",
      sortBy: "sort_index",
      sortOrder: "asc",
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({
      物料编码: expect.anything(),
      物料名称: expect.anything(),
      物料属性: expect.anything(),
      金额: expect.anything(),
    });
  });

  test("@api 搜索后的导出结果不超过当前视图业务行数", async ({ bomWorkbench }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    await bomWorkbench.search("电阻");
    await expect
      .poll(() => bomWorkbench.currentRowCount(), { timeout: 10000 })
      .toBeGreaterThan(0);

    const currentRows = await bomWorkbench.currentRowCount();
    const rows = await bomWorkbench.exportCurrentView({
      search: "电阻",
      materialAttr: "",
      sortBy: "sort_index",
      sortOrder: "asc",
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(currentRows);
  });

  test("@api 错误导出模式返回 rows 数组", async ({ bomWorkbench }) => {
    await bomWorkbench.open();
    await bomWorkbench.importValidWorkbook();

    const rows = await bomWorkbench.exportErrors();

    expect(Array.isArray(rows)).toBe(true);
  });
});

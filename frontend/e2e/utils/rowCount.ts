import type { Page } from "@playwright/test";

export async function readCurrentViewRowCount(page: Page): Promise<number> {
  const statusText = await page.getByTestId("status-current-row-count").innerText();
  const matched = statusText.match(/\d+/);
  if (!matched) {
    throw new Error(`无法从状态栏解析当前视图行数: ${statusText}`);
  }
  return Number(matched[0]);
}

export async function readGridBodyScrollHeight(page: Page): Promise<number> {
  return page
    .locator(".vxe-table--main-wrapper .vxe-table--body-inner-wrapper")
    .evaluate((node) => {
      if (!(node instanceof HTMLElement)) {
        throw new Error("表格滚动容器不存在");
      }
      return node.scrollHeight;
    });
}

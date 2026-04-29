import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testFile = path.join(__dirname, '../../BOM成本查询_2026041415170958.xlsx');

async function readCurrentViewRowCount(page: Page): Promise<number> {
  const statusText = await page.getByTestId('status-current-row-count').innerText();
  const matched = statusText.match(/\d+/);
  if (!matched) {
    throw new Error(`无法从状态栏解析当前视图行数: ${statusText}`);
  }
  return Number(matched[0]);
}

async function readGridBodyScrollHeight(page: Page): Promise<number> {
  return page
    .locator('.vxe-table--main-wrapper .vxe-table--body-inner-wrapper')
    .evaluate((node) => {
      if (!(node instanceof HTMLElement)) {
        throw new Error('表格滚动容器不存在');
      }
      return node.scrollHeight;
    });
}

async function readWorkbenchMetrics(page: Page): Promise<{
  sideClientHeight: number;
  sideScrollHeight: number;
  analysisPanelExists: boolean;
  anomalyClientHeight: number;
  anomalyScrollHeight: number;
  anomalyOverflowY: string;
  nodeDetailClientHeight: number;
  statusBarHeight: number;
  uploadPanelHeight: number;
  errorDrawerHeight: number;
}> {
  return page.evaluate(() => {
    const sidePanels = document.querySelector('.side-panels');
    const anomalyCenter = document.querySelector('.anomaly-center');
    const nodeDetailPanel = document.querySelector('.node-detail-panel');
    const statusBar = document.querySelector('.status-bar');
    const uploadPanel = document.querySelector('.upload-panel');
    const errorDrawer = document.querySelector('.error-drawer');

    if (!(sidePanels instanceof HTMLElement)) {
      throw new Error('side-panels 容器不存在');
    }
    if (!(anomalyCenter instanceof HTMLElement)) {
      throw new Error('anomaly-center 容器不存在');
    }
    if (!(nodeDetailPanel instanceof HTMLElement)) {
      throw new Error('node-detail-panel 容器不存在');
    }
    if (!(statusBar instanceof HTMLElement)) {
      throw new Error('status-bar 容器不存在');
    }
    if (!(uploadPanel instanceof HTMLElement)) {
      throw new Error('upload-panel 容器不存在');
    }
    if (!(errorDrawer instanceof HTMLElement)) {
      throw new Error('error-drawer 容器不存在');
    }

    return {
      sideClientHeight: sidePanels.clientHeight,
      sideScrollHeight: sidePanels.scrollHeight,
      analysisPanelExists: Boolean(document.querySelector('.analysis-panel')),
      anomalyClientHeight: anomalyCenter.clientHeight,
      anomalyScrollHeight: anomalyCenter.scrollHeight,
      anomalyOverflowY: getComputedStyle(anomalyCenter).overflowY,
      nodeDetailClientHeight: nodeDetailPanel.clientHeight,
      statusBarHeight: statusBar.getBoundingClientRect().height,
      uploadPanelHeight: uploadPanel.getBoundingClientRect().height,
      errorDrawerHeight: errorDrawer.getBoundingClientRect().height,
    };
  });
}

test.describe('BOM 上传和筛选功能', () => {
  test('应该能够上传 Excel 文件并显示数据', async ({ page }) => {
    await page.goto('/');

    // 等待上传面板出现
    await expect(page.locator('.upload-panel')).toBeVisible();

    // 上传测试文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // 等待数据加载完成（等待表格出现）
    await page.waitForSelector('.vxe-table', { timeout: 10000 });

    // 验证表格已渲染
    await expect(page.locator('.vxe-table')).toBeVisible();

    // 验证至少有一些行数据
    const rows = page.locator('.vxe-body--row');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });

    console.log('✓ 文件上传成功，表格已显示');
  });

  test('应该能够使用物料属性筛选器', async ({ page }) => {
    await page.goto('/');

    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // 等待表格加载
    await expect(page.locator('.vxe-table')).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => page.locator('.vxe-body--row').count(), { timeout: 10000 })
      .toBeGreaterThan(0);

    // 记录初始行数
    const initialRows = await page.locator('.vxe-body--row').count();
    console.log(`初始行数: ${initialRows}`);

    // 点击"外购"筛选
    await page.getByRole('button', { name: '外购' }).click();
    await page.waitForTimeout(2000); // 等待筛选和展开完成

    // 验证筛选后的行数变化
    const filteredRows = await page.locator('.vxe-body--row').count();
    console.log(`筛选后行数: ${filteredRows}`);
    expect(filteredRows).toBeGreaterThan(0);

    // 验证筛选器按钮状态
    const activeButton = page.getByRole('button', { name: '外购' });
    await expect(activeButton).toHaveClass(/active/);

    console.log('✓ 物料属性筛选器工作正常');
  });

  test('应该能够使用搜索功能', async ({ page }) => {
    await page.goto('/');

    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // 等待表格加载
    await expect(page.locator('.vxe-table')).toBeVisible({ timeout: 10000 });
    await expect.poll(() => readCurrentViewRowCount(page), { timeout: 10000 }).toBeGreaterThan(0);

    // 记录过滤前的业务行数，避免把虚拟滚动 DOM 数量误当成总数。
    const totalRows = await readCurrentViewRowCount(page);
    console.log(`全部展开后总行数: ${totalRows}`);

    // 输入搜索关键词
    const searchInput = page.locator('input[aria-label="搜索编码/名称"]');
    await searchInput.fill('电阻');
    await expect
      .poll(() => readCurrentViewRowCount(page), { timeout: 10000 })
      .toBeLessThan(totalRows);

    // 验证搜索后的业务行数变化
    const searchedRows = await readCurrentViewRowCount(page);
    console.log(`搜索后行数: ${searchedRows}`);

    // 搜索应该过滤掉不匹配的行，所以搜索后行数应该少于总行数
    expect(searchedRows).toBeGreaterThan(0);
    expect(searchedRows).toBeLessThan(totalRows);

    console.log('✓ 搜索功能工作正常');
  });

  test('搜索命中节点时应保留父级和子级上下文', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    await expect(page.locator('.vxe-table')).toBeVisible({ timeout: 10000 });
    await expect.poll(() => readCurrentViewRowCount(page), { timeout: 10000 }).toBeGreaterThan(0);

    const searchInput = page.locator('input[aria-label="搜索编码/名称"]');
    await searchInput.fill('B.WW.T0019AA');

    await expect
      .poll(() => readCurrentViewRowCount(page), { timeout: 10000 })
      .toBeGreaterThan(2);
    await expect(page.getByText('C.T.D0005AA')).toBeVisible();
    await expect(page.getByText('B.WW.T0019AA')).toBeVisible();
    await expect(page.getByText('B.P.C0001AA')).toBeVisible();
  });

  test('应该能够展开和折叠所有节点', async ({ page }) => {
    await page.goto('/');

    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // 等待数据真正导入完成，避免在空表上触发展开/折叠。
    await expect(page.locator('.vxe-table')).toBeVisible({ timeout: 10000 });
    await expect.poll(() => readCurrentViewRowCount(page), { timeout: 10000 }).toBeGreaterThan(0);

    // 点击"全部折叠"
    await page.getByRole('button', { name: '全部折叠' }).click();
    const collapsedHeight = await readGridBodyScrollHeight(page);
    console.log(`折叠后滚动高度: ${collapsedHeight}`);

    // 点击"全部展开"
    await page.getByRole('button', { name: '全部展开' }).click();
    await expect
      .poll(() => readGridBodyScrollHeight(page), { timeout: 10000 })
      .toBeGreaterThan(collapsedHeight);
    const expandedHeight = await readGridBodyScrollHeight(page);
    console.log(`展开后滚动高度: ${expandedHeight}`);

    // 再次折叠，确认能回到更小的可见树范围。
    await page.getByRole('button', { name: '全部折叠' }).click();
    await expect
      .poll(() => readGridBodyScrollHeight(page), { timeout: 10000 })
      .toBeLessThan(expandedHeight);

    console.log('✓ 展开/折叠功能工作正常');
  });

  test('导入后底部汇总栏承接分析信息且右侧不再遮挡', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/');

    await page.locator('input[type="file"]').setInputFiles(testFile);

    await expect(page.locator('.vxe-table')).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => page.locator('.vxe-body--row').count(), { timeout: 15000 })
      .toBeGreaterThan(0);
    await page.waitForTimeout(4000);

    const metricsBeforeFocus = await readWorkbenchMetrics(page);

    expect(metricsBeforeFocus.uploadPanelHeight).toBeLessThanOrEqual(56);
    expect(metricsBeforeFocus.errorDrawerHeight).toBeLessThanOrEqual(64);
    expect(metricsBeforeFocus.analysisPanelExists).toBe(false);
    expect(metricsBeforeFocus.statusBarHeight).toBeLessThanOrEqual(220);
    expect(metricsBeforeFocus.anomalyClientHeight).toBeGreaterThanOrEqual(120);
    expect(
      metricsBeforeFocus.sideScrollHeight - metricsBeforeFocus.sideClientHeight,
    ).toBeLessThanOrEqual(1);
    expect(metricsBeforeFocus.anomalyOverflowY).toBe('auto');
    expect(metricsBeforeFocus.anomalyScrollHeight).toBeGreaterThan(
      metricsBeforeFocus.anomalyClientHeight,
    );

    await expect(page.getByTestId('status-current-summary')).toContainText('当前范围汇总');
    await expect(page.getByTestId('status-focus-summary')).toContainText('焦点节点汇总');
    await expect(page.getByTestId('status-selection-summary')).toContainText('框选结果汇总');
    await expect(page.getByTestId('status-attr-breakdown')).toContainText('属性分布');
    await expect(page.getByTestId('status-current-row-count')).not.toHaveText('0');
    await expect(page.getByTestId('status-focus-row-count')).toHaveText('0');
    await expect(page.getByTestId('status-selection-row-count')).toHaveText('0');
    await expect(page.getByTestId('status-attr-breakdown')).toContainText(
      '聚焦节点后显示属性金额分布',
    );

    await page.locator('.vxe-body--row').first().click();
    await page.waitForTimeout(500);

    const metricsAfterFocus = await readWorkbenchMetrics(page);
    expect(metricsAfterFocus.nodeDetailClientHeight).toBeGreaterThanOrEqual(140);
    expect(metricsAfterFocus.anomalyClientHeight).toBeGreaterThanOrEqual(96);
    expect(
      metricsAfterFocus.sideScrollHeight - metricsAfterFocus.sideClientHeight,
    ).toBeLessThanOrEqual(1);
    await expect(page.getByTestId('status-focus-row-count')).not.toHaveText('0');
    await expect(page.locator('[data-testid="status-attr-entry"]').first()).toBeVisible();
  });
});
